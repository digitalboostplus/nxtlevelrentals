import Head from 'next/head';
import { useMemo, useState } from 'react';
import LandlordLayout from '@/components/Landlord/LandlordLayout';
import NetIncomeChart from '@/components/Landlord/NetIncomeChart';
import LoadingState from '@/components/common/LoadingState';
import { useLandlordData } from '@/hooks/useLandlordData';
import { ownerStatement, type OwnerPeriod } from '@/lib/ownerFinancials';
import { formatLocalDate } from '@/lib/date';
import { formatMoney, monthlyNet } from '@/lib/console-home';
import type { NextPageWithAuth } from '../_app';

const PERIODS: [OwnerPeriod, string][] = [
  ['year-to-date', 'Year to date'],
  ['last-month', 'Last month'],
  ['all-time', 'All time'],
];

const Financials: NextPageWithAuth = () => {
  const { properties, ledger, expenses, managementFee, loading, error, refresh } = useLandlordData();
  const [period, setPeriod] = useState<OwnerPeriod>('year-to-date');
  const now = useMemo(() => new Date(), []);
  const statement = ownerStatement(ledger, expenses, period, now);
  const series = useMemo(() => monthlyNet(ledger, expenses, now, 6), [ledger, expenses, now]);

  const periodLabel =
    period === 'year-to-date'
      ? `Jan 1 to ${formatLocalDate(now, { month: 'short', day: 'numeric', year: 'numeric' })}`
      : period === 'last-month'
        ? formatLocalDate(new Date(now.getFullYear(), now.getMonth() - 1, 1), { month: 'long', year: 'numeric' })
        : `All time through ${formatLocalDate(now, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const feeTerms = managementFee
    ? managementFee.type === 'percentage'
      ? `${managementFee.amount}% of collected rent`
      : `${formatMoney(managementFee.amount)} ${managementFee.type === 'flat_per_unit' ? 'per unit per month' : 'per month'}`
    : 'not configured';

  const money = (value: number) => formatMoney(value, { cents: true });

  return (
    <LandlordLayout title="Financials & Statements">
      <Head>
        <title>Financial statements - Owner Portal</title>
      </Head>

      <div className="owner-page">
        <div className="owner-page__head">
          <div>
            <p className="section-eyebrow">Owner portal</p>
            <h1>Financial statements</h1>
            <p className="owner-page__sub">Recorded rent receipts and paid expenses. Calendar periods use UTC. Management fee: {feeTerms}.</p>
          </div>
          <div className="owner-page__actions">
            <button type="button" className="primary-button" onClick={() => window.print()} disabled={loading || Boolean(error)}>
              Print statement
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading financial records..." />
        ) : error ? (
          <div className="owner-alert" role="alert">
            {error}{' '}
            <button type="button" className="owner-small-button" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="owner-page__chips" role="tablist" aria-label="Statement period">
              {PERIODS.map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={period === key} className={`filter-chip${period === key ? ' filter-chip--active' : ''}`} onClick={() => setPeriod(key)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="owner-page__grid">
              <div className="owner-card">
                <h2>Statement, {periodLabel}</h2>
                <div className="fin__rows">
                  <div className="fin__row fin__row--strong">
                    <span>Rent collected</span>
                    <span>{money(statement.rent)}</span>
                  </div>
                  {Object.entries(statement.categories).map(([category, amount]) => (
                    <div className="fin__row" key={category}>
                      <span style={{ textTransform: 'capitalize' }}>{category.replace(/_/g, ' ')}</span>
                      <span>&minus;{money(amount)}</span>
                    </div>
                  ))}
                  <div className="fin__row fin__row--strong">
                    <span>Total paid expenses</span>
                    <span>&minus;{money(statement.totalExpenses)}</span>
                  </div>
                  <div className="fin__row fin__row--net">
                    <span>Net to owner</span>
                    <span>{money(statement.net)}</span>
                  </div>
                </div>
                <p className="owner-note">
                  Pending, approved-but-unpaid and rejected expenses and unsettled payments are excluded. Security deposits are not income.
                  {!statement.managementFees ? ' No paid management-fee records exist in this period, so the net does not include unposted fees.' : ''}
                </p>
              </div>

              <NetIncomeChart series={series} />
            </div>

            <div className="owner-page__section-head">
              <h2>By property</h2>
            </div>
            {properties.length === 0 ? (
              <div className="owner-card">
                <p className="owner-empty">No properties are linked to your account yet.</p>
              </div>
            ) : (
              <div className="table-wrapper owner-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Property</th>
                      <th scope="col">Rent</th>
                      <th scope="col">Operating expenses</th>
                      <th scope="col">Management fees</th>
                      <th scope="col">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.map((p) => {
                      const row = statement.byProperty[p.id] || { rent: 0, expenses: 0, fees: 0, net: 0 };
                      return (
                        <tr key={p.id}>
                          <th scope="row">{p.name}</th>
                          <td>{money(row.rent)}</td>
                          <td>{money(row.expenses)}</td>
                          <td>{money(row.fees)}</td>
                          <td>{money(row.net)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .fin__rows {
          display: grid;
        }

        .fin__row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--color-border);
          font-size: 0.95rem;
          color: var(--color-muted);
        }

        .fin__row span:last-child {
          color: var(--color-text);
          font-weight: 600;
        }

        .fin__row--strong span:first-child {
          color: var(--color-text);
          font-weight: 600;
        }

        .fin__row--net {
          border-bottom: none;
          padding-top: 1rem;
          font-size: 1.15rem;
        }

        .fin__row--net span {
          color: var(--color-text);
          font-weight: 700;
        }

        @media print {
          :global(.landlord-sidebar),
          :global(.site-header),
          :global(.site-footer),
          .owner-page__actions,
          .owner-page__chips {
            display: none !important;
          }
        }
      `}</style>
    </LandlordLayout>
  );
};

Financials.requireAuth = true;
Financials.allowedRoles = ['landlord'];

export default Financials;
