import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { ChatConversation, ConversationListResponse } from '@/types/chat';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConversationListResponse | { message: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get user role
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const userRole = userData?.role;

    // Query conversations based on role
    let conversationsQuery;

    if (userRole === 'admin' || userRole === 'super-admin') {
      // Admins can see their own conversations + escalated ones
      const ownConversations = adminDb
        .collection('chatConversations')
        .where('userId', '==', userId)
        .orderBy('updatedAt', 'desc')
        .limit(20);

      const escalatedConversations = adminDb
        .collection('chatConversations')
        .where('status', '==', 'escalated')
        .orderBy('updatedAt', 'desc')
        .limit(20);

      const [ownSnap, escalatedSnap] = await Promise.all([
        ownConversations.get(),
        escalatedConversations.get()
      ]);

      // Combine and dedupe
      const conversationMap = new Map();

      ownSnap.docs.forEach(doc => {
        conversationMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      escalatedSnap.docs.forEach(doc => {
        if (!conversationMap.has(doc.id)) {
          conversationMap.set(doc.id, { id: doc.id, ...doc.data(), isEscalated: true });
        }
      });

      const conversations = Array.from(conversationMap.values()) as ChatConversation[];

      // Sort by updatedAt
      conversations.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis?.() || 0;
        const bTime = b.updatedAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      return res.status(200).json({ conversations: conversations.slice(0, 30) });
    } else {
      // Regular users only see their own conversations
      conversationsQuery = adminDb
        .collection('chatConversations')
        .where('userId', '==', userId)
        .orderBy('updatedAt', 'desc')
        .limit(20);

      const conversationsSnap = await conversationsQuery.get();

      const conversations = conversationsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatConversation[];

      return res.status(200).json({ conversations });
    }
  } catch (error: any) {
    console.error('Error fetching conversations:', error);

    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
