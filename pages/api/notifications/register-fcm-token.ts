import type { NextApiRequest, NextApiResponse } from 'next';
import { firebaseAdmin } from '@/lib/firebase-admin';
import { getFirestoreClient } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface RegisterTokenRequest {
  token: string;
  deviceInfo?: string;
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
    const { token, deviceInfo } = req.body as RegisterTokenRequest;

    if (!token) {
      return res.status(400).json({ message: 'FCM token is required' });
    }

    // Store FCM token in Firestore
    const db = getFirestoreClient();
    const tokenRef = doc(db, 'fcmTokens', userId);

    await setDoc(tokenRef, {
      token,
      deviceInfo: deviceInfo || 'web',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log(`FCM token registered for user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'FCM token registered successfully'
    });
  } catch (error: any) {
    console.error('Error registering FCM token:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}
