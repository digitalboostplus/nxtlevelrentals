import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { stripe, getOrCreateStripeCustomer, toCents } from '@/lib/stripe-server';

type CreateCheckoutRequest = {
  amount: number;
  description: string;
  propertyId: string;
  paymentId?: string;
  savePaymentMethod?: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const tenantId = decodedToken.uid;

    // Get user profile
    const userDoc = await adminDb.collection('users').doc(tenantId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = userDoc.data()!;

    // Validate request body
    const { amount, description, propertyId, paymentId, savePaymentMethod } =
      req.body as CreateCheckoutRequest;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    if (!propertyId) {
      return res.status(400).json({ message: 'Property ID is required' });
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      tenantId,
      userData.email,
      userData.displayName || userData.fullName || 'Tenant'
    );

    // Create Checkout Session
    const sessionConfig: any = {
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card', 'us_bank_account'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: toCents(amount),
            product_data: {
              name: description,
              description: `Property: ${propertyId}`,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          tenantId,
          propertyId,
          paymentId: paymentId || '',
          description,
        },
      },
      metadata: {
        tenantId,
        propertyId,
        paymentId: paymentId || '',
        description,
      },
      success_url: `${req.headers.origin}/portal?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/portal?payment=cancelled`,
    };

    // If saving payment method, set setup_future_usage
    if (savePaymentMethod) {
      sessionConfig.payment_intent_data.setup_future_usage = 'off_session';
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Update payment record with checkout session ID if paymentId provided
    if (paymentId) {
      await adminDb
        .collection('payments')
        .doc(paymentId)
        .update({
          stripeCheckoutSessionId: session.id,
          status: 'processing',
          updatedAt: new Date().toISOString(),
        });
    }

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
