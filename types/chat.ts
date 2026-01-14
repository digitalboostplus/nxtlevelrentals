// Chat Types for Gemini AI Integration

export type UserRole = 'tenant' | 'admin' | 'super-admin';
export type MessageRole = 'user' | 'assistant' | 'system';
export type ConversationStatus = 'active' | 'escalated' | 'closed';

export interface ChatMessage {
  id?: string;
  role: MessageRole;
  content: string;
  timestamp: any; // Firestore timestamp
  metadata?: {
    intent?: string;
    entities?: Record<string, unknown>;
    actionTaken?: string;
    dataAccessed?: string[];
    functionCalled?: string;
    functionResult?: unknown;
  };
}

export interface ChatConversation {
  id?: string;
  userId: string;
  userRole: UserRole;
  status: ConversationStatus;
  createdAt: any;
  updatedAt: any;
  escalatedTo?: string; // Admin UID if escalated
  escalationReason?: string;
  summary?: string; // AI-generated conversation summary
  messageCount?: number;
}

// Context provided to AI based on user role
export interface TenantChatContext {
  profile: {
    displayName: string;
    unit?: string;
    address?: string;
    city?: string;
    state?: string;
    monthlyRent?: number;
  };
  balance: {
    currentDue: number;
    lastPaymentDate?: string;
    lastPaymentAmount?: number;
  };
  lease: {
    startDate?: string;
    endDate?: string;
    status: 'Active' | 'Expiring' | 'Expired' | 'Unknown';
  };
  maintenance: {
    openRequests: number;
    recentRequests: {
      id: string;
      title: string;
      status: string;
      priority: string;
      createdAt: string;
    }[];
  };
  recentPayments: {
    date: string;
    amount: number;
    status: string;
    method?: string;
  }[];
  paymentPlan?: {
    totalAmount: number;
    remainingAmount: number;
    nextDueDate: string;
    nextDueAmount: number;
  };
}

export interface AdminChatContext {
  portfolio: {
    totalProperties: number;
    activeTenants: number;
    collectionRate: number;
    overdueAmount: number;
    totalExpectedRent: number;
    totalCollected: number;
  };
  rentStatus: {
    paid: number;
    pending: number;
    overdue: number;
    partial: number;
  };
  maintenance: {
    pendingCount: number;
    inProgressCount: number;
    urgentCount: number;
    recentRequests: {
      id: string;
      title: string;
      tenantName: string;
      status: string;
      priority: string;
      propertyAddress: string;
    }[];
  };
}

// Chat API Request/Response types
export interface SendMessageRequest {
  message: string;
  conversationId?: string;
}

export interface SendMessageResponse {
  conversationId: string;
  message: ChatMessage;
  actionTaken?: string;
}

export interface ConversationListResponse {
  conversations: ChatConversation[];
}

export interface ConversationDetailResponse {
  conversation: ChatConversation;
  messages: ChatMessage[];
}

// Function calling types
export interface ChatFunction {
  name: string;
  description: string;
  parameters?: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface FunctionCallResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string; // User-friendly message
}

// Escalation types
export interface EscalationRequest {
  conversationId: string;
  reason: string;
}

export interface EscalatedConversation extends ChatConversation {
  tenantName: string;
  tenantEmail: string;
  propertyAddress?: string;
  lastMessage: string;
}
