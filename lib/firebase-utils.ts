import {
  getFirebaseAuth,
  getFirestoreClient,
  getStorageClient,
  getMessagingClient,
  getAnalyticsClient
} from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import {
  getToken,
  onMessage
} from 'firebase/messaging';
import {
  logEvent
} from 'firebase/analytics';

// Types
export interface UserRole {
  role: 'tenant' | 'admin' | 'super-admin' | 'landlord';
  displayName?: string;
  email?: string;
  propertyIds?: string[];
  managedProperties?: string[];
  landlordId?: string; // Reference to landlords/{id} for landlord users
}

export interface MaintenanceRequest {
  id?: string;
  tenantId: string;
  propertyId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'submitted' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: any;
  updatedAt: any;
  attachments?: string[];
  adminNotes?: string;
}

export interface Property {
  id?: string;
  name: string;
  address: string;
  description: string;
  images: string[];
  amenities: string[];
  rent: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  available: boolean;
  landlordId?: string; // Reference to property owner
  landlordName?: string; // Denormalized for display
  managementStartDate?: any; // Timestamp
  managementEndDate?: any; // Timestamp
  managementStatus?: 'active' | 'inactive' | 'pending';
  createdAt: any;
  updatedAt: any;
}

export interface Payment {
  id?: string;
  tenantId: string;
  propertyId: string;
  amount: number;
  dueDate: any;
  paidDate?: any;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'processing' | 'failed';
  description: string;
  createdAt: any;
  // Stripe-specific fields
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  paymentMethod?: 'card' | 'ach' | 'apple_pay' | 'google_pay' | 'cash' | 'check';
  receiptUrl?: string;
  stripeReceiptUrl?: string;
  lastFourDigits?: string;
  checkNumber?: string | null;
}

export interface LedgerEntry {
  id?: string;
  tenantId: string;
  propertyId: string;
  landlordId?: string; // Reference to property owner (for payouts)
  includeInPayout?: boolean; // Whether this entry affects landlord payout
  payoutId?: string; // Reference to payout this was included in
  amount: number; // Positive for charges, negative (or just marked as payment) for payments.
  // Convention: Charge is positive, Payment is negative? Or use 'type'.
  type: 'charge' | 'payment' | 'adjustment';
  category: 'rent' | 'utility' | 'late_fee' | 'deposit' | 'other';
  date: any;
  status: 'pending' | 'completed' | 'failed' | 'overdue';
  description: string;
  createdAt: any;
  // Stripe-specific fields
  stripePaymentIntentId?: string;
  paymentMethod?: 'card' | 'ach' | 'apple_pay' | 'google_pay' | 'cash' | 'check';
  receiptUrl?: string;
  manualEntry?: boolean;
  recordedBy?: string; // Admin UID who recorded manual payment
  checkNumber?: string;
}

export interface PaymentPlan {
  id?: string;
  tenantId: string;
  propertyId: string;
  totalAmount: number;
  remainingAmount: number;
  startDate: any;
  endDate: any;
  installments: {
    dueDate: any;
    amount: number;
    status: 'pending' | 'paid' | 'overdue';
  }[];
  status: 'active' | 'completed' | 'broken';
  notes?: string;
  createdAt: any;
}

export interface LeaseDocument {
  id?: string;
  tenantId: string;
  propertyId: string;
  documentUrl: string;
  documentType: 'lease' | 'addendum' | 'notice' | 'other';
  fileName: string;
  createdAt: any;
}

export interface SavedPaymentMethod {
  id?: string;
  tenantId: string;
  stripePaymentMethodId: string;
  type: 'card' | 'us_bank_account';
  lastFour: string;
  brand?: string; // e.g., 'visa', 'mastercard'
  expiryMonth?: number;
  expiryYear?: number;
  bankName?: string; // For ACH
  accountType?: 'checking' | 'savings'; // For ACH
  isDefault: boolean;
  createdAt: any;
}

export interface StripeCustomer {
  tenantId: string; // Also use as document ID for easy lookup
  stripeCustomerId: string; // cus_...
  email: string;
  createdAt: any;
  updatedAt: any;
}

// Landlord Types
export interface Landlord {
  id?: string;
  userId: string;
  businessType: 'individual' | 'llc' | 'corporation' | 'partnership';
  businessName?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  mailingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  taxInformation: {
    taxIdType: 'ein' | 'ssn';
    taxId: string; // Encrypted in production
    w9Status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
    w9DocumentId?: string;
    w9SubmittedDate?: any; // Timestamp
    w9ApprovedDate?: any; // Timestamp
  };
  bankingInformation: {
    accountHolderName: string;
    routingNumber: string; // Encrypted in production
    accountNumber: string; // Encrypted in production
    accountType: 'checking' | 'savings';
    bankName?: string;
    verified: boolean;
    verifiedDate?: any; // Timestamp
    stripeConnectAccountId?: string;
  };
  payoutPreferences: {
    frequency: 'monthly' | 'bi-weekly' | 'weekly' | 'on-collection';
    dayOfMonth?: number;
    minimumBalance: number;
    method: 'ach' | 'wire' | 'check' | 'stripe';
    autoPayoutEnabled: boolean;
  };
  insuranceInformation?: {
    provider: string;
    policyNumber: string;
    expirationDate: any; // Timestamp
    coverageAmount: number;
    certificateDocumentId?: string;
    additionalInsured: boolean;
  };
  propertyIds: string[];
  totalProperties: number;
  activeTenants: number;
  monthlyRentTotal: number;
  accountStatus: 'active' | 'inactive' | 'suspended' | 'pending_setup';
  onboardingComplete: boolean;
  onboardingStep: number;
  agreementAccepted: boolean;
  agreementAcceptedDate?: any; // Timestamp
  agreementDocumentId?: string;
  managementFee: {
    type: 'percentage' | 'flat_monthly' | 'flat_per_unit';
    amount: number;
    includesMaintenanceCoordination: boolean;
  };
  preferences?: {
    notifyOnMaintenance: boolean;
    notifyOnTenantIssues: boolean;
    notifyOnPayments: boolean;
    monthlyStatements: boolean;
  };
  notes?: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  createdBy?: string;
}

export interface LandlordDocument {
  id?: string;
  landlordId: string;
  documentType: 'w9' | 'insurance_certificate' | 'license' | 'agreement' | 'id_verification' | 'bank_verification' | 'other';
  fileName: string;
  storageUrl: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedByRole: 'landlord' | 'admin' | 'super-admin';
  description?: string;
  expirationDate?: any; // Timestamp
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reviewedBy?: string;
  reviewedAt?: any; // Timestamp
  rejectionReason?: string;
  metadata?: Record<string, any>;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export interface Payout {
  id?: string;
  landlordId: string;
  payoutPeriodStart: any; // Timestamp
  payoutPeriodEnd: any; // Timestamp
  rentCollected: number;
  managementFees: number;
  maintenanceExpenses: number;
  otherExpenses: number;
  totalDeductions: number;
  netAmount: number;
  payoutMethod: 'ach' | 'wire' | 'check' | 'stripe';
  status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  scheduledDate: any; // Timestamp
  processedDate?: any; // Timestamp
  completedDate?: any; // Timestamp
  transactionId?: string;
  confirmationNumber?: string;
  propertyBreakdown: Array<{
    propertyId: string;
    propertyName: string;
    rentCollected: number;
    expenses: number;
  }>;
  ledgerEntries: string[];
  expenseIds: string[];
  notes?: string;
  failureReason?: string;
  retryCount: number;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  createdBy: string;
}

export interface LandlordExpense {
  id?: string;
  landlordId: string;
  propertyId: string;
  expenseType: 'maintenance' | 'repair' | 'utility' | 'insurance' | 'tax' | 'capital_improvement' | 'other';
  category: string; // More specific: 'plumbing', 'electrical', 'hvac', 'lawn_care', etc.
  amount: number;
  vendor: string;
  vendorContact?: string;
  description: string;
  date: any; // Timestamp
  paidDate?: any; // Timestamp
  paymentMethod: 'company_card' | 'company_check' | 'landlord_paid' | 'deducted_from_rent';
  status: 'pending' | 'approved' | 'paid' | 'reimbursed' | 'rejected';
  maintenanceRequestId?: string;
  receiptUrls: string[];
  invoiceNumber?: string;
  taxDeductible: boolean;
  payoutId?: string;
  reimbursementStatus: 'not_applicable' | 'pending' | 'deducted' | 'reimbursed';
  approvedBy?: string;
  approvedAt?: any; // Timestamp
  notes?: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  createdBy: string;
}

export interface LandlordReport {
  id?: string;
  landlordId: string;
  reportType: 'monthly_statement' | 'quarterly_summary' | 'annual_tax' | 'custom' | 'year_end';
  reportPeriod: string;
  periodStart: any; // Timestamp
  periodEnd: any; // Timestamp
  status: 'generating' | 'completed' | 'failed' | 'emailed';
  documentUrl?: string;
  storagePath?: string;
  summary: {
    totalRentCollected: number;
    totalExpenses: number;
    netIncome: number;
    occupancyRate: number;
    maintenanceCount: number;
  };
  data: Record<string, any>; // Flexible structure based on report type
  generatedAt?: any; // Timestamp
  generatedBy?: string;
  emailedTo?: string[];
  emailedAt?: any; // Timestamp
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

// Authentication utilities
export const authUtils = {
  async signIn(email: string, password: string) {
    const auth = getFirebaseAuth();
    return await signInWithEmailAndPassword(auth, email, password);
  },

  async signUp(email: string, password: string, displayName: string) {
    const auth = getFirebaseAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    return userCredential;
  },

  async signOut() {
    const auth = getFirebaseAuth();
    return await signOut(auth);
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, callback);
  }
};

// User role management
export const userUtils = {
  async getUserRole(uid: string): Promise<UserRole | null> {
    const db = getFirestoreClient();
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? userDoc.data() as UserRole : null;
  },

  async setUserRole(uid: string, roleData: UserRole) {
    const db = getFirestoreClient();
    await setDoc(doc(db, 'users', uid), roleData);
  },

  async updateUserRole(uid: string, updates: Partial<UserRole>) {
    const db = getFirestoreClient();
    await updateDoc(doc(db, 'users', uid), updates);
  }
};

// Maintenance request utilities
export const maintenanceUtils = {
  async createRequest(requestData: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt'>) {
    const db = getFirestoreClient();
    const docRef = await addDoc(collection(db, 'maintenanceRequests'), {
      ...requestData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async getRequestsByTenant(tenantId: string) {
    const db = getFirestoreClient();
    const q = query(
      collection(db, 'maintenanceRequests'),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRequest));
  },

  async getAllRequests() {
    const db = getFirestoreClient();
    const q = query(
      collection(db, 'maintenanceRequests'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRequest));
  },

  async updateRequestStatus(requestId: string, status: MaintenanceRequest['status'], adminNotes?: string) {
    const db = getFirestoreClient();
    const updates: any = { status, updatedAt: serverTimestamp() };
    if (adminNotes) updates.adminNotes = adminNotes;
    await updateDoc(doc(db, 'maintenanceRequests', requestId), updates);
  }
};

// Property utilities
export const propertyUtils = {
  async getProperties() {
    const db = getFirestoreClient();
    const q = query(collection(db, 'properties'), where('available', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
  },

  async getProperty(propertyId: string) {
    const db = getFirestoreClient();
    const docRef = doc(db, 'properties', propertyId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Property : null;
  }
};

// Payment utilities
export const paymentUtils = {
  async getPaymentsByTenant(tenantId: string) {
    const db = getFirestoreClient();
    const q = query(
      collection(db, 'payments'),
      where('tenantId', '==', tenantId),
      orderBy('dueDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
  },

  async createPayment(paymentData: Omit<Payment, 'id' | 'createdAt'>) {
    const db = getFirestoreClient();
    const docRef = await addDoc(collection(db, 'payments'), {
      ...paymentData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  // Ledger utilities
  async getLedgerByTenant(tenantId: string) {
    const db = getFirestoreClient();
    const q = query(
      collection(db, 'ledger'),
      where('tenantId', '==', tenantId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LedgerEntry));
  },

  async createLedgerEntry(entryData: Omit<LedgerEntry, 'id' | 'createdAt'>) {
    const db = getFirestoreClient();
    const docRef = await addDoc(collection(db, 'ledger'), {
      ...entryData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  // Payment Plan utilities
  async getPaymentPlansByTenant(tenantId: string) {
    const db = getFirestoreClient();
    const q = query(
      collection(db, 'paymentPlans'),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentPlan));
  },

  async createPaymentPlan(planData: Omit<PaymentPlan, 'id' | 'createdAt'>) {
    const db = getFirestoreClient();
    const docRef = await addDoc(collection(db, 'paymentPlans'), {
      ...planData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  }
};

// Admin utilities
export const adminUtils = {
  async getAllTenants() {
    const db = getFirestoreClient();
    const q = query(collection(db, 'users'), where('role', '==', 'tenant'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getLeaseDocuments(tenantId: string) {
    const db = getFirestoreClient();
    const q = query(
      collection(db, 'leaseDocuments'),
      where('tenantId', '==', tenantId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaseDocument));
  },

  async getPortfolioStats() {
    const db = getFirestoreClient();

    // This would typically be a cloud function or a more complex query in production
    // For now, we fetch and aggregate
    const propertiesSnap = await getDocs(collection(db, 'properties'));
    const tenantsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'tenant')));
    const overdueLedgerSnap = await getDocs(query(collection(db, 'ledger'), where('status', '==', 'overdue')));

    const totalRent = propertiesSnap.docs.reduce((acc, doc) => acc + (doc.data().rent || 0), 0);
    const overdueAmount = overdueLedgerSnap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);

    return {
      totalProperties: propertiesSnap.size,
      activeTenants: tenantsSnap.size,
      totalRentValue: totalRent,
      overdueAmount: overdueAmount
    };
  }
};

// Rent Tracking utilities
export const rentTrackingUtils = {
  /**
   * Calculate payment status for a property based on rent charges and payments
   */
  calculatePaymentStatus(
    rentCharge: LedgerEntry | null,
    payments: LedgerEntry[],
    dueDate: Date
  ): { status: 'paid' | 'pending' | 'overdue' | 'partial'; amountPaid: number } {
    if (!rentCharge) {
      return { status: 'pending', amountPaid: 0 };
    }

    const totalPaid = payments.reduce((sum, payment) => sum + Math.abs(payment.amount), 0);
    const amountDue = rentCharge.amount;
    const now = new Date();
    const isOverdue = now > dueDate;

    if (totalPaid >= amountDue) {
      return { status: 'paid', amountPaid: totalPaid };
    } else if (totalPaid > 0) {
      return { status: 'partial', amountPaid: totalPaid };
    } else if (isOverdue) {
      return { status: 'overdue', amountPaid: 0 };
    } else {
      return { status: 'pending', amountPaid: 0 };
    }
  },

  /**
   * Get rent status for all properties for a specific month
   */
  async getAllPropertiesRentStatus(month?: string): Promise<any[]> {
    const db = getFirestoreClient();

    // Default to current month if not specified
    const targetMonth = month || new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const [year, monthNum] = targetMonth.split('-').map(Number);

    // Get month boundaries
    const monthStart = new Date(year, monthNum - 1, 1);
    const monthEnd = new Date(year, monthNum, 0, 23, 59, 59);

    // Fetch all properties
    const propertiesSnap = await getDocs(collection(db, 'properties'));
    const properties = propertiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property & { id: string }));

    // Fetch all ledger entries for the month
    const ledgerQuery = query(
      collection(db, 'ledger'),
      where('date', '>=', monthStart),
      where('date', '<=', monthEnd)
    );
    const ledgerSnap = await getDocs(ledgerQuery);
    const ledgerEntries = ledgerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LedgerEntry));

    // Fetch all tenants
    const tenantsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'tenant')));
    const tenants = tenantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserRole & { id: string })) as (UserRole & { id: string })[];

    // Build rent status for each property
    const rentStatuses = properties.map(property => {
      // Find tenant for this property
      const tenant = tenants.find(t => property.id && t.propertyIds?.includes(property.id));

      // Find rent charges for this property
      const rentCharges = ledgerEntries.filter(
        entry => entry.propertyId === property.id &&
          entry.category === 'rent' &&
          entry.type === 'charge'
      );

      // Find payments for this property
      const payments = ledgerEntries.filter(
        entry => entry.propertyId === property.id &&
          entry.category === 'rent' &&
          entry.type === 'payment'
      );

      // Get the primary rent charge (usually first of month)
      const rentCharge = rentCharges.length > 0 ? rentCharges[0] : null;
      const dueDate = rentCharge?.date?.toDate ? rentCharge.date.toDate() : new Date(year, monthNum - 1, 1);

      // Calculate status
      const { status, amountPaid } = this.calculatePaymentStatus(rentCharge, payments, dueDate);

      // Find last payment
      const sortedPayments = payments.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate().getTime() : 0;
        const dateB = b.date?.toDate ? b.date.toDate().getTime() : 0;
        return dateB - dateA;
      });
      const lastPayment = sortedPayments[0];

      return {
        propertyId: property.id,
        propertyName: property.name || 'Unknown Property',
        propertyAddress: property.address || '',
        tenantId: tenant?.id || '',
        tenantName: tenant?.displayName || 'No Tenant',
        monthlyRent: property.rent || 0,
        dueDate: dueDate,
        status: status,
        amountPaid: amountPaid,
        amountDue: property.rent || 0,
        lastPaymentDate: lastPayment?.date?.toDate ? lastPayment.date.toDate() : undefined,
        paymentMethod: lastPayment?.paymentMethod || undefined
      };
    });

    return rentStatuses;
  },

  /**
   * Get rent status for a specific property
   */
  async getPropertyRentStatus(propertyId: string, month?: string): Promise<any | null> {
    const allStatuses = await this.getAllPropertiesRentStatus(month);
    return allStatuses.find(status => status.propertyId === propertyId) || null;
  },

  /**
   * Get monthly payment summary statistics
   */
  async getMonthlyPaymentSummary(month?: string): Promise<any> {
    const rentStatuses = await this.getAllPropertiesRentStatus(month);

    const summary = {
      month: month || new Date().toISOString().slice(0, 7),
      totalProperties: rentStatuses.length,
      paidCount: rentStatuses.filter(s => s.status === 'paid').length,
      pendingCount: rentStatuses.filter(s => s.status === 'pending').length,
      overdueCount: rentStatuses.filter(s => s.status === 'overdue').length,
      partialCount: rentStatuses.filter(s => s.status === 'partial').length,
      totalCollected: rentStatuses.reduce((sum, s) => sum + s.amountPaid, 0),
      totalExpected: rentStatuses.reduce((sum, s) => sum + s.amountDue, 0),
      collectionRate: 0
    };

    // Calculate collection rate percentage
    summary.collectionRate = summary.totalExpected > 0
      ? (summary.totalCollected / summary.totalExpected) * 100
      : 0;

    return summary;
  },

  /**
   * Get payment history for a property over multiple months
   */
  async getPaymentHistory(propertyId: string, months: number = 6): Promise<any[]> {
    const history = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = targetDate.toISOString().slice(0, 7);

      const status = await this.getPropertyRentStatus(propertyId, monthStr);
      if (status) {
        history.push({ ...status, month: monthStr });
      }
    }

    return history;
  }
};

// Storage utilities
export const storageUtils = {
  async uploadFile(file: File, path: string, metadata?: any) {
    const storage = getStorageClient();
    const storageRef = ref(storage, path);
    const uploadResult = await uploadBytes(storageRef, file, metadata);
    return await getDownloadURL(uploadResult.ref);
  },

  async deleteFile(path: string) {
    const storage = getStorageClient();
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
  }
};

// Messaging utilities
export const messagingUtils = {
  async requestPermission() {
    const messaging = getMessagingClient();
    if (!messaging) return null;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        return await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
    return null;
  },

  onMessage(callback: (payload: any) => void) {
    const messaging = getMessagingClient();
    if (!messaging) return () => { };

    return onMessage(messaging, callback);
  }
};

// Analytics utilities
export const analyticsUtils = {
  logEvent(eventName: string, parameters?: any) {
    const analytics = getAnalyticsClient();
    if (!analytics) return;

    logEvent(analytics, eventName, parameters);
  },

  logLogin(method: string) {
    this.logEvent('login', { method });
  },

  logSignUp(method: string) {
    this.logEvent('sign_up', { method });
  },

  logMaintenanceRequest(priority: string) {
    this.logEvent('maintenance_request_created', { priority });
  }
};

// Landlord utilities
export const landlordUtils = {
  // Landlord CRUD operations
  async createLandlord(landlordData: Omit<Landlord, 'id' | 'createdAt' | 'updatedAt'>) {
    const db = getFirestoreClient();
    const docRef = doc(db, 'landlords', landlordData.userId);
    await setDoc(docRef, {
      ...landlordData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return landlordData.userId;
  },

  async getLandlord(landlordId: string): Promise<Landlord | null> {
    const db = getFirestoreClient();
    const docRef = doc(db, 'landlords', landlordId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Landlord : null;
  },

  async updateLandlord(landlordId: string, updates: Partial<Landlord>) {
    const db = getFirestoreClient();
    await updateDoc(doc(db, 'landlords', landlordId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  async getAllLandlords(): Promise<Landlord[]> {
    const db = getFirestoreClient();
    const q = query(collection(db, 'landlords'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Landlord));
  },

  async getActiveLandlords(): Promise<Landlord[]> {
    const db = getFirestoreClient();
    const q = query(
      collection(db, 'landlords'),
      where('accountStatus', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Landlord));
  },

  // Document management
  async uploadLandlordDocument(
    landlordId: string,
    file: File,
    documentType: LandlordDocument['documentType'],
    uploadedBy: string,
    uploadedByRole: LandlordDocument['uploadedByRole'],
    metadata?: Partial<LandlordDocument>
  ): Promise<string> {
    const storage = getStorageClient();
    const db = getFirestoreClient();

    // Upload file to Storage
    const storagePath = `landlords/${landlordId}/documents/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);

    // Create document record
    const docData: Omit<LandlordDocument, 'id' | 'createdAt' | 'updatedAt'> = {
      landlordId,
      documentType,
      fileName: file.name,
      storageUrl: downloadUrl,
      storagePath,
      fileSize: file.size,
      mimeType: file.type,
      uploadedBy,
      uploadedByRole,
      status: 'pending',
      ...metadata
    };

    const docRef = await addDoc(collection(db, 'landlordDocuments'), {
      ...docData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return docRef.id;
  },

  async getLandlordDocuments(landlordId: string): Promise<LandlordDocument[]> {
    const db = getFirestoreClient();
    const q = query(
      collection(db, 'landlordDocuments'),
      where('landlordId', '==', landlordId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LandlordDocument));
  },

  async updateDocumentStatus(
    documentId: string,
    status: LandlordDocument['status'],
    reviewedBy?: string,
    rejectionReason?: string
  ) {
    const db = getFirestoreClient();
    const updates: any = {
      status,
      updatedAt: serverTimestamp()
    };
    if (reviewedBy) {
      updates.reviewedBy = reviewedBy;
      updates.reviewedAt = serverTimestamp();
    }
    if (rejectionReason) {
      updates.rejectionReason = rejectionReason;
    }
    await updateDoc(doc(db, 'landlordDocuments', documentId), updates);
  },

  // Payout management
  async createPayout(payoutData: Omit<Payout, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const db = getFirestoreClient();
    const docRef = await addDoc(collection(db, 'payouts'), {
      ...payoutData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async getLandlordPayouts(landlordId: string): Promise<Payout[]> {
    const db = getFirestoreClient();
    const q = query(
      collection(db, 'payouts'),
      where('landlordId', '==', landlordId),
      orderBy('scheduledDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payout));
  },

  async updatePayoutStatus(
    payoutId: string,
    status: Payout['status'],
    updates?: Partial<Payout>
  ) {
    const db = getFirestoreClient();
    await updateDoc(doc(db, 'payouts', payoutId), {
      status,
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  async getScheduledPayouts(): Promise<Payout[]> {
    const db = getFirestoreClient();
    const q = query(
      collection(db, 'payouts'),
      where('status', '==', 'scheduled'),
      orderBy('scheduledDate', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payout));
  },

  // Expense management
  async createExpense(expenseData: Omit<LandlordExpense, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const db = getFirestoreClient();
    const docRef = await addDoc(collection(db, 'landlordExpenses'), {
      ...expenseData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async getLandlordExpenses(landlordId: string): Promise<LandlordExpense[]> {
    const db = getFirestoreClient();
    const q = query(
      collection(db, 'landlordExpenses'),
      where('landlordId', '==', landlordId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LandlordExpense));
  },

  async getPropertyExpenses(propertyId: string): Promise<LandlordExpense[]> {
    const db = getFirestoreClient();
    const q = query(
      collection(db, 'landlordExpenses'),
      where('propertyId', '==', propertyId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LandlordExpense));
  },

  async updateExpenseStatus(
    expenseId: string,
    status: LandlordExpense['status'],
    approvedBy?: string
  ) {
    const db = getFirestoreClient();
    const updates: any = {
      status,
      updatedAt: serverTimestamp()
    };
    if (approvedBy) {
      updates.approvedBy = approvedBy;
      updates.approvedAt = serverTimestamp();
    }
    await updateDoc(doc(db, 'landlordExpenses', expenseId), updates);
  },

  async getPendingExpenses(): Promise<LandlordExpense[]> {
    const db = getFirestoreClient();
    const q = query(
      collection(db, 'landlordExpenses'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LandlordExpense));
  },

  // Report management
  async createReport(reportData: Omit<LandlordReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const db = getFirestoreClient();
    const docRef = await addDoc(collection(db, 'landlordReports'), {
      ...reportData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async getLandlordReports(landlordId: string): Promise<LandlordReport[]> {
    const db = getFirestoreClient();
    const q = query(
      collection(db, 'landlordReports'),
      where('landlordId', '==', landlordId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LandlordReport));
  },

  async updateReportStatus(
    reportId: string,
    status: LandlordReport['status'],
    updates?: Partial<LandlordReport>
  ) {
    const db = getFirestoreClient();
    await updateDoc(doc(db, 'landlordReports', reportId), {
      status,
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  // Landlord properties
  async getLandlordProperties(landlordId: string): Promise<Property[]> {
    const db = getFirestoreClient();
    const q = query(
      collection(db, 'properties'),
      where('landlordId', '==', landlordId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
  },

  // Landlord financial summary
  async getLandlordFinancialSummary(landlordId: string): Promise<{
    totalRentCollected: number;
    totalExpenses: number;
    netIncome: number;
    pendingPayouts: number;
    propertyCount: number;
    tenantCount: number;
  }> {
    const db = getFirestoreClient();

    // Get properties owned by landlord
    const properties = await this.getLandlordProperties(landlordId);
    const propertyIds = properties.map(p => p.id).filter(Boolean) as string[];

    // Get ledger entries for landlord's properties
    let totalRentCollected = 0;
    if (propertyIds.length > 0) {
      const ledgerQuery = query(
        collection(db, 'ledger'),
        where('landlordId', '==', landlordId),
        where('type', '==', 'payment'),
        where('status', '==', 'completed')
      );
      const ledgerSnap = await getDocs(ledgerQuery);
      totalRentCollected = ledgerSnap.docs.reduce((sum, doc) => sum + Math.abs(doc.data().amount || 0), 0);
    }

    // Get expenses
    const expenses = await this.getLandlordExpenses(landlordId);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Get pending payouts
    const payoutsQuery = query(
      collection(db, 'payouts'),
      where('landlordId', '==', landlordId),
      where('status', '==', 'scheduled')
    );
    const payoutsSnap = await getDocs(payoutsQuery);
    const pendingPayouts = payoutsSnap.docs.reduce((sum, doc) => sum + (doc.data().netAmount || 0), 0);

    // Count tenants in landlord's properties
    let tenantCount = 0;
    if (propertyIds.length > 0) {
      const tenantsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'tenant')
      );
      const tenantsSnap = await getDocs(tenantsQuery);
      tenantCount = tenantsSnap.docs.filter(doc => {
        const tenantPropertyIds = doc.data().propertyIds || [];
        return tenantPropertyIds.some((id: string) => propertyIds.includes(id));
      }).length;
    }

    return {
      totalRentCollected,
      totalExpenses,
      netIncome: totalRentCollected - totalExpenses,
      pendingPayouts,
      propertyCount: properties.length,
      tenantCount
    };
  }
};
