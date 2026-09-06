import { useState } from 'react';
import Head from 'next/head';
import LandlordLayout from '@/components/Landlord/LandlordLayout';
import Card from '@/components/common/Card';
import { useLandlordData } from '@/hooks/useLandlordData';
import { ownerStatement, type OwnerPeriod } from '@/lib/ownerFinancials';
import type { NextPageWithAuth } from '../_app';
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const Financials: NextPageWithAuth = () => {
  const { properties, ledger, expenses, managementFee, loading, error, refresh } = useLandlordData();
  const [period, setPeriod] = useState<OwnerPeriod>('year-to-date');
  const statement = ownerStatement(ledger, expenses, period);
  const feeTerms = managementFee ? managementFee.type === 'percentage' ? `${managementFee.amount}% of collected rent`
    : `${money(managementFee.amount)} ${managementFee.type === 'flat_per_unit' ? 'per unit per month' : 'per month'}` : 'Not configured';
  return (
    <LandlordLayout title="Financials & Statements">
      <Head><title>Financial statements - Owner Portal</title></Head>
      <div className="financials-container">
        <div className="page-header">
          <div><h1>Financial statements</h1><p>Recorded rent receipts and paid expenses. Calendar periods use UTC.</p></div>
          <label>Period <select value={period} onChange={e => setPeriod(e.target.value as OwnerPeriod)}>
            <option value="year-to-date">Year to date</option><option value="last-month">Last month</option><option value="all-time">All time through today</option>
          </select></label>
          <button type="button" onClick={() => window.print()} disabled={loading || !!error}>Print statement</button>
        </div>
        {loading ? <p role="status">Loading financial records...</p> : error ? <p role="alert">{error} <button onClick={refresh}>Retry</button></p> : <>
          <p>Configured management fee: {feeTerms}. Only recorded paid management-fee expenses are deducted below.</p>
          {!statement.managementFees && <p>No paid management-fee records exist in this period. The recorded net does not include unposted fees.</p>}
          <Card title="Recorded cash statement">
            <div className="statement-row"><span>Rent collected</span><strong>{money(statement.rent)}</strong></div>
            {Object.entries(statement.categories).map(([category, amount]) => <div className="statement-row" key={category}><span>{category.replace(/_/g, ' ')}</span><span>{money(amount)}</span></div>)}
            <div className="statement-row total-row"><span>Total paid expenses (including management fees)</span><strong>{money(statement.totalExpenses)}</strong></div>
            <div className="statement-row grand-total"><span>Recorded net</span><strong>{money(statement.net)}</strong></div>
            <p>Pending, approved-but-unpaid, rejected expenses and unsettled payments are excluded. Security deposits are excluded from rent income.</p>
          </Card>
          <Card title="Property breakdown">
            {properties.length === 0 ? <p>No properties assigned.</p> : <div style={{ overflowX: 'auto' }}><table className="table"><thead><tr><th>Property</th><th>Rent</th><th>Operating expenses</th><th>Management fees</th><th>Net</th></tr></thead><tbody>
              {properties.map(p => { const row = statement.byProperty[p.id] || { rent: 0, expenses: 0, fees: 0, net: 0 }; return <tr key={p.id}><td>{p.name}</td><td>{money(row.rent)}</td><td>{money(row.expenses)}</td><td>{money(row.fees)}</td><td>{money(row.net)}</td></tr>; })}
            </tbody></table></div>}
          </Card>
        </>}
      </div>
            <style jsx>{`
                .financials-container {
                    padding: 2rem;
                    max-width: var(--max-width);
                    margin: 0 auto;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                h1 {
                    font-size: 2rem;
                    font-weight: 800;
                    color: var(--color-text);
                    margin: 0 0 0.25rem;
                }

                p {
                    color: var(--color-muted);
                    margin: 0;
                }

                .stat-card {
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    padding: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .stat-lbl {
                    font-size: 0.75rem;
                    color: var(--color-muted);
                    text-transform: uppercase;
                    font-weight: 600;
                }

                .stat-val {
                    font-size: 1.5rem;
                    font-weight: 800;
                }

                .stat-sub {
                    font-size: 0.75rem;
                    color: var(--color-muted);
                }

                .statement-table {
                    display: flex;
                    flex-direction: column;
                }

                .statement-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid var(--color-border);
                    font-size: 0.938rem;
                    color: var(--color-text);
                }

                .header-row {
                    font-weight: 700;
                    color: var(--color-muted);
                    text-transform: uppercase;
                    font-size: 0.813rem;
                    border-bottom: 2px solid var(--color-border);
                }

                .indent {
                    padding-left: 1.5rem;
                    color: var(--color-text-secondary);
                }

                .total-row {
                    font-weight: 700;
                    border-top: 1px solid var(--color-border);
                    border-bottom: 2px solid var(--color-border);
                }

                .grand-total {
                    background: var(--color-surface-elevated);
                    padding: 1rem;
                    border-radius: var(--radius-md);
                    font-weight: 800;
                    border: 1px solid var(--color-border);
                    margin-top: 1rem;
                }
            `}</style>
    </LandlordLayout>
  );
};
Financials.requireAuth = true;
Financials.allowedRoles = ['landlord'];
export default Financials;
