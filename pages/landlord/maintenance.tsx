import Head from 'next/head';
import { useMemo, useState } from 'react';
import LandlordLayout from '@/components/Landlord/LandlordLayout';
import LoadingState from '@/components/common/LoadingState';
import PrivateFile from '@/components/common/PrivateFile';
import { company } from '@/data/site';
import { useLandlordData } from '@/hooks/useLandlordData';
import { formatLocalDate, normalizeDate } from '@/lib/date';
import { formatMoney, isOpenRequest, sortOpenWorkOrders } from '@/lib/console-home';
import type { NextPageWithAuth } from '../_app';

type Filter = 'all' | 'decision' | 'open' | 'resolved';

const priorityTag: Record<string, string> = {
  emergency: 'tag--error',
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

const LandlordMaintenancePage: NextPageWithAuth = () => {
  const { maintenanceRequests, properties, loading, error, refresh } = useLandlordData();
  const [filter, setFilter] = useState<Filter>('all');
  const [propertyFilter, setPropertyFilter] = useState('all');

  const propertyName = (id: string) => properties.find((p) => p.id === id)?.name || 'Property';
  const needsDecision = useMemo(() => maintenanceRequests.filter((r) => isOpenRequest(r) && r.estimatedCost && !r.actualCost), [maintenanceRequests]);

  const rows = useMemo(() => {
    const scoped = maintenanceRequests.filter((r) => propertyFilter === 'all' || r.propertyId === propertyFilter);
    const open = sortOpenWorkOrders(scoped);
    const resolved = scoped
      .filter((r) => !isOpenRequest(r))
      .sort((a, b) => (normalizeDate(b.updatedAt)?.getTime() ?? 0) - (normalizeDate(a.updatedAt)?.getTime() ?? 0));
    if (filter === 'open') return open;
    if (filter === 'resolved') return resolved;
    if (filter === 'decision') return open.filter((r) => r.estimatedCost && !r.actualCost);
    return [...open, ...resolved];
  }, [maintenanceRequests, propertyFilter, filter]);

  const counts = {
    all: maintenanceRequests.length,
    decision: needsDecision.length,
    open: maintenanceRequests.filter(isOpenRequest).length,
    resolved: maintenanceRequests.filter((r) => !isOpenRequest(r)).length,
  };

  return (
    <LandlordLayout title="Maintenance">
      <Head>
        <title>Maintenance - Owner Portal</title>
      </Head>

      <div className="owner-page">
        <div className="owner-page__head">
          <div>
            <p className="section-eyebrow">Owner portal</p>
            <h1>Maintenance</h1>
            <p className="owner-page__sub">Repair requests across your homes, who is on them, and what they cost. Estimates wait here for your decision.</p>
          </div>
          <div className="owner-page__actions">
            <a href={`mailto:${company.email}?subject=${encodeURIComponent('Work request from owner')}`} className="outline-button">
              Request work
            </a>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading work orders..." />
        ) : error ? (
          <div className="owner-alert" role="alert">
            {error}{' '}
            <button type="button" className="owner-small-button" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="maint__filters">
              <div className="owner-page__chips" role="tablist" aria-label="Filter maintenance">
                {(
                  [
                    ['all', `All ${counts.all}`],
                    ['decision', `Needs decision ${counts.decision}`],
                    ['open', `Open ${counts.open}`],
                    ['resolved', `Resolved ${counts.resolved}`],
                  ] as [Filter, string][]
                ).map(([key, label]) => (
                  <button key={key} type="button" role="tab" aria-selected={filter === key} className={`filter-chip${filter === key ? ' filter-chip--active' : ''}`} onClick={() => setFilter(key)}>
                    {label}
                  </button>
                ))}
              </div>
              <select className="owner-select" value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} aria-label="Filter by property">
                <option value="all">All properties ({properties.length})</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {needsDecision.length > 0 && filter !== 'resolved' ? (
              <div className="owner-card">
                <h2>Needs your decision</h2>
                <ul className="owner-list">
                  {needsDecision.map((request) => (
                    <li key={request.id}>
                      <div className="owner-list__text">
                        <strong>
                          Approve repair estimate: {formatMoney(request.estimatedCost || 0)} {request.title.toLowerCase()}
                        </strong>
                        <span>
                          {propertyName(request.propertyId)}
                          {request.assignedVendorName ? ` · Quote from ${request.assignedVendorName}` : ''}
                        </span>
                      </div>
                      <a
                        className="owner-small-button owner-small-button--primary"
                        href={`mailto:${company.email}?subject=${encodeURIComponent(`Approved: ${request.title} at ${propertyName(request.propertyId)} (${formatMoney(request.estimatedCost || 0)})`)}`}
                      >
                        Approve by email
                      </a>
                      <a className="owner-small-button" href={`mailto:${company.email}?subject=${encodeURIComponent(`Question about: ${request.title} at ${propertyName(request.propertyId)}`)}`}>
                        Ask a question
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="owner-note">Approvals are confirmed by management and recorded on the ticket. Call {company.phoneDisplay} for anything urgent.</p>
              </div>
            ) : null}

            {rows.length === 0 ? (
              <div className="owner-card">
                <p className="owner-empty">{maintenanceRequests.length === 0 ? 'No maintenance requests have been recorded for your homes.' : 'No tickets match this filter.'}</p>
              </div>
            ) : (
              <div className="table-wrapper owner-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Ticket</th>
                      <th scope="col">Property</th>
                      <th scope="col">Priority</th>
                      <th scope="col">Status</th>
                      <th scope="col">Vendor</th>
                      <th scope="col">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((request) => (
                      <tr key={request.id}>
                        <th scope="row">
                          {request.title}
                          {request.fileIds?.length ? (
                            <span className="maint__files">
                              {request.fileIds.map((id) => (
                                <PrivateFile key={id} id={id} />
                              ))}
                            </span>
                          ) : null}
                        </th>
                        <td>{propertyName(request.propertyId)}</td>
                        <td>
                          <span className={`tag ${priorityTag[String(request.priority).toLowerCase()] || 'tag--neutral'}`}>{String(request.priority)}</span>
                        </td>
                        <td>
                          {request.estimatedCost && !request.actualCost && isOpenRequest(request)
                            ? 'Awaiting your approval'
                            : statusLabel[request.status] || request.status}
                          {request.scheduledDate ? ` · ${formatLocalDate(request.scheduledDate, { month: 'short', day: 'numeric' })}${request.scheduledTime ? ` ${request.scheduledTime}` : ''}` : ''}
                          {!isOpenRequest(request) && request.updatedAt ? ` · ${formatLocalDate(request.updatedAt, { month: 'short', day: 'numeric' })}` : ''}
                        </td>
                        <td>{request.assignedVendorName || '—'}</td>
                        <td>{request.actualCost ? formatMoney(request.actualCost) : request.estimatedCost ? `${formatMoney(request.estimatedCost)} est.` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .maint__filters {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .maint__files {
          display: block;
          font-weight: 400;
          margin-top: 0.25rem;
        }
      `}</style>
    </LandlordLayout>
  );
};

LandlordMaintenancePage.requireAuth = true;
LandlordMaintenancePage.allowedRoles = ['landlord', 'admin', 'super-admin'];

export default LandlordMaintenancePage;
