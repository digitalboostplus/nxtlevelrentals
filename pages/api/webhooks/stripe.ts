import type { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import { stripe, toDollars } from '@/lib/stripe-server';
import { adminDb } from '@/lib/firebase-admin';
import Stripe from 'stripe';

// CRITICAL: Disable Next.js body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ message: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    const buf = await buffer(req);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return res.status(500).json({ message: 'Webhook secret not configured' });
    }

    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ message: 'Webhook handler failed' });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const { tenantId, propertyId, paymentId, description } = session.metadata || {};

  if (!tenantId || !propertyId) {
    console.error('Missing metadata in checkout session');
    return;
  }

  const paymentIntentId = session.payment_intent as string;

  // Check for idempotency - prevent duplicate processing
  const existingPayment = await adminDb
    .collection('payments')
    .where('stripePaymentIntentId', '==', paymentIntentId)
    .limit(1)
    .get();

  if (!existingPayment.empty && existingPayment.docs[0].data().status === 'paid') {
    console.log('Payment already processed, skipping...');
    return;
  }

  // Retrieve payment intent to get payment method details
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['payment_method'],
  });

  const paymentMethod = paymentIntent.payment_method as Stripe.PaymentMethod;

  const amount = toDollars(session.amount_total || 0);
  const now = new Date().toISOString();

  // Determine payment method type
  let paymentMethodType: string = paymentMethod?.type || 'card';
  const charge = (paymentIntent as any).charges?.data?.[0];

  if (charge?.payment_method_details?.card?.wallet?.type === 'apple_pay') {
    paymentMethodType = 'apple_pay';
  } else if (charge?.payment_method_details?.card?.wallet?.type === 'google_pay') {
    paymentMethodType = 'google_pay';
  } else if (paymentMethod?.type === 'us_bank_account') {
    paymentMethodType = 'ach';
  }

  // Get last 4 digits
  const lastFourDigits =
    paymentMethod?.card?.last4 || paymentMethod?.us_bank_account?.last4 || '';

  const receiptUrl = charge?.receipt_url || '';

  // Update or create payment record
  if (paymentId) {
    await adminDb
      .collection('payments')
      .doc(paymentId)
      .update({
        status: 'paid',
        paidDate: now,
        stripePaymentIntentId: paymentIntentId,
        stripeCheckoutSessionId: session.id,
        paymentMethod: paymentMethodType,
        receiptUrl,
        stripeReceiptUrl: receiptUrl,
        lastFourDigits,
        updatedAt: now,
      });
  } else {
    // Create new payment record
    await adminDb.collection('payments').add({
      tenantId,
      propertyId,
      amount,
      dueDate: now,
      paidDate: now,
      status: 'paid',
      description: description || 'Rent Payment',
      stripePaymentIntentId: paymentIntentId,
      stripeCheckoutSessionId: session.id,
      paymentMethod: paymentMethodType,
      receiptUrl,
      stripeReceiptUrl: receiptUrl,
      lastFourDigits,
      createdAt: now,
    });
  }

  // Create ledger entry
  await adminDb.collection('ledger').add({
    tenantId,
    propertyId,
    amount,
    type: 'payment',
    category: 'rent',
    date: now,
    status: 'completed',
    description: description || 'Rent Payment',
    stripePaymentIntentId: paymentIntentId,
    paymentMethod: paymentMethodType,
    receiptUrl,
    createdAt: now,
  });

  console.log(`Payment successful for tenant ${tenantId}: $${amount}`);
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Already handled in checkout.session.completed
  console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { tenantId, propertyId, paymentId } = paymentIntent.metadata || {};

  if (!paymentId) {
    console.log('No paymentId in failed payment intent, skipping update');
    return;
  }

  await adminDb
    .collection('payments')
    .doc(paymentId)
    .update({
      status: 'failed',
      stripePaymentIntentId: paymentIntent.id,
      updatedAt: new Date().toISOString(),
    });

  // Create failed ledger entry
  if (tenantId && propertyId) {
    await adminDb.collection('ledger').add({
      tenantId,
      propertyId,
      amount: toDollars(paymentIntent.amount),
      type: 'payment',
      category: 'rent',
      date: new Date().toISOString(),
      status: 'failed',
      description: 'Failed Payment',
      stripePaymentIntentId: paymentIntent.id,
      createdAt: new Date().toISOString(),
    });
  }

  console.error(`Payment failed for tenant ${tenantId}`);
}

async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  const customerId = paymentMethod.customer as string;
  if (!customerId) return;

  // Get tenant ID from Stripe customer
  const customer = await stripe.customers.retrieve(customerId);
  if (!customer || customer.deleted) return;

  const tenantId = customer.metadata?.tenantId;
  if (!tenantId) return;

  // Save payment method to Firestore
  const paymentMethodData: any = {
    tenantId,
    stripePaymentMethodId: paymentMethod.id,
    type: paymentMethod.type,
    isDefault: false,
    createdAt: new Date().toISOString(),
  };

  if (paymentMethod.type === 'card' && paymentMethod.card) {
    paymentMethodData.lastFour = paymentMethod.card.last4;
    paymentMethodData.brand = paymentMethod.card.brand;
    paymentMethodData.expiryMonth = paymentMethod.card.exp_month;
    paymentMethodData.expiryYear = paymentMethod.card.exp_year;
  } else if (paymentMethod.type === 'us_bank_account' && paymentMethod.us_bank_account) {
    paymentMethodData.lastFour = paymentMethod.us_bank_account.last4;
    paymentMethodData.bankName = paymentMethod.us_bank_account.bank_name;
    paymentMethodData.accountType = paymentMethod.us_bank_account.account_type;
  }

  await adminDb.collection('savedPaymentMethods').add(paymentMethodData);
  console.log(`Payment method saved for tenant ${tenantId}`);
}
