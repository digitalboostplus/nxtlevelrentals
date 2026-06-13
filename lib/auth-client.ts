import { getFirebaseAuth } from './firebase';

/**
 * Get the current user's Firebase ID token for authenticated API calls.
 */
export async function getAuthToken(): Promise<string> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Not authenticated');
  }

  return await user.getIdToken();
}
