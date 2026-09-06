import LandlordLayout from '@/components/Landlord/LandlordLayout';
import Card from '@/components/common/Card';
import { useLandlordData } from '@/hooks/useLandlordData';
import { formatLocalDate, normalizeDate } from '@/lib/date';
import type { NextPageWithAuth } from '../_app';
const money = (amount: number | undefined) => typeof amount === 'number' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : 'Not recorded';
const Payouts: NextPageWithAuth = () => {
  const { payouts, loading, error, refresh } = useLandlordData();
  const sorted = [...payouts].sort((a, b) => (normalizeDate(b.processedDate || b.scheduledDate)?.getTime() || 0) - (normalizeDate(a.processedDate || a.scheduledDate)?.getTime() || 0));
  return <LandlordLayout title="Disbursements & Payouts"><div style={{ padding: '2rem' }}>
    <h1>Disbursements & payouts</h1><p>Recorded distributions. Bank connection and automatic transfers are not available in this portal.</p>
    {loading ? <p role="status">Loading payouts...</p> : error ? <p role="alert">{error} <button onClick={refresh}>Retry</button></p> : <Card title="Payout history">
      {sorted.length === 0 ? <p>No payout records are available.</p> : <div style={{ overflowX: 'auto' }}><table className="table"><thead><tr><th>Scheduled / processed</th><th>Period</th><th>Net amount</th><th>Method</th><th>Status</th></tr></thead><tbody>
        {sorted.map(p => <tr key={p.id}><td>{formatLocalDate(p.processedDate || p.scheduledDate) || 'Not recorded'}</td><td>{formatLocalDate(p.payoutPeriodStart) || 'Unknown'} ? {formatLocalDate(p.payoutPeriodEnd) || 'Unknown'}</td><td>{money(p.netAmount)}</td><td>{p.payoutMethod || 'Not recorded'}</td><td>{p.status}</td></tr>)}
      </tbody></table></div>}
    </Card>}
  </div></LandlordLayout>;
};
Payouts.requireAuth = true;
Payouts.allowedRoles = ['landlord'];
export default Payouts;
