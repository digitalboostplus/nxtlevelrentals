import type { NextApiRequest, NextApiResponse } from 'next';
import { firebaseAdmin } from '@/lib/firebase-admin';
import { getNotificationPreferences } from '@/lib/notifications';
import type { NotificationPreferences } from '@/types/notifications';
import { getFirestoreClient } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const authToken = authHeader.split('Bearer ')[1];
    const admin = firebaseAdmin;

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(authToken);
    } catch (error) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const userId = decodedToken.uid;

    // Handle GET request - retrieve preferences
    if (req.method === 'GET') {
      const preferences = await getNotificationPreferences(userId);

      return res.status(200).json({
        success: true,
        preferences
      });
    }

    // Handle PUT request - update preferences
    if (req.method === 'PUT') {
      const updates = req.body as Partial<NotificationPreferences>;

      // Validate updates structure
      if (!updates.email && !updates.push && !updates.inApp) {
        return res.status(400).json({
          message: 'At least one preference category (email, push, or inApp) must be provided'
        });
      }

      // Get current preferences
      const currentPreferences = await getNotificationPreferences(userId);

      // Merge updates with current preferences
      const updatedPreferences: NotificationPreferences = {
        ...currentPreferences,
        ...(updates.email && { email: { ...currentPreferences.email, ...updates.email } }),
        ...(updates.push && { push: { ...currentPreferences.push, ...updates.push } }),
        ...(updates.inApp && { inApp: { ...currentPreferences.inApp, ...updates.inApp } }),
        updatedAt: serverTimestamp()
      };

      // Save to Firestore
      const db = getFirestoreClient();
      const prefsRef = doc(db, 'notificationPreferences', userId);

      await setDoc(prefsRef, updatedPreferences);

      console.log(`Notification preferences updated for user ${userId}`);

      return res.status(200).json({
        success: true,
        message: 'Preferences updated successfully',
        preferences: updatedPreferences
      });
    }
  } catch (error: any) {
    console.error('Error managing notification preferences:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}
