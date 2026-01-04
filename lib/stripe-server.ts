import Stripe from 'stripe';
import { adminDb } from './firebase-admin';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not defined in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia' as any,
  typescript: true,
});

/**
 * Get or create a Stripe customer for a tenant
 * Creates customer if doesn't exist and stores mapping in Firestore
 */
export async function getOrCreateStripeCustomer(
  tenantId: string,
  email: string,
  displayName: string
): Promise<string> {
  // Check if customer already exists in Firestore
  const customerDoc = await adminDb.collection('stripeCustomers').doc(tenantId).get();

  if (customerDoc.exists) {
    return customerDoc.data()!.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: displayName,
    metadata: {
      tenantId,
    },
  });

  // Save mapping to Firestore
  await adminDb.collection('stripeCustomers').doc(tenantId).set({
    tenantId,
    stripeCustomerId: customer.id,
    email,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return customer.id;
}

/**
 * Convert dollar amount to cents for Stripe
 */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollar amount
 */
export function toDollars(cents: number): number {
  return cents / 100;
}
