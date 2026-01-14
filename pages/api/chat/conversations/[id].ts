import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { ChatConversation, ChatMessage, ConversationDetailResponse } from '@/types/chat';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConversationDetailResponse | { message: string }>
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

    // Get conversation ID from query
    const { id: conversationId } = req.query;

    if (!conversationId || typeof conversationId !== 'string') {
      return res.status(400).json({ message: 'Conversation ID is required' });
    }

    // Get user role
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const userRole = userData?.role;

    // Fetch conversation
    const conversationRef = adminDb.collection('chatConversations').doc(conversationId);
    const conversationDoc = await conversationRef.get();

    if (!conversationDoc.exists) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const conversationData = conversationDoc.data();
    const conversation: ChatConversation = {
      id: conversationDoc.id,
      ...conversationData
    } as ChatConversation;

    // Check access rights
    const isOwner = conversationData?.userId === userId;
    const isAdmin = userRole === 'admin' || userRole === 'super-admin';
    const isEscalated = conversationData?.status === 'escalated';

    // Allow access if: owner, or admin viewing escalated conversation
    if (!isOwner && !(isAdmin && isEscalated)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Fetch messages
    const messagesSnap = await conversationRef
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    const messages = messagesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatMessage[];

    return res.status(200).json({
      conversation,
      messages
    });
  } catch (error: any) {
    console.error('Error fetching conversation:', error);

    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
