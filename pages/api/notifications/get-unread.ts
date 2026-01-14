import type { NextApiRequest, NextApiResponse } from 'next';
import { firebaseAdmin } from '@/lib/firebase-admin';
import { getFirestoreClient } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs
} from 'firebase/firestore';
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
    const admin = firebaseAdmin;

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(authToken);
    } catch (error) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const userId = decodedToken.uid;

    // Parse query parameters
    const { limit = '50', includeRead = 'false' } = req.query;
    const limitNum = parseInt(limit as string, 10);
    const includeReadBool = includeRead === 'true';

    // Query notifications
    const db = getFirestoreClient();
    const notificationsRef = collection(db, 'notifications');

    let q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitNum)
    );

    // Filter by read status if needed
    if (!includeReadBool) {
      q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limitNum)
      );
    }

    const snapshot = await getDocs(q);

    const notifications: Notification[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification));

    // Get unread count
    const unreadQuery = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const unreadSnapshot = await getDocs(unreadQuery);
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
