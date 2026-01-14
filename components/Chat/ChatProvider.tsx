import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatContextType {
  messages: ChatMessage[];
  isOpen: boolean;
  isMinimized: boolean;
  isLoading: boolean;
  conversationId: string | null;
  openChat: () => void;
  closeChat: () => void;
  minimizeChat: () => void;
  maximizeChat: () => void;
  toggleChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Reset chat when user changes
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setConversationId(null);
      setIsOpen(false);
    }
  }, [user]);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const minimizeChat = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const maximizeChat = useCallback(() => {
    setIsMinimized(false);
  }, []);

  const toggleChat = useCallback(() => {
    if (isOpen && !isMinimized) {
      closeChat();
    } else if (isOpen && isMinimized) {
      maximizeChat();
    } else {
      openChat();
    }
  }, [isOpen, isMinimized, openChat, closeChat, maximizeChat]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !content.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);

    // Add loading placeholder for AI response
    const loadingId = `loading-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    }]);

    setIsLoading(true);

    try {
      // Get auth token
      const token = await user.getIdToken();

      // Send message to API
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: content.trim(),
          conversationId,
          history: messages.filter(m => !m.isLoading).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Replace loading message with actual response
      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? {
              id: `assistant-${Date.now()}`,
              role: 'assistant' as const,
              content: data.message,
              timestamp: new Date(),
              isLoading: false
            }
          : msg
      ));

      // Update conversation ID if new conversation was created
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Replace loading message with error
      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? {
              id: `error-${Date.now()}`,
              role: 'assistant' as const,
              content: 'Sorry, I encountered an error. Please try again.',
              timestamp: new Date(),
              isLoading: false
            }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [user, conversationId, messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  const value: ChatContextType = {
    messages,
    isOpen,
    isMinimized,
    isLoading,
    conversationId,
    openChat,
    closeChat,
    minimizeChat,
    maximizeChat,
    toggleChat,
    sendMessage,
    clearMessages
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}
