import { normalizeDate } from '@/lib/date';
import { moneyToCents } from '@/lib/ledger';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ownerStatement, type FinancialRecord } from '@/lib/ownerFinancials';
import type { Property, Payment, LandlordExpense, Payout, MaintenanceRequest, Lease } from '@/types/schema';

export interface OwnerDocument {
  id: string; fileName: string; documentType: string; status: string;
  fileSize?: number; updatedAt?: string; createdAt?: string; downloadable: boolean;
}
export interface OwnerRecords {
  properties: Property[]; leases: Lease[]; ledger: FinancialRecord[];
  expenses: LandlordExpense[]; payouts: Payout[]; documents: OwnerDocument[];
  maintenanceRequests: MaintenanceRequest[];
  managementFee: { type: string; amount: number } | null;
}
const empty: OwnerRecords = { properties: [], leases: [], ledger: [], expenses: [], payouts: [], documents: [], maintenanceRequests: [], managementFee: null };
export function useLandlordData(propertyId?: string) {
  const { user, profile } = useAuth();
  const sequence = useRef(0);
  const [state, setState] = useState({ records: empty, ownerUid: '', loading: true, error: null as string | null });
  const fetchData = useCallback(async () => {
    const request = ++sequence.current;
    if (!user || profile?.role !== 'landlord') {
      setState({ records: empty, ownerUid: '', loading: false, error: 'Owner access required' });
      return;
    }
    setState({ records: empty, ownerUid: user.uid, loading: true, error: null });
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/landlord/data${propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Owner records unavailable');
      // Refuse to present corrupt financial data as a zero balance.
      ownerStatement(data.ledger, data.expenses, 'all-time');
      if (request === sequence.current) setState({ records: data, ownerUid: user.uid, loading: false, error: null });
    } catch (error) {
      if (request === sequence.current) setState({ records: empty, ownerUid: user.uid, loading: false, error: error instanceof Error ? error.message : 'Owner records unavailable' });
    }
  }, [user, profile?.role, propertyId]);
  useEffect(() => { void fetchData(); return () => { sequence.current++; }; }, [fetchData]);
  const records = state.ownerUid === user?.uid ? state.records : empty;
  const statement = ownerStatement(records.ledger, records.expenses, 'year-to-date');
  const payments = records.ledger.filter(e => e.type === 'payment' && e.category === 'rent')
    .sort((a, b) => (normalizeDate(b.date)?.getTime() || 0) - (normalizeDate(a.date)?.getTime() || 0)).map(e => ({
    ...e, dueDate: e.date, paidAt: ['completed', 'paid', 'succeeded'].includes(e.status) ? e.date : undefined,
    status: e.status === 'completed' ? 'paid' : e.status,
  })) as unknown as Payment[];
  const summary = !state.loading && !state.error ? {
    totalRentCollected: statement.rent, totalExpenses: statement.totalExpenses, netIncome: statement.net,
    pendingPayouts: records.payouts.filter(p => p.status === 'scheduled').reduce((sum, p) => sum + moneyToCents(p.netAmount), 0) / 100,
    propertyCount: records.properties.length,
    tenantCount: new Set(records.leases.filter(l => l.isActive && l.status === 'active').map(l => l.tenantId)).size
  } : null;
  return { ...records, payments, summary, loading: state.loading || (!state.error && state.ownerUid !== user?.uid), error: state.error, refresh: fetchData };
}
