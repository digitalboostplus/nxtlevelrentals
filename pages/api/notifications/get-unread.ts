import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { Notification } from '@/types/notifications';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const authToken = authHeader.split('Bearer ')[1];

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authToken);
    } catch (error) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const userId = decodedToken.uid;

    // Parse query parameters
    const { limit = '50', includeRead = 'false' } = req.query;
    const limitNum = Number(limit);
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ message: 'Limit must be an integer from 1 to 100' });
    }
    const includeReadBool = includeRead === 'true';
    const notificationsRef = adminDb.collection('notifications').where('userId', '==', userId);
    const filtered = includeReadBool ? notificationsRef : notificationsRef.where('read', '==', false);
    const snapshot = await filtered.orderBy('createdAt', 'desc').limit(limitNum).get();

    const notifications: Notification[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification));

    // Get unread count
    const unreadSnapshot = await notificationsRef.where('read', '==', false).get();
    const unreadCount = unreadSnapshot.size;

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
      total: notifications.length
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}
