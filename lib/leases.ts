import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
    type DocumentData
} from 'firebase/firestore';
import { getFirestoreClient } from './firebase';
import type { Lease } from '@/types/schema';

const COLLECTION_NAME = 'leases';

export const leaseUtils = {
    /**
     * Create a new lease
     */
    async createLease(leaseData: Omit<Lease, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const db = getFirestoreClient();
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...leaseData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    },

    /**
     * Get a lease by ID
     */
    async getLease(leaseId: string): Promise<Lease | null> {
        const db = getFirestoreClient();
        const docRef = doc(db, COLLECTION_NAME, leaseId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) return null;

        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            // Convert timestamps if needed, though Firestore SDK handles this largely
        } as Lease;
    },

    /**
     * Get active lease for a property
     */
    async getActiveLeaseForProperty(propertyId: string): Promise<Lease | null> {
        const db = getFirestoreClient();
        const q = query(
            collection(db, COLLECTION_NAME),
            where('propertyId', '==', propertyId),
            where('isActive', '==', true),
            where('status', '==', 'active'),
            limit(1)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        return {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data()
        } as Lease;
    },

    /**
     * Get leases for a tenant
     */
    async getLeasesByTenant(tenantId: string): Promise<Lease[]> {
        const db = getFirestoreClient();
        const q = query(
            collection(db, COLLECTION_NAME),
            where('tenantId', '==', tenantId),
            orderBy('startDate', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }) as Lease);
    },

    /**
     * Get leases for a landlord
     */
    async getLeasesByLandlord(landlordId: string): Promise<Lease[]> {
        const db = getFirestoreClient();
        const q = query(
            collection(db, COLLECTION_NAME),
            where('landlordId', '==', landlordId),
            orderBy('startDate', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }) as Lease);
    },

    /**
     * Update lease status
     */
    async updateLeaseStatus(
        leaseId: string,
        status: Lease['status'],
        isActive: boolean
    ): Promise<void> {
        const db = getFirestoreClient();
        await updateDoc(doc(db, COLLECTION_NAME, leaseId), {
            status,
            isActive,
            updatedAt: serverTimestamp()
        });
    }
};
