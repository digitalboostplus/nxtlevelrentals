import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { DEFAULT_PREFERENCES } from '@/lib/notifications';
import type { NotificationPreferences } from '@/types/notifications';

// Read notification preferences via the Admin SDK, seeding defaults if absent.
async function readPreferences(userId: string): Promise<NotificationPreferences> {
  const ref = adminDb.collection('notificationPreferences').doc(userId);
  const snap = await ref.get();
  if (snap.exists) {
    return snap.data() as NotificationPreferences;
  }

  const defaults: NotificationPreferences = {
    userId,
    ...DEFAULT_PREFERENCES,
    createdAt: FieldValue.serverTimestamp() as any,
    updatedAt: FieldValue.serverTimestamp() as any,
  };
  await ref.set(defaults);
  return defaults;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    } catch (error) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const userId = decodedToken.uid;

    // Handle GET request - retrieve preferences
    if (req.method === 'GET') {
      const preferences = await readPreferences(userId);
      return res.status(200).json({ success: true, preferences });
    }

    // Handle PUT request - update preferences
    const updates = req.body as Partial<NotificationPreferences>;

    if (!updates.email && !updates.push && !updates.inApp) {
      return res.status(400).json({
        message: 'At least one preference category (email, push, or inApp) must be provided',
      });
    }

    const currentPreferences = await readPreferences(userId);

    const updatedPreferences: NotificationPreferences = {
      ...currentPreferences,
      ...(updates.email && { email: { ...currentPreferences.email, ...updates.email } }),
      ...(updates.push && { push: { ...currentPreferences.push, ...updates.push } }),
      ...(updates.inApp && { inApp: { ...currentPreferences.inApp, ...updates.inApp } }),
      updatedAt: FieldValue.serverTimestamp() as any,
    };

    await adminDb
      .collection('notificationPreferences')
      .doc(userId)
      .set(updatedPreferences, { merge: true });

    return res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: updatedPreferences,
    });
  } catch (error: any) {
    console.error('Error managing notification preferences:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
