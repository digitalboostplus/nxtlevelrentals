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
  role: 'tenant' | 'admin' | 'super-admin';
  displayName?: string;
  email?: string;
  propertyIds?: string[];
  managedProperties?: string[];
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
