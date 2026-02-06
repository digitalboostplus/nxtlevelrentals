import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { landlordUtils, maintenanceUtils, paymentUtils } from '@/lib/firebase-utils';
import type { Property, Payment, LandlordExpense, Payout, MaintenanceRequest } from '@/types/schema';

export interface LandlordData {
    properties: Property[];
    payments: Payment[];
    maintenanceRequests: MaintenanceRequest[];
    expenses: LandlordExpense[];
    payouts: Payout[];
    summary: {
        totalRentCollected: number;
        totalExpenses: number;
        netIncome: number;
        pendingPayouts: number;
        propertyCount: number;
        tenantCount: number;
    } | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useLandlordData(): LandlordData {
    const { user, profile } = useAuth();
    const [data, setData] = useState<Omit<LandlordData, 'refresh'>>({
        properties: [],
        payments: [],
        maintenanceRequests: [],
        expenses: [],
        payouts: [],
        summary: null,
        loading: true,
        error: null,
    });

    const fetchData = useCallback(async () => {
        if (!user || profile?.role !== 'landlord') return;

        try {
            setData(prev => ({ ...prev, loading: true, error: null }));

            // 1. Fetch Properties owned by this landlord
            const propertiesRaw = await landlordUtils.getLandlordProperties(user.uid);
            const properties = propertiesRaw as unknown as Property[];

            // 2. Fetch Financial Summary
            const summary = await landlordUtils.getLandlordFinancialSummary(user.uid);

            // 3. Fetch Payments
            const paymentsRaw = await paymentUtils.getPaymentsByLandlord(user.uid);
            const payments = paymentsRaw as unknown as Payment[];

            // 4. Fetch Expenses
            const expensesRaw = await landlordUtils.getLandlordExpenses(user.uid);
            const expenses = expensesRaw as unknown as LandlordExpense[];

            // 5. Fetch maintenance requests for all landlord's properties
            const maintenanceRequests: MaintenanceRequest[] = [];
            for (const prop of properties) {
                if (prop.id) {
                    const reqs = await maintenanceUtils.getRequestsByProperty(prop.id);
                    maintenanceRequests.push(...(reqs as unknown as MaintenanceRequest[]));
                }
            }

            setData({
                properties,
                payments,
                maintenanceRequests,
                expenses,
                payouts: [], // TODO: Fetch Payouts
                summary,
                loading: false,
                error: null,
            });

        } catch (err) {
            console.error("Error fetching landlord data:", err);
            setData(prev => ({ ...prev, loading: false, error: "Failed to load landlord data." }));
        }
    }, [user, profile]);

    useEffect(() => {
        if (user && profile?.role === 'landlord') {
            fetchData();
        }
    }, [user, profile, fetchData]);

    return { ...data, refresh: fetchData };
}
