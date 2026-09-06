import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { DEFAULT_PREFERENCES, validatePreferenceUpdates } from '@/lib/notificationPreferences';
import type { NotificationPreferences } from '@/types/notifications';

async function readPreferences(userId: string): Promise<NotificationPreferences> {
  const saved = (await adminDb.doc(`notificationPreferences/${userId}`).get()).data() || {};
  return { ...saved, userId, email: { ...DEFAULT_PREFERENCES.email, ...saved.email }, push: { ...DEFAULT_PREFERENCES.push, ...saved.push }, inApp: { ...DEFAULT_PREFERENCES.inApp, ...saved.inApp } } as NotificationPreferences;
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
    let updates: Partial<NotificationPreferences>;
    try { updates = validatePreferenceUpdates(req.body) as Partial<NotificationPreferences>; }
    catch { return res.status(400).json({ message: 'Unsupported preference or non-boolean value' }); }

    if (!updates.email && !updates.push && !updates.inApp) {
      return res.status(400).json({
        message: 'At least one preference category (email, push, or inApp) must be provided',
      });
    }

    const updatedPreferences = await adminDb.runTransaction(async tx => {
      const ref = adminDb.doc(`notificationPreferences/${userId}`);
      const current = (await tx.get(ref)).data() || {};
      const updated = { userId, createdAt: current.createdAt || FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        email: { ...DEFAULT_PREFERENCES.email, ...current.email, ...updates.email },
        push: { ...DEFAULT_PREFERENCES.push, ...current.push, ...updates.push },
        inApp: { ...DEFAULT_PREFERENCES.inApp, ...current.inApp, ...updates.inApp } };
      tx.set(ref, updated);
      return updated;
    });

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
