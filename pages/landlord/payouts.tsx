import Head from 'next/head';
import { useMemo } from 'react';
import LandlordLayout from '@/components/Landlord/LandlordLayout';
import LoadingState from '@/components/common/LoadingState';
import { useLandlordData } from '@/hooks/useLandlordData';
import { formatLocalDate, normalizeDate } from '@/lib/date';
import { formatMoney } from '@/lib/console-home';
import type { Payout } from '@/types/schema';
import type { NextPageWithAuth } from '../_app';

type OwnerPayout = Payout & { totalDeductions?: number };

const statusTag: Record<string, string> = {
  scheduled: 'tag--info',
  processing: 'tag--info',
  completed: 'tag--success',
  failed: 'tag--error',
  cancelled: 'tag--neutral',
};

const money = (amount: number | undefined) => (typeof amount === 'number' ? formatMoney(amount, { cents: true }) : 'Not recorded');
const when = (payout: OwnerPayout) => normalizeDate(payout.processedDate || payout.scheduledDate);

const Payouts: NextPageWithAuth = () => {
  const { payouts, loading, error, refresh } = useLandlordData();
  const list = payouts as OwnerPayout[];

  const sorted = useMemo(() => [...list].sort((a, b) => (when(b)?.getTime() || 0) - (when(a)?.getTime() || 0)), [list]);
  const next = useMemo(
    () =>
      list
        .filter((p) => p.status === 'scheduled' || p.status === 'processing')
        .sort((a, b) => (normalizeDate(a.scheduledDate)?.getTime() || Infinity) - (normalizeDate(b.scheduledDate)?.getTime() || Infinity))[0],
    [list]
  );
  const completed = useMemo(() => sorted.filter((p) => p.status === 'completed'), [sorted]);
  const year = new Date().getFullYear();
  const paidThisYear = completed.filter((p) => when(p)?.getFullYear() === year);
  const ytd = paidThisYear.reduce((sum, p) => sum + (p.netAmount || 0), 0);
  const last = completed[0];

  return (
    <LandlordLayout title="Disbursements & Payouts">
      <Head>
        <title>Disbursements and payouts - Owner Portal</title>
      </Head>

      <div className="owner-page">
        <div className="owner-page__head">
          <div>
            <p className="section-eyebrow">Owner portal</p>
            <h1>Disbursements and payouts</h1>
            <p className="owner-page__sub">Recorded distributions to you. Bank connection and automatic transfers are not available in this portal.</p>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading payouts..." />
        ) : error ? (
          <div className="owner-alert" role="alert">
            {error}{' '}
            <button type="button" className="owner-small-button" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="owner-page__stats owner-page__stats--3">
              <div className="stat-card">
                <div className="stat-card__label">Next payout</div>
                <div className="stat-card__value">{next ? money(next.netAmount) : 'None scheduled'}</div>
                <div className="stat-card__meta">{next?.scheduledDate ? `Scheduled ${formatLocalDate(next.scheduledDate, { month: 'short', day: 'numeric' })}${next.payoutMethod ? ` · ${next.payoutMethod}` : ''}` : 'Payouts are scheduled after rent posts'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">Paid out in {year}</div>
                <div className="stat-card__value">{formatMoney(ytd)}</div>
                <div className="stat-card__meta">{paidThisYear.length} payout{paidThisYear.length === 1 ? '' : 's'} completed</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">Last payout</div>
                <div className="stat-card__value">{last ? money(last.netAmount) : '—'}</div>
                <div className="stat-card__meta">{last ? `${formatLocalDate(when(last), { month: 'short', day: 'numeric' })}${last.payoutMethod ? ` · ${last.payoutMethod}` : ''}` : 'No completed payouts recorded'}</div>
              </div>
            </div>

            <div className="owner-page__section-head">
              <h2>Payout history</h2>
            </div>
            {sorted.length === 0 ? (
              <div className="owner-card">
                <p className="owner-empty">No payout records are available yet.</p>
              </div>
            ) : (
              <div className="table-wrapper owner-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Scheduled / processed</th>
                      <th scope="col">Period</th>
                      <th scope="col">Rent collected</th>
                      <th scope="col">Fees</th>
                      <th scope="col">Deductions</th>
                      <th scope="col">Net</th>
                      <th scope="col">Method</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((p) => (
                      <tr key={p.id}>
                        <th scope="row">{formatLocalDate(when(p), { month: 'short', day: 'numeric', year: 'numeric' }) || 'Not recorded'}</th>
                        <td>
                          {formatLocalDate(p.payoutPeriodStart, { month: 'short', day: 'numeric' }) || 'Unknown'} to {formatLocalDate(p.payoutPeriodEnd, { month: 'short', day: 'numeric' }) || 'Unknown'}
                        </td>
                        <td>{money(p.rentCollected)}</td>
                        <td>{money(p.managementFees)}</td>
                        <td>{money(p.totalDeductions)}</td>
                        <td>{money(p.netAmount)}</td>
                        <td>{p.payoutMethod || 'Not recorded'}</td>
                        <td>
                          <span className={`tag ${statusTag[p.status] || 'tag--neutral'}`}>{p.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </LandlordLayout>
  );
};

Payouts.requireAuth = true;
Payouts.allowedRoles = ['landlord'];

export default Payouts;
