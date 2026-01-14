import type { NextApiRequest, NextApiResponse } from 'next';
import { firebaseAdmin } from '@/lib/firebase-admin';
import { markNotificationAsRead, markNotificationsAsRead } from '@/lib/notifications';
import { getFirestoreClient } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface MarkReadRequest {
  notificationId?: string;
  notificationIds?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
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

    // Parse request body
    const { notificationId, notificationIds } = req.body as MarkReadRequest;

    if (!notificationId && (!notificationIds || notificationIds.length === 0)) {
      return res.status(400).json({
        message: 'Either notificationId or notificationIds array must be provided'
      });
    }

    const db = getFirestoreClient();

    // Verify user owns the notification(s) before marking as read
    const idsToMark = notificationId ? [notificationId] : notificationIds!;

    for (const id of idsToMark) {
      const notificationDoc = await getDoc(doc(db, 'notifications', id));

      if (!notificationDoc.exists()) {
        return res.status(404).json({
          message: `Notification ${id} not found`
        });
      }

      const notificationData = notificationDoc.data();
      if (notificationData.userId !== userId) {
        return res.status(403).json({
          message: `Forbidden: You don't have permission to modify notification ${id}`
        });
      }
    }

    // Mark notification(s) as read
    let successCount: number;

    if (notificationId) {
      const success = await markNotificationAsRead(notificationId);
      successCount = success ? 1 : 0;
    } else {
      successCount = await markNotificationsAsRead(notificationIds!);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully marked ${successCount} notification(s) as read`,
      markedCount: successCount
    });
  } catch (error: any) {
    console.error('Error marking notifications as read:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}
