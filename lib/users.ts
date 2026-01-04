import { getFirestoreClient } from './firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export type TenantProfile = {
    id: string;
    email: string;
    displayName: string;
    role: 'tenant';
    propertyIds?: string[];
    unit?: string;
    createdAt?: string;
};

export const getTenants = async (): Promise<TenantProfile[]> => {
    const db = getFirestoreClient();
    const q = query(
        collection(db, 'users'),
        where('role', '==', 'tenant')
        // orderBy('createdAt', 'desc') // Requires index usually
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as TenantProfile));
};
