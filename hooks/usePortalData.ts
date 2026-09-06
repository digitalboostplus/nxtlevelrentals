import { calculateBalance, oldestUnpaidDate } from '@/lib/ledger';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { leaseUtils } from '@/lib/leases';
import { paymentUtils, maintenanceUtils, propertyUtils } from '@/lib/firebase-utils';
import type { Lease, Payment, Property, MaintenanceRequest, LedgerEntry } from '@/types/schema';

export interface PortalData {
    lease: Lease | null;
    property: Property | null;
    payments: Payment[];
    ledgerEntries: LedgerEntry[];
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
        ledgerEntries: [],
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
            const activeLease = (leases.find(l => l.isActive && l.status === 'active') || null) as unknown as Lease;

            // 2. Fetch Property Details. Prefer the lease's propertyId; fall back
            //    to the tenant's first assigned property (e.g. GHL-synced).
            let property: Property | null = null;
            const propertyId = activeLease?.propertyId || profile.propertyIds?.[0];
            if (propertyId) {
                const p = await propertyUtils.getProperty(propertyId);
                if (p) {
                    property = p as unknown as Property;
                }
            }

            // 3. Fetch Payments & Ledger
            const [paymentsRaw, ledgerRaw] = await Promise.all([
                paymentUtils.getPaymentsByTenant(user.uid),
                paymentUtils.getLedgerByTenant(user.uid)
            ]);

            const payments = paymentsRaw.map(p => ({
                ...p,
                dueDate: (p.dueDate as any)?.toDate ? (p.dueDate as any).toDate() : new Date(p.dueDate),
                paidAt: (p.paidDate as any)?.toDate ? (p.paidDate as any).toDate() : (p.paidDate ? new Date(p.paidDate) : undefined),
            })) as unknown as Payment[];

            const ledgerEntries = (ledgerRaw || []) as unknown as LedgerEntry[];

            // 4. Fetch Maintenance Requests
            const maintenanceRequestsRaw = await maintenanceUtils.getRequestsByTenant(user.uid);
            const maintenanceRequests = maintenanceRequestsRaw as unknown as MaintenanceRequest[];

            // 5. Calculate Real Financial Balance
            const calculatedBalance = calculateBalance(ledgerEntries);
            const nextDueDate = oldestUnpaidDate(ledgerEntries);

            setData({
                lease: activeLease,
                property,
                payments,
                ledgerEntries,
                maintenanceRequests,
                loading: false,
                error: null,
                metrics: {
                    currentBalance: calculatedBalance,
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
        if (user && profile) {
            fetchData();
        }
    }, [user, profile, fetchData]);

    return { ...data, refresh: fetchData };
}
