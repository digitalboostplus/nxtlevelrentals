import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
    type DocumentData,
    getDoc
} from 'firebase/firestore';
import { getFirestoreClient } from './firebase';
import type { MaintenanceRequest, MaintenanceStatus } from '../types/maintenance';
// import { onMaintenanceCreated } from './notification-triggers';

const COLLECTION_NAME = 'maintenanceRequests';

export const createMaintenanceRequest = async (
    data: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> => {
    const db = getFirestoreClient();
    const now = Date.now();

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        status: 'submitted',
        createdAt: now,
        updatedAt: now,
    });

    // Trigger notifications asynchronously (don't block the request creation)
    const requestId = docRef.id;
    const createdRequest: MaintenanceRequest = {
        id: requestId,
        ...data,
        status: 'submitted',
        createdAt: now,
        updatedAt: now
    };

    // Trigger notifications in background - ONLY ON SERVER
    if (typeof window === 'undefined') {
        import('./notification-triggers').then(({ onMaintenanceCreated }) => {
            onMaintenanceCreated(createdRequest, data.tenantId).catch(error => {
                console.error('Failed to send notifications for new maintenance request:', error);
            });
        }).catch(err => {
            console.error('Failed to load notification triggers:', err);
        });
    }

    return requestId;
};

export const getMaintenanceRequests = async (
    userId: string,
    role: string
): Promise<MaintenanceRequest[]> => {
    const db = getFirestoreClient();
    const collectionRef = collection(db, COLLECTION_NAME);

    let q;

    if (role === 'admin' || role === 'super-admin') {
        // Admins see all requests
        q = query(collectionRef, orderBy('createdAt', 'desc'));
    } else {
        // Tenants only see their own
        q = query(
            collectionRef,
            where('tenantId', '==', userId),
            orderBy('createdAt', 'desc')
        );
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as MaintenanceRequest));
};

export const updateMaintenanceRequestStatus = async (
    requestId: string,
    status: MaintenanceStatus,
    notes?: string
): Promise<void> => {
    const db = getFirestoreClient();
    const docRef = doc(db, COLLECTION_NAME, requestId);

    const updates: Partial<MaintenanceRequest> = {
        status,
        updatedAt: Date.now()
    };

    if (notes) {
        updates.adminNotes = notes;
    }

    await updateDoc(docRef, updates);
};

export const getMaintenanceRequestsByProperty = async (propertyId: string): Promise<MaintenanceRequest[]> => {
    const db = getFirestoreClient();
    const q = query(
        collection(db, COLLECTION_NAME),
        where('propertyId', '==', propertyId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as MaintenanceRequest));
}
