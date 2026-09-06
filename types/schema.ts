import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'landlord' | 'tenant' | 'super-admin';

export interface EmergencyContact {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
}

export interface VehicleInfo {
    make: string;
    model: string;
    year?: string | number;
    color?: string;
    licensePlate: string;
    state?: string;
    permitNumber?: string;
}

export interface PetInfo {
    name: string;
    type: 'dog' | 'cat' | 'bird' | 'fish' | 'other' | string;
    breed?: string;
    weight?: string | number;
}

export interface RentersInsuranceInfo {
    fileIds?: string[];
    provider: string;
    policyNumber: string;
    effectiveDate?: string;
    expirationDate: string;
    documentUrl?: string;
    status?: 'active' | 'pending' | 'expired' | string;
    verified?: boolean;
}

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
    landlordId?: string; // Reference to landlords/{id} for landlord users
    emergencyContact?: EmergencyContact;
    vehicles?: VehicleInfo[];
    pets?: PetInfo[];
    rentersInsurance?: RentersInsuranceInfo;
    onboardingCompleted?: boolean;
    createdAt: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}

export type PropertyStatus = 'occupied' | 'vacant' | 'maintenance';

export interface PropertyUnit {
    archived?: boolean;
    id: string;
    propertyId: string;
    unitNumber: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    rent: number;
    status: PropertyStatus;
    currentTenantId?: string;
    currentTenantName?: string;
    currentLeaseId?: string;
    features?: string[];
}

export interface Property {
    archived?: boolean;
    id: string;
    landlordId?: string;
    landlordName?: string;
    name: string; // e.g., "Parkview Apartments" or "123 Main St"
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country?: string;
    } | string;
    description?: string;
    defaultRentAmount?: number;
    rent?: number; // Aliased for compatibility with flat properties
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    currency?: string;
    status: PropertyStatus;
    available?: boolean;
    images?: string[];
    features?: string[];
    amenities?: string[];
    units?: PropertyUnit[];
    totalUnits?: number;
    managementStatus?: 'active' | 'inactive' | 'pending';
    source?: string;
    ghlObjectId?: string;
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface Lease {
    fileIds?: string[];
    id: string; // Document ID
    propertyId: string;
    unitId?: string | null;
    propertyName?: string;
    unit?: string;
    tenantId: string;
    tenantName?: string;
    landlordId: string;
    startDate: Timestamp | Date | string;
    endDate: Timestamp | Date | string;
    monthlyRent: number;
    rentAmount?: number;
    currency?: string;
    securityDeposit: number;
    depositAmount?: number;
    paymentDueDay: number; // Day of month (1-31)
    lateFeeGraceDays?: number;
    lateFeeAmount?: number;
    lateFeeConfig?: {
      gracePeriodDays?: number;
      feeType?: 'flat' | 'percentage';
      feeAmount?: number;
    };
    isActive: boolean;
    status: 'active' | 'ended' | 'terminated' | 'pending';
    documents?: string[]; // URLs to signed lease PDFs
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'paid' | 'overdue' | 'cancelled';
export type PaymentType = 'rent' | 'deposit' | 'fee' | 'utility' | 'other';

export interface Payment {
    id: string;
    leaseId?: string;
    tenantId: string;
    landlordId?: string;
    propertyId: string;
    amount: number;
    currency?: string;
    status: PaymentStatus;
    type?: PaymentType;
    dueDate: Timestamp | Date;
    paidAt?: Timestamp | Date;
    description?: string;
    paymentMethod?: 'card' | 'bank_account' | 'cash' | 'check' | 'ach';
    paymentMethodId?: string;
    stripePaymentIntentId?: string;
    stripeInvoiceId?: string;
    receiptUrl?: string;
    metadata?: Record<string, any>;
    createdAt: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}

export interface LedgerEntry {
    id?: string;
    leaseId?: string;
    unitId?: string | null;
    dueDate?: Timestamp | Date | string;
    billingPeriod?: string;
    tenantId: string;
    propertyId: string;
    unit?: string;
    landlordId?: string;
    includeInPayout?: boolean;
    amount: number; // Positive for charges, negative or marked for payments/credits
    type: 'charge' | 'payment' | 'adjustment' | 'credit';
    category: 'rent' | 'utility' | 'late_fee' | 'deposit' | 'maintenance' | 'other';
    date: Timestamp | Date | string;
    status: 'pending' | 'completed' | 'failed' | 'overdue';
    description: string;
    paymentMethod?: 'card' | 'ach' | 'cash' | 'check';
    manualEntry?: boolean;
    recordedBy?: string;
    receiptUrl?: string;
    checkNumber?: string;
    createdAt: Timestamp | Date | string;
}

export interface MaintenanceRequest {
    fileIds?: string[];
    id: string;
    tenantId: string;
    tenantName?: string;
    tenantPhone?: string;
    propertyId: string;
    propertyName?: string;
    unit?: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'submitted' | 'in_progress' | 'completed' | 'cancelled';
    category?: string;
    adminNotes?: string;
    attachments?: string[];
    permissionToEnter?: boolean;
    petsOnPremises?: boolean;
    hasPets?: boolean;
    images?: string[];
    preferredTime?: 'morning' | 'afternoon' | 'any';
    assignedVendorName?: string;
    assignedVendorPhone?: string;
    scheduledTime?: string;
    timeZone?: string;
    scheduledDate?: Timestamp | Date | string;
    estimatedCost?: number;
    actualCost?: number;
    invoiceUrl?: string;
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    propertyId?: string; // Optional: specific to one property, or all if omitted
    propertyName?: string;
    priority: 'normal' | 'important' | 'urgent';
    authorName: string;
    createdAt: Timestamp | Date | string;
    expiresAt?: Timestamp | Date | string;
}

export interface LandlordExpense {
    fileIds?: string[];
    id: string;
    landlordId: string;
    propertyId: string;
    propertyName?: string;
    unit?: string;
    expenseType: 'maintenance' | 'repair' | 'utility' | 'insurance' | 'tax' | 'capital_improvement' | 'management_fee' | 'other';
    category: string;
    amount: number;
    vendor: string;
    vendorContact?: string;
    description: string;
    date: Timestamp | Date | string;
    status: 'pending' | 'approved' | 'paid' | 'reimbursed' | 'rejected';
    receiptUrls?: string[];
    invoiceNumber?: string;
    taxDeductible?: boolean;
    payoutId?: string;
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface Payout {
    id: string;
    landlordId: string;
    payoutPeriodStart?: Timestamp | Date | string;
    payoutPeriodEnd?: Timestamp | Date | string;
    amount: number;
    netAmount: number;
    rentCollected?: number;
    managementFees?: number;
    maintenanceExpenses?: number;
    otherExpenses?: number;
    payoutMethod?: 'ach' | 'wire' | 'check' | 'stripe';
    status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
    scheduledDate: Timestamp | Date | string;
    processedDate?: Timestamp | Date | string;
    transactionId?: string;
    notes?: string;
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
