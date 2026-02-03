import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'landlord' | 'tenant' | 'super-admin';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    phoneNumber?: string;
    photoURL?: string;
    stripeCustomerId?: string; // For tenants
    propertyIds?: string[]; // Properties tenant lives in or landlord owns
    unit?: string; // For tenants
    onboardingCompleted?: boolean;
    createdAt: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}

export type PropertyStatus = 'occupied' | 'vacant' | 'maintenance';

export interface Property {
    id: string;
    landlordId: string;
    name: string; // e.g., "Apt 4B" or "123 Main St"
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country?: string;
    };
    description?: string;
    defaultRentAmount: number;
    currency: string;
    status: PropertyStatus;
    images?: string[];
    features?: string[];
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface Lease {
    id: string; // Document ID
    propertyId: string;
    tenantId: string;
    landlordId: string;
    startDate: Timestamp | Date;
    endDate: Timestamp | Date;
    monthlyRent: number;
    currency: string;
    securityDeposit: number;
    paymentDueDay: number; // Day of month (1-31)
    isActive: boolean;
    status: 'active' | 'ended' | 'terminated' | 'pending';
    documents?: string[]; // URLs to signed lease PDFs
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'paid' | 'overdue' | 'cancelled';
export type PaymentType = 'rent' | 'deposit' | 'fee' | 'other';

export interface Payment {
    id: string;
    leaseId: string;
    tenantId: string;
    landlordId: string;
    propertyId: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    type: PaymentType;
    dueDate: Timestamp | Date;
    paidAt?: Timestamp | Date;
    description?: string;
    paymentMethodId?: string; // ID from savedPaymentMethods
    stripePaymentIntentId?: string;
    stripeInvoiceId?: string;
    metadata?: Record<string, any>;
    createdAt: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}

export interface MaintenanceRequest {
    id: string;
    tenantId: string;
    propertyId: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'submitted' | 'in_progress' | 'completed' | 'cancelled';
    category?: string;
    adminNotes?: string;
    attachments?: string[];
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface LandlordExpense {
    id: string;
    landlordId: string;
    propertyId: string;
    expenseType: 'maintenance' | 'repair' | 'utility' | 'insurance' | 'tax' | 'capital_improvement' | 'other';
    category: string;
    amount: number;
    vendor: string;
    date: Timestamp | Date;
    status: 'pending' | 'approved' | 'paid' | 'reimbursed' | 'rejected';
    receiptUrls?: string[];
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface Payout {
    id: string;
    landlordId: string;
    amount: number;
    netAmount: number;
    status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
    scheduledDate: Timestamp | Date;
    processedDate?: Timestamp | Date;
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface SavedPaymentMethod {
    id: string;
    tenantId: string;
    type: 'card' | 'bank_account';
    last4: string;
    brand: string; // e.g., 'visa', 'mastercard', 'chase'
    expiryMonth?: number; // for cards
    expiryYear?: number; // for cards
    isDefault: boolean;
    stripePaymentMethodId?: string;
    createdAt: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}
