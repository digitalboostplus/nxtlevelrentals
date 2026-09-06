import Head from 'next/head';
import Link from 'next/link';
import { useMemo } from 'react';
import LandlordLayout from '@/components/Landlord/LandlordLayout';
import NetIncomeChart from '@/components/Landlord/NetIncomeChart';
import LoadingState from '@/components/common/LoadingState';
import { useAuth } from '@/context/AuthContext';
import { useLandlordData } from '@/hooks/useLandlordData';
import { formatLocalDate } from '@/lib/date';
import { formatMoney, landlordMonth, monthlyNet, type Decision, type PropertyRow, type Tone } from '@/lib/console-home';
import type { NextPageWithAuth } from '../_app';

const toneClass: Record<Tone, string> = {
  success: 'tag--success',
  warning: 'tag--warning',
  error: 'tag--error',
  info: 'tag--info',
  neutral: 'tag--neutral',
};

const monthStatusTag: Record<PropertyRow['monthStatus'], string> = {
  paid: 'tag--success',
  late: 'tag--error',
  due: 'tag--info',
  vacant: 'tag--neutral',
};

function DecisionIcon({ kind }: { kind: Decision['kind'] }) {
  if (kind === 'estimate' || kind === 'expense') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14.7 6.3a4 4 0 0 0 5 5L13 18a2.1 2.1 0 0 1-3-3l6.7-6.7Z" />
        <path d="M9 15 4.5 19.5" />
      </svg>
    );
  }
  if (kind === 'late-rent') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

const LandlordPortalPage: NextPageWithAuth = () => {
  const { profile } = useAuth();
  const { properties, leases, ledger, expenses, payouts, maintenanceRequests, loading, error } = useLandlordData();

  const now = useMemo(() => new Date(), []);
  const month = useMemo(
    () => landlordMonth({ properties, leases, ledger, expenses, payouts, maintenanceRequests, now }),
    [properties, leases, ledger, expenses, payouts, maintenanceRequests, now]
  );
  const series = useMemo(() => monthlyNet(ledger, expenses, now, 6), [ledger, expenses, now]);

  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const firstName = (profile?.displayName || '').split(' ')[0];

  return (
    <LandlordLayout title="Overview">
      <Head>
        <title>Owner Cockpit - Next Level Rentals</title>
        <meta name="description" content="What needs your decision this month, rent collected, expenses, payouts, and every home at a glance." />
      </Head>

      <div className="owner-home">
        <div className="owner-home__head">
          <div>
            <p className="section-eyebrow">Owner portal</p>
            <h1>{monthName} at a glance</h1>
            <p className="owner-home__sub">
              {firstName ? `Welcome back, ${firstName}. ` : ''}Statement period {formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1), { month: 'short', day: 'numeric' })} to{' '}
              {formatLocalDate(periodEnd, { month: 'short', day: 'numeric', year: 'numeric' })}.
              {month.total ? ` ${month.total} home${month.total === 1 ? '' : 's'}.` : ''}
            </p>
          </div>
          <div className="owner-home__actions">
            <Link href="/landlord/expenses" className="secondary-button">
              + Log expense
            </Link>
            <Link href="/landlord/financials" className="primary-button">
              Download statement
            </Link>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading your portfolio..." />
        ) : error ? (
          <div className="card" role="alert">
            {error}
          </div>
        ) : (
          <>
            <div className="owner-home__stats">
              <div className="stat-card">
                <div className="stat-card__label">Collected this month</div>
                <div className="stat-card__value">{formatMoney(month.collected)}</div>
                <div className="stat-card__meta">
                  {month.expected > 0 ? `of ${formatMoney(month.expected)} expected · ${month.collectionRate}%` : 'No active leases yet'}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">Net after expenses</div>
                <div className="stat-card__value">{formatMoney(month.net)}</div>
                <div className="stat-card__meta">{formatMoney(month.expensesThisMonth)} in paid expenses so far</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">Next payout</div>
                <div className="stat-card__value">{month.nextPayout ? formatMoney(month.nextPayout.amount) : 'None scheduled'}</div>
                <div className="stat-card__meta">
                  {month.nextPayout?.date ? `Scheduled ${formatLocalDate(month.nextPayout.date, { month: 'short', day: 'numeric' })}` : 'We schedule payouts after rent posts'}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">Occupancy</div>
                <div className="stat-card__value">
                  {month.occupied} of {month.total}
                </div>
                <div className="stat-card__meta">
                  {month.total - month.occupied === 0 ? 'Every home is leased' : `${month.total - month.occupied} vacant`}
                </div>
              </div>
            </div>

            <div className="owner-home__grid">
              <div className="card owner-home__decisions">
                <h2>Needs your decision</h2>
                {month.decisions.length === 0 ? (
                  <p className="owner-home__empty">Nothing waiting on you. Estimates, late rent, and vacancies will show up here.</p>
                ) : (
                  <ul>
                    {month.decisions.map((decision) => (
                      <li key={decision.id}>
                        <span className={`owner-home__icon owner-home__icon--${decision.tone}`} aria-hidden="true">
                          <DecisionIcon kind={decision.kind} />
                        </span>
                        <div>
                          <strong>{decision.title}</strong>
                          <span>{decision.meta}</span>
                        </div>
                        <Link href={decision.href} className={`outline-button owner-home__decision-action${decision.kind === 'estimate' ? ' owner-home__decision-action--primary' : ''}`}>
                          {decision.actionLabel}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <NetIncomeChart series={series} />
            </div>

            <div className="owner-home__table-head">
              <h2>Your homes this month</h2>
              <Link href="/landlord/properties">Manage all</Link>
            </div>
            <div className="table-wrapper">
              <table className="table owner-home__table">
                <thead>
                  <tr>
                    <th scope="col">Property</th>
                    <th scope="col">Tenant</th>
                    <th scope="col">Rent</th>
                    <th scope="col">{monthName}</th>
                    <th scope="col">Lease ends</th>
                    <th scope="col">Open work</th>
                  </tr>
                </thead>
                <tbody>
                  {month.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="owner-home__empty">
                        No properties are linked to your account yet.
                      </td>
                    </tr>
                  ) : (
                    month.rows.map((row) => (
                      <tr key={row.propertyId}>
                        <th scope="row">
                          <Link href={`/landlord/properties/${row.propertyId}`}>{row.name}</Link>
                        </th>
                        <td>{row.tenantName}</td>
                        <td>{row.rent ? `${formatMoney(row.rent)}${row.monthStatus === 'vacant' ? ' target' : ''}` : '—'}</td>
                        <td>
                          <span className={`tag ${monthStatusTag[row.monthStatus]}`}>{row.monthLabel}</span>
                        </td>
                        <td>{row.leaseEnd ? formatLocalDate(row.leaseEnd, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                        <td>{row.openWork > 0 ? `${row.openWork} open` : 'None'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .owner-home {
          padding: 2rem 2.5rem 3rem;
          display: grid;
          gap: 1.75rem;
        }

        .owner-home__head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .owner-home__head h1 {
          font-size: clamp(1.8rem, 3vw, 2.15rem);
          line-height: 1.1;
          margin: 0.35rem 0 0.25rem;
          color: var(--color-text-secondary);
        }

        .owner-home__sub {
          color: var(--color-muted);
          font-size: 0.95rem;
        }

        .owner-home__actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .owner-home__stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1.25rem;
        }

        .owner-home__grid {
          display: grid;
          grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
          gap: 1.5rem;
          align-items: start;
        }

        .owner-home__decisions {
          display: grid;
          gap: 1rem;
        }

        .owner-home__decisions h2,
        .owner-home__table-head h2 {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .owner-home__decisions ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.75rem;
        }

        .owner-home__decisions li {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: var(--radius-md);
          background: var(--color-background);
          border: 1px solid var(--color-border);
        }

        .owner-home__decisions li > div {
          flex: 1;
          display: grid;
          gap: 0.15rem;
          min-width: 0;
        }

        .owner-home__decisions strong {
          font-size: 0.95rem;
          color: var(--color-text);
        }

        .owner-home__decisions li > div span {
          font-size: 0.85rem;
          color: var(--color-muted);
        }

        .owner-home__icon {
          flex: none;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--tag-neutral-bg);
          color: var(--tag-neutral-text);
        }

        .owner-home__icon--warning {
          background: var(--tag-warning-bg);
          color: var(--tag-warning-text);
        }

        .owner-home__icon--error {
          background: var(--tag-error-bg);
          color: var(--tag-error-text);
        }

        .owner-home__icon--info {
          background: var(--tag-info-bg);
          color: var(--tag-info-text);
        }

        .owner-home__decisions :global(.owner-home__decision-action) {
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          white-space: nowrap;
        }

        .owner-home__decisions :global(.owner-home__decision-action--primary) {
          background: var(--color-primary);
          color: var(--color-background);
          border-color: var(--color-primary);
        }

        .owner-home__empty {
          color: var(--color-muted);
          font-size: 0.95rem;
        }

        .owner-home__table-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: -0.75rem;
        }

        .owner-home__table-head :global(a) {
          font-weight: 600;
          font-size: 0.9rem;
        }

        /* The global sticky header offsets by the site header height, which
           overlaps the first row inside a card. Keep it static here. */
        .owner-home__table thead th {
          position: static;
        }

        .owner-home__table th[scope='row'] {
          font-weight: 600;
        }

        .owner-home__table th[scope='row'] :global(a) {
          color: var(--color-text);
        }

        .owner-home__table th[scope='row'] :global(a:hover) {
          color: var(--color-primary);
        }

        .owner-home__table td {
          color: var(--color-muted);
        }

        @media (max-width: 1100px) {
          .owner-home__stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .owner-home__grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .owner-home {
            padding: 1.5rem 1.25rem 2.5rem;
          }

          .owner-home__stats {
            grid-template-columns: 1fr;
          }

          .owner-home__decisions li {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </LandlordLayout>
  );
};

LandlordPortalPage.requireAuth = true;
LandlordPortalPage.allowedRoles = ['landlord', 'admin', 'super-admin'];

export default LandlordPortalPage;
