import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import AddTenantModal from '@/components/Admin/AddTenantModal';
import RecordPaymentModal from '@/components/Admin/RecordPaymentModal';
import LoadingState from '@/components/common/LoadingState';
import { useAuth } from '@/context/AuthContext';
import { adminUtils, maintenanceUtils, rentTrackingUtils } from '@/lib/firebase-utils';
import { leaseUtils } from '@/lib/leases';
import { formatLocalDate, normalizeDate } from '@/lib/date';
import {
  averageDaysToClose,
  daysBetween,
  formatMoney,
  greeting,
  isOpenRequest,
  leasesEndingWithin,
  requestAge,
  sortOpenWorkOrders,
} from '@/lib/console-home';
import type { Lease, MaintenanceRequest } from '@/types/schema';
import type { NextPageWithAuth } from '../_app';

type RentStatus = {
  propertyId: string;
  propertyName: string;
  tenantId: string;
  tenantName: string;
  dueDate: Date;
  status: 'paid' | 'pending' | 'partial' | 'overdue';
  amountPaid: number;
  amountDue: number;
};

type PublicRequest = MaintenanceRequest & { source?: string; tenantName?: string; addressText?: string };

type QueueRow = {
  id: string;
  count: number;
  title: string;
  meta: string;
  tone: 'error' | 'warning' | 'info' | 'neutral';
  action: string;
  href: string;
};

const priorityTag: Record<string, string> = {
  urgent: 'tag--error',
  high: 'tag--warning',
  medium: 'tag--info',
  low: 'tag--neutral',
};

const statusLabel: Record<string, string> = {
  submitted: 'Submitted',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const AdminPage: NextPageWithAuth = () => {
  const { user, profile } = useAuth();
  const [rentStatuses, setRentStatuses] = useState<RentStatus[]>([]);
  const [requests, setRequests] = useState<PublicRequest[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [tenantNames, setTenantNames] = useState<Record<string, string>>({});
  const [rentRoll, setRentRoll] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [statuses, allRequests, activeLeases, tenants, stats] = await Promise.all([
        rentTrackingUtils.getAllPropertiesRentStatus(),
        maintenanceUtils.getAllRequests(),
        leaseUtils.getActiveLeases(),
        adminUtils.getAllTenants(),
        adminUtils.getPortfolioStats(),
      ]);
      setRentStatuses(statuses as RentStatus[]);
      setRequests(allRequests as unknown as PublicRequest[]);
      setLeases(activeLeases);
      setTenantNames(Object.fromEntries((tenants as { id: string; displayName?: string }[]).map((t) => [t.id, t.displayName || ''])));
      setRentRoll(stats.totalRentValue || 0);
    } catch (error) {
      console.error('Failed to load admin dashboard:', error);
      setLoadError('We could not load the dashboard. Refresh to try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/sync-ghl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Sync failed');
      setSyncMessage(data.message || 'Sync complete');
      await refreshData();
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const now = useMemo(() => new Date(), []);

  const rent = useMemo(() => {
    const counts = { paid: 0, pending: 0, partial: 0, overdue: 0 };
    let collected = 0;
    let expected = 0;
    for (const status of rentStatuses) {
      if (status.status in counts) counts[status.status] += 1;
      collected += status.amountPaid || 0;
      expected += status.amountDue || 0;
    }
    const total = rentStatuses.length;
    return {
      counts,
      collected,
      expected,
      outstanding: Math.max(0, expected - collected),
      rate: expected > 0 ? Math.round((collected / expected) * 100) : 0,
      total,
      vacant: rentStatuses.filter((status) => !status.tenantId).length,
    };
  }, [rentStatuses]);

  const propertyName = useCallback(
    (propertyId: string) => rentStatuses.find((status) => status.propertyId === propertyId)?.propertyName || (propertyId === 'unassigned' ? 'Not linked' : propertyId),
    [rentStatuses]
  );

  // Public-form requests carry the address the tenant typed; matched ones map to a property.
  const requestPlace = useCallback(
    (request: PublicRequest) => request.propertyName || (request.propertyId !== 'unassigned' ? propertyName(request.propertyId) : request.addressText || 'Not linked'),
    [propertyName]
  );

  const tenantLabel = useCallback(
    (request: PublicRequest) => {
      if (request.tenantId === 'public') return 'Unmatched';
      return request.tenantName || tenantNames[request.tenantId] || 'Tenant';
    },
    [tenantNames]
  );

  const openRequests = useMemo(() => sortOpenWorkOrders(requests), [requests]);
  const newRequests = useMemo(() => requests.filter((r) => r.status === 'submitted'), [requests]);
  const publicRequests = useMemo(
    () =>
      requests
        .filter((r) => r.source === 'public-form')
        .sort((a, b) => (normalizeDate(b.createdAt)?.getTime() ?? 0) - (normalizeDate(a.createdAt)?.getTime() ?? 0))
        .slice(0, 3),
    [requests]
  );
  const unmatchedCount = useMemo(() => requests.filter((r) => r.tenantId === 'public' && isOpenRequest(r)).length, [requests]);
  const endingLeases = useMemo(() => leasesEndingWithin(leases, 120, now), [leases, now]);
  const avgClose = useMemo(() => averageDaysToClose(requests), [requests]);

  const queue = useMemo<QueueRow[]>(() => {
    const rows: QueueRow[] = [];
    const overdue = rentStatuses.filter((status) => status.status === 'overdue' || status.status === 'partial');
    if (overdue.length > 0) {
      rows.push({
        id: 'overdue',
        count: overdue.length,
        title: 'Rent follow-ups',
        meta: overdue
          .slice(0, 3)
          .map((status) => {
            const late = status.dueDate ? daysBetween(normalizeDate(status.dueDate) ?? now, now) : 0;
            return `${status.propertyName}${status.status === 'partial' ? ` (partial, ${formatMoney(status.amountDue - status.amountPaid)} short)` : late > 0 ? ` (${late} day${late === 1 ? '' : 's'})` : ''}`;
          })
          .join(', ') + (overdue.length > 3 ? `, and ${overdue.length - 3} more` : ''),
        tone: 'error',
        action: 'Open rent tracking',
        href: '/admin/rent-payments',
      });
    }
    if (newRequests.length > 0) {
      const high = newRequests.filter((r) => ['high', 'urgent'].includes(String(r.priority).toLowerCase()));
      rows.push({
        id: 'new-requests',
        count: newRequests.length,
        title: 'New maintenance requests to assign',
        meta: high.length > 0 ? `${high.length} marked high: ${high.slice(0, 2).map((r) => `${r.title} at ${requestPlace(r)}`).join('; ')}` : newRequests.slice(0, 2).map((r) => r.title).join(', '),
        tone: 'warning',
        action: 'Assign',
        href: '/admin/maintenance',
      });
    }
    if (endingLeases.length > 0) {
      rows.push({
        id: 'leases',
        count: endingLeases.length,
        title: 'Leases ending within 120 days',
        meta: endingLeases
          .slice(0, 3)
          .map((lease) => `${lease.propertyName || propertyName(lease.propertyId)} (${formatLocalDate(lease.endDate, { month: 'short', day: 'numeric' })})`)
          .join(', '),
        tone: 'info',
        action: 'Start renewals',
        href: '/admin/tenants',
      });
    }
    if (unmatchedCount > 0) {
      rows.push({
        id: 'unmatched',
        count: unmatchedCount,
        title: 'Public requests not linked to a tenant',
        meta: 'Submitted from the website without a matching email or phone. Link each one to a tenant record.',
        tone: 'neutral',
        action: 'Review',
        href: '/admin/maintenance',
      });
    }
    return rows;
  }, [rentStatuses, newRequests, endingLeases, unmatchedCount, now, propertyName, requestPlace]);

  const firstName = (profile?.displayName || '').split(' ')[0];
  const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });

  return (
    <AdminLayout title="Dashboard">
      <Head>
        <title>Admin Dashboard - Next Level Rentals</title>
      </Head>

      <AddTenantModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={refreshData} />
      <RecordPaymentModal isOpen={isRecordPaymentModalOpen} onClose={() => setIsRecordPaymentModalOpen(false)} onSuccess={refreshData} />

      <div className="admin-home">
        <div className="admin-home__head">
          <div>
            <p className="section-eyebrow">{profile?.role === 'super-admin' ? 'Super admin' : 'Admin'}</p>
            <h1>
              {greeting(now)}
              {firstName ? `, ${firstName}` : ''}.
            </h1>
            <p className="admin-home__sub">
              {today}
              {!loading && !loadError ? ` · ${queue.length === 0 ? 'Queue is clear' : `${queue.length} thing${queue.length === 1 ? '' : 's'} need a decision today`} · ${rent.total} home${rent.total === 1 ? '' : 's'}, ${rent.total - rent.vacant} occupied` : ''}
            </p>
          </div>
          <div className="admin-home__actions">
            <button type="button" className="outline-button" onClick={() => setIsAddModalOpen(true)}>
              Add tenant
            </button>
            <button type="button" className="outline-button" onClick={() => void handleSync()} disabled={syncing}>
              {syncing ? 'Syncing...' : 'Sync from GHL'}
            </button>
            <button type="button" className="primary-button" onClick={() => setIsRecordPaymentModalOpen(true)}>
              Record payment
            </button>
          </div>
        </div>
        {syncMessage ? (
          <p className="admin-home__sync" role="status">
            {syncMessage}
          </p>
        ) : null}

        {loading ? (
          <LoadingState message="Loading the dashboard..." />
        ) : loadError ? (
          <div className="card" role="alert">
            {loadError}
          </div>
        ) : (
          <>
            <div className="card admin-home__rent">
              <div className="admin-home__rent-hero">
                <span className="stat-card__label">Rent collected, {monthName}</span>
                <div className="admin-home__rent-figure">
                  <span className="admin-home__rent-rate">{rent.rate}%</span>
                  <span className="admin-home__rent-of">
                    {formatMoney(rent.collected)} of {formatMoney(rent.expected)}
                  </span>
                </div>
                <span className="admin-home__rent-note">
                  {rent.outstanding > 0
                    ? `${formatMoney(rent.outstanding)} outstanding across ${rent.counts.overdue + rent.counts.partial + rent.counts.pending} home${rent.counts.overdue + rent.counts.partial + rent.counts.pending === 1 ? '' : 's'}.`
                    : 'Everything expected this month has been collected.'}
                </span>
                <Link href="/admin/rent-payments">Open rent tracking</Link>
              </div>
              <div className="admin-home__rent-status">
                <span className="admin-home__rent-status-title">
                  Status of {rent.total} home{rent.total === 1 ? '' : 's'}
                </span>
                <div
                  className="admin-home__bar"
                  role="img"
                  aria-label={`Paid ${rent.counts.paid}, pending ${rent.counts.pending}, partial ${rent.counts.partial}, overdue ${rent.counts.overdue}`}
                >
                  {rent.counts.paid > 0 ? <span style={{ flex: rent.counts.paid, background: 'var(--color-success)' }} /> : null}
                  {rent.counts.pending > 0 ? <span style={{ flex: rent.counts.pending, background: 'var(--color-info)' }} /> : null}
                  {rent.counts.partial > 0 ? <span style={{ flex: rent.counts.partial, background: 'var(--color-warning)' }} /> : null}
                  {rent.counts.overdue > 0 ? <span style={{ flex: rent.counts.overdue, background: 'var(--color-error)' }} /> : null}
                  {rent.total === 0 ? <span style={{ flex: 1, background: 'var(--color-border)' }} /> : null}
                </div>
                <div className="admin-home__legend">
                  <span>
                    <i style={{ background: 'var(--color-success)' }} />Paid <strong>{rent.counts.paid}</strong>
                  </span>
                  <span>
                    <i style={{ background: 'var(--color-info)' }} />Pending <strong>{rent.counts.pending}</strong>
                  </span>
                  <span>
                    <i style={{ background: 'var(--color-warning)' }} />Partial <strong>{rent.counts.partial}</strong>
                  </span>
                  <span>
                    <i style={{ background: 'var(--color-error)' }} />Overdue <strong>{rent.counts.overdue}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="admin-home__grid">
              <div className="card admin-home__queue">
                <h2>Today&apos;s queue</h2>
                {queue.length === 0 ? (
                  <p className="admin-home__empty">Nothing needs a decision right now.</p>
                ) : (
                  <ul>
                    {queue.map((row) => (
                      <li key={row.id}>
                        <span className={`admin-home__count admin-home__count--${row.tone}`}>{row.count}</span>
                        <div>
                          <strong>{row.title}</strong>
                          <span>{row.meta}</span>
                        </div>
                        <Link href={row.href} className={`outline-button admin-home__queue-action${row.tone === 'error' ? ' admin-home__queue-action--primary' : ''}`}>
                          {row.action}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="admin-home__side">
                <div className="card admin-home__public">
                  <div className="admin-home__card-head">
                    <h2>New from the public form</h2>
                    {publicRequests.length > 0 ? <span className="tag tag--info">{publicRequests.length} recent</span> : null}
                  </div>
                  {publicRequests.length === 0 ? (
                    <p className="admin-home__empty">Requests sent from the website without a login will show up here.</p>
                  ) : (
                    <ul>
                      {publicRequests.map((request) => {
                        const matched = request.tenantId !== 'public';
                        return (
                          <li key={request.id} className={matched ? '' : 'admin-home__public--unmatched'}>
                            <div className="admin-home__public-head">
                              <strong>{request.title}</strong>
                              <span>{requestAge(request, now)} ago</span>
                            </div>
                            <span className="admin-home__public-meta">
                              {requestPlace(request)} · {String(request.priority)}
                              {request.images?.length ? ` · ${request.images.length} photo${request.images.length === 1 ? '' : 's'}` : ''}
                            </span>
                            <div className="admin-home__public-foot">
                              <span className={`tag ${matched ? 'tag--success' : 'tag--warning'}`}>
                                {matched ? `Matched to ${tenantLabel(request)}` : 'Unmatched'}
                              </span>
                              <Link href="/admin/maintenance">{matched ? 'Open' : 'Link to tenant'}</Link>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="card admin-home__snapshot">
                  <div>
                    <span className="stat-card__label">Rent roll</span>
                    <strong>{formatMoney(rentRoll)}</strong>
                  </div>
                  <div>
                    <span className="stat-card__label">Vacant</span>
                    <strong>
                      {rent.vacant} <small>of {rent.total}</small>
                    </strong>
                  </div>
                  <div>
                    <span className="stat-card__label">Open work orders</span>
                    <strong>{openRequests.length}</strong>
                  </div>
                  <div>
                    <span className="stat-card__label">Avg. days to close</span>
                    <strong>{avgClose === null ? '—' : avgClose}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-home__table-head">
              <h2>Open work orders</h2>
              <Link href="/admin/maintenance">Open maintenance</Link>
            </div>
            <div className="table-wrapper">
              <table className="table admin-home__table">
                <thead>
                  <tr>
                    <th scope="col">Ticket</th>
                    <th scope="col">Property</th>
                    <th scope="col">Tenant</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Status</th>
                    <th scope="col">Assigned</th>
                    <th scope="col">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {openRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="admin-home__empty">
                        No open work orders.
                      </td>
                    </tr>
                  ) : (
                    openRequests.slice(0, 6).map((request) => (
                      <tr key={request.id}>
                        <th scope="row">{request.title}</th>
                        <td>{requestPlace(request)}</td>
                        <td className={request.tenantId === 'public' ? 'admin-home__unmatched' : ''}>{tenantLabel(request)}</td>
                        <td>
                          <span className={`tag ${priorityTag[String(request.priority).toLowerCase()] || 'tag--neutral'}`}>{String(request.priority)}</span>
                        </td>
                        <td>
                          {statusLabel[request.status] || request.status}
                          {request.scheduledDate ? ` · ${formatLocalDate(request.scheduledDate, { month: 'short', day: 'numeric' })}` : ''}
                        </td>
                        <td>{request.assignedVendorName || '—'}</td>
                        <td>{requestAge(request, now)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {openRequests.length > 6 ? (
                <div className="admin-home__table-foot">
                  Showing 6 of {openRequests.length} · <Link href="/admin/maintenance">See all</Link>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .admin-home {
          padding: 2rem 2.5rem 3rem;
          display: grid;
          gap: 1.75rem;
        }

        .admin-home__head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .admin-home__head h1 {
          font-size: clamp(1.8rem, 3vw, 2.15rem);
          line-height: 1.1;
          margin: 0.35rem 0 0.25rem;
          color: var(--color-text-secondary);
        }

        .admin-home__sub {
          color: var(--color-muted);
          font-size: 0.95rem;
        }

        .admin-home__actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .admin-home__sync {
          margin-top: -1rem;
          color: var(--color-muted);
          font-size: 0.9rem;
        }

        .admin-home__rent {
          display: grid;
          grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
          gap: 2.5rem;
          align-items: center;
        }

        .admin-home__rent-hero {
          display: grid;
          gap: 0.5rem;
        }

        .admin-home__rent-hero :global(.stat-card__label),
        .admin-home__snapshot :global(.stat-card__label) {
          margin: 0;
        }

        .admin-home__rent-figure {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .admin-home__rent-rate {
          font-size: clamp(2.5rem, 5vw, 3rem);
          font-weight: 700;
          line-height: 1;
          color: var(--color-text);
        }

        .admin-home__rent-of,
        .admin-home__rent-note {
          color: var(--color-muted);
          font-size: 0.95rem;
        }

        .admin-home__rent-hero :global(a),
        .admin-home__table-head :global(a),
        .admin-home__public :global(a),
        .admin-home__table-foot :global(a) {
          font-weight: 600;
          font-size: 0.9rem;
        }

        .admin-home__rent-status {
          display: grid;
          gap: 0.9rem;
        }

        .admin-home__rent-status-title {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--color-text);
        }

        .admin-home__bar {
          display: flex;
          gap: 2px;
          height: 28px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--color-background);
        }

        .admin-home__bar span {
          display: block;
          min-width: 6px;
        }

        .admin-home__legend {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
          font-size: 0.9rem;
          color: var(--color-muted);
        }

        .admin-home__legend span {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .admin-home__legend i {
          width: 10px;
          height: 10px;
          border-radius: 3px;
          display: inline-block;
        }

        .admin-home__legend strong {
          color: var(--color-text);
        }

        .admin-home__grid {
          display: grid;
          grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
          gap: 1.5rem;
          align-items: start;
        }

        .admin-home__queue,
        .admin-home__public {
          display: grid;
          gap: 1rem;
        }

        .admin-home__queue h2,
        .admin-home__public h2,
        .admin-home__table-head h2 {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .admin-home__queue ul,
        .admin-home__public ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.75rem;
        }

        .admin-home__queue li {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: var(--radius-md);
          background: var(--color-background);
          border: 1px solid var(--color-border);
        }

        .admin-home__queue li > div {
          flex: 1;
          display: grid;
          gap: 0.15rem;
          min-width: 0;
        }

        .admin-home__queue strong {
          font-size: 0.95rem;
          color: var(--color-text);
        }

        .admin-home__queue li > div span {
          font-size: 0.85rem;
          color: var(--color-muted);
        }

        .admin-home__count {
          flex: none;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.05rem;
          background: var(--tag-neutral-bg);
          color: var(--tag-neutral-text);
        }

        .admin-home__count--error {
          background: var(--tag-error-bg);
          color: var(--tag-error-text);
        }

        .admin-home__count--warning {
          background: var(--tag-warning-bg);
          color: var(--tag-warning-text);
        }

        .admin-home__count--info {
          background: var(--tag-info-bg);
          color: var(--tag-info-text);
        }

        .admin-home__queue :global(.admin-home__queue-action) {
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          white-space: nowrap;
        }

        .admin-home__queue :global(.admin-home__queue-action--primary) {
          background: var(--color-primary);
          color: var(--color-background);
          border-color: var(--color-primary);
        }

        .admin-home__empty {
          color: var(--color-muted);
          font-size: 0.95rem;
        }

        .admin-home__side {
          display: grid;
          gap: 1.5rem;
        }

        .admin-home__card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .admin-home__public li {
          display: grid;
          gap: 0.4rem;
          padding: 0.9rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          background: var(--color-background);
        }

        .admin-home__public--unmatched {
          border-color: rgba(247, 183, 51, 0.35) !important;
        }

        .admin-home__public-head {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .admin-home__public-head strong {
          font-size: 0.9rem;
          color: var(--color-text);
        }

        .admin-home__public-head span,
        .admin-home__public-meta {
          font-size: 0.8rem;
          color: var(--color-muted);
        }

        .admin-home__public-foot {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
        }

        .admin-home__snapshot {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .admin-home__snapshot > div {
          display: grid;
          gap: 0.15rem;
        }

        .admin-home__snapshot strong {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--color-text);
        }

        .admin-home__snapshot small {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--color-muted);
        }

        .admin-home__table-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: -0.75rem;
        }

        /* The global sticky header offsets by the site header height, which
           overlaps the first row inside a card. Keep it static here. */
        .admin-home__table thead th {
          position: static;
        }

        .admin-home__table th[scope='row'] {
          font-weight: 600;
          color: var(--color-text);
        }

        .admin-home__table td {
          color: var(--color-muted);
        }

        .admin-home__unmatched {
          color: var(--tag-warning-text) !important;
        }

        .admin-home__table-foot {
          padding: 0.75rem 1rem;
          border-top: 1px solid var(--color-border);
          font-size: 0.85rem;
          color: var(--color-muted);
        }

        @media (max-width: 1100px) {
          .admin-home__rent,
          .admin-home__grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .admin-home {
            padding: 1.5rem 1.25rem 2.5rem;
          }

          .admin-home__queue li {
            flex-wrap: wrap;
          }

          .admin-home__snapshot {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

AdminPage.requireAuth = true;
AdminPage.allowedRoles = ['admin', 'super-admin'];

export default AdminPage;
