export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'partial';

export interface PropertyRentStatus {
    propertyId: string;
    propertyName: string;
    propertyAddress: string;
    tenantId: string;
    tenantName: string;
    monthlyRent: number;
    dueDate: Date;
    status: PaymentStatus;
    amountPaid: number;
    amountDue: number;
    lastPaymentDate?: Date;
    paymentMethod?: string;
}

export interface MonthlyPaymentSummary {
    month: string; // 'YYYY-MM'
    totalProperties: number;
    paidCount: number;
    pendingCount: number;
    overdueCount: number;
    partialCount: number;
    totalCollected: number;
    totalExpected: number;
    collectionRate: number; // percentage
}

export interface RentPaymentFilters {
    status: 'all' | PaymentStatus;
    searchQuery: string;
    sortBy: 'property' | 'tenant' | 'amount' | 'dueDate' | 'status';
    sortOrder: 'asc' | 'desc';
}
