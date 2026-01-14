import { loadStripe, Stripe } from '@stripe/stripe-js';
import { getFirebaseAuth } from './firebase';

let stripePromise: Promise<Stripe | null>;

/**
 * Get Stripe.js instance (lazy-loaded)
 */
export const getStripe = () => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

/**
 * Get Firebase auth token for API calls
 */
export async function getAuthToken(): Promise<string> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Not authenticated');
  }

  return await user.getIdToken();
}
