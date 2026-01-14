import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  SYSTEM_PROMPTS,
  formatChatHistory,
  buildFunctionDeclarations,
  generateChatResponse,
  generateFunctionResultResponse
} from '@/lib/gemini';
import { buildTenantContext, buildAdminContext, formatContextForPrompt } from '@/lib/chat-context';
import { executeChatFunction } from '@/lib/chat-functions';
import type { ChatMessage, ChatConversation, SendMessageRequest, SendMessageResponse } from '@/types/chat';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendMessageResponse | { message: string }>
) {
  if (req.method !== 'POST') {
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
    const userRole = userData?.role as 'tenant' | 'admin' | 'super-admin';

    if (!userRole) {
      return res.status(403).json({ message: 'User role not found' });
    }

    // Parse request
    const { message, conversationId } = req.body as SendMessageRequest;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Rate limiting check (simple in-memory for now - could use Redis in production)
    // For now, we'll skip rate limiting implementation

    // Get or create conversation
    let conversation: ChatConversation;
    let conversationRef;
    let existingMessages: ChatMessage[] = [];

    if (conversationId) {
      // Load existing conversation
      conversationRef = adminDb.collection('chatConversations').doc(conversationId);
      const conversationDoc = await conversationRef.get();

      if (!conversationDoc.exists) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      const convData = conversationDoc.data();

      // Verify ownership
      if (convData?.userId !== userId) {
        return res.status(403).json({ message: 'Access denied to this conversation' });
      }

      conversation = {
        id: conversationDoc.id,
        ...convData
      } as ChatConversation;

      // Load conversation history (last 20 messages for context)
      const messagesSnap = await conversationRef
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .limitToLast(20)
        .get();

      existingMessages = messagesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
    } else {
      // Create new conversation
      conversationRef = adminDb.collection('chatConversations').doc();
      conversation = {
        id: conversationRef.id,
        userId,
        userRole,
        status: 'active',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        messageCount: 0
      };

      await conversationRef.set(conversation);
    }

    // Save user message
    const userMessageRef = conversationRef.collection('messages').doc();
    const userMessage: ChatMessage = {
      id: userMessageRef.id,
      role: 'user',
      content: message,
      timestamp: FieldValue.serverTimestamp()
    };

    await userMessageRef.set(userMessage);

    // Build context based on role
    let context;
    if (userRole === 'tenant') {
      context = await buildTenantContext(userId);
    } else {
      context = await buildAdminContext();
    }

    const contextString = formatContextForPrompt(context, userRole);

    // Get system prompt for role
    const systemPrompt = SYSTEM_PROMPTS[userRole] || SYSTEM_PROMPTS.tenant;

    // Format chat history for Gemini
    const history = formatChatHistory(
      existingMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }))
    );

    // Get function declarations
    const functions = buildFunctionDeclarations(userRole);

    // Generate AI response
    const aiResponse = await generateChatResponse(
      systemPrompt,
      contextString,
      history,
      message,
      functions
    );

    let assistantContent = aiResponse.text;
    let actionTaken: string | undefined;
    let functionResult: any;

    // Handle function call if present
    if (aiResponse.functionCall) {
      const { name, args } = aiResponse.functionCall;

      // Add conversationId to args for escalation
      const argsWithConversation = {
        ...args,
        conversationId: conversationRef.id
      };

      // Execute the function
      functionResult = await executeChatFunction(
        name,
        argsWithConversation,
        userId,
        userRole
      );

      actionTaken = name;

      // Generate natural language response based on function result
      if (functionResult.success) {
        assistantContent = functionResult.message || await generateFunctionResultResponse(
          systemPrompt,
          contextString,
          history,
          name,
          JSON.stringify(functionResult.data)
        );
      } else {
        assistantContent = functionResult.message ||
          `I encountered an issue: ${functionResult.error}. Please try again or contact support.`;
      }
    }

    // Save assistant message
    const assistantMessageRef = conversationRef.collection('messages').doc();
    const assistantMessage: ChatMessage = {
      id: assistantMessageRef.id,
      role: 'assistant',
      content: assistantContent,
      timestamp: FieldValue.serverTimestamp(),
      metadata: aiResponse.functionCall ? {
        functionCalled: aiResponse.functionCall.name,
        functionResult: functionResult?.success ? 'success' : 'error',
        actionTaken
      } : undefined
    };

    await assistantMessageRef.set(assistantMessage);

    // Update conversation
    await conversationRef.update({
      updatedAt: FieldValue.serverTimestamp(),
      messageCount: FieldValue.increment(2) // User + assistant messages
    });

    // Return response
    return res.status(200).json({
      conversationId: conversationRef.id,
      message: assistantMessage,
      actionTaken
    });
  } catch (error: any) {
    console.error('Chat API error:', error);

    // Handle specific errors
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    return res.status(500).json({
      message: error.message || 'An error occurred processing your message'
    });
  }
}
