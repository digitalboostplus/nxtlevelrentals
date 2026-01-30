import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { leaseUtils } from '@/lib/leases';
import { paymentUtils, maintenanceUtils, propertyUtils } from '@/lib/firebase-utils';
import type { Lease, Payment, Property } from '@/types/schema';
import type { MaintenanceRequest } from '@/types/maintenance';

export interface PortalData {
    lease: Lease | null;
    property: Property | null;
    payments: Payment[];
    maintenanceRequests: MaintenanceRequest[];
    loading: boolean;
    error: string | null;
    metrics: {
        currentBalance: number;
        nextDueDate: Date | null;
        daysUntilDue: number | null;
    };
    refresh: () => Promise<void>;
}

export function usePortalData(): PortalData {
    const { user, profile } = useAuth();
    const [data, setData] = useState<Omit<PortalData, 'refresh'>>({
        lease: null,
        property: null,
        payments: [],
        maintenanceRequests: [],
        loading: true,
        error: null,
        metrics: {
            currentBalance: 0,
            nextDueDate: null,
            daysUntilDue: null,
        },
    });

    const fetchData = useCallback(async () => {
        if (!user || !profile) return;

        try {
            setData(prev => ({ ...prev, loading: true, error: null }));

            // 1. Fetch Leases to find the active one
            const leases = await leaseUtils.getLeasesByTenant(user.uid);
            const activeLease = leases.find(l => l.isActive && l.status === 'active') || leases[0] || null;

            // 2. Fetch Property Details if we have a lease
            let property: Property | null = null;
            if (activeLease) {
                const p = await propertyUtils.getProperty(activeLease.propertyId);
                if (p) {
                    property = p as unknown as Property;
                }
            }

            // 3. Fetch Payments
            const paymentsRaw = await paymentUtils.getPaymentsByTenant(user.uid);
            const payments = paymentsRaw.map(p => ({
                ...p,
                dueDate: (p.dueDate as any)?.toDate ? (p.dueDate as any).toDate() : new Date(p.dueDate),
                paidAt: (p.paidDate as any)?.toDate ? (p.paidDate as any).toDate() : (p.paidDate ? new Date(p.paidDate) : undefined),
            })) as unknown as Payment[];


            // 4. Fetch Maintenance Requests
            const maintenanceRequestsRaw = await maintenanceUtils.getRequestsByTenant(user.uid);
            const maintenanceRequests = maintenanceRequestsRaw as unknown as MaintenanceRequest[];

            // 5. Calculate Metrics
            let nextDueDate: Date | null = null;

            if (activeLease) {
                const now = new Date();
                const dueDay = activeLease.paymentDueDay;
                let nextDue = new Date(now.getFullYear(), now.getMonth(), dueDay);
                if (nextDue < now) {
                    nextDue = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
                }
                nextDueDate = nextDue;
            }

            setData({
                lease: activeLease,
                property,
                payments,
                maintenanceRequests,
                loading: false,
                error: null,
                metrics: {
                    currentBalance: 0,
                    nextDueDate,
                    daysUntilDue: nextDueDate ? Math.ceil((nextDueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
                }
            });

        } catch (err) {
            console.error("Error fetching portal data:", err);
            setData(prev => ({ ...prev, loading: false, error: "Failed to load portal data." }));
        }
    }, [user, profile]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { ...data, refresh: fetchData };
}
