import { useMemo } from 'react';
import type { MaintenanceRequest } from '@/types/maintenance';

import { formatLocalDate } from '@/lib/date';

type FrontendStatus = 'Open' | 'In Progress' | 'Resolved';

type MaintenanceRequestsProps = {
  requests: MaintenanceRequest[];
  activeStatus: FrontendStatus | 'All';
  onStatusChange: (status: FrontendStatus | 'All') => void;
};

const getFrontendStatus = (status: MaintenanceRequest['status']): FrontendStatus => {
  switch (status) {
    case 'submitted': return 'Open';
    case 'in_progress': return 'In Progress';
    case 'completed':
    case 'cancelled': return 'Resolved';
    default: return 'Open';
  }
};

const statusColors: Record<FrontendStatus, string> = {
  Open: 'tag tag--warning',
  'In Progress': 'tag tag--info',
  Resolved: 'tag tag--success'
};

export default function MaintenanceRequests({ requests, activeStatus, onStatusChange }: MaintenanceRequestsProps) {
  const filtered = useMemo(() => {
    if (activeStatus === 'All') return requests;
    return requests.filter((request) => getFrontendStatus(request.status) === activeStatus);
  }, [requests, activeStatus]);

  const openCount = requests.filter((request) => getFrontendStatus(request.status) !== 'Resolved').length;

  return (
    <section className="section section--muted">
      <div className="section__inner">
        <div className="card__header" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card__title">Maintenance requests</h2>
          <span className="tag tag--info">{openCount} active</span>
        </div>
        <div className="filter-controls" role="tablist" aria-label="Maintenance status filters">
          {(['All', 'Open', 'In Progress', 'Resolved'] as const).map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={activeStatus === status}
              className={`filter-chip${activeStatus === status ? ' filter-chip--active' : ''}`}
              onClick={() => onStatusChange(status)}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="maintenance-grid">
          {filtered.length === 0 ? (
            <p style={{ gridColumn: '1 / -1', color: 'var(--color-muted)' }}>No requests matching this status.</p>
          ) : null}
          {filtered.map((request) => {
            const displayStatus = getFrontendStatus(request.status);
            return (
              <article className="maintenance-card" key={request.id}>
                <div className="maintenance-card__meta">
                  <span>{formatLocalDate(new Date(request.createdAt).toISOString())}</span>
                  <span className={statusColors[displayStatus]}>{displayStatus}</span>
                </div>
                <h3 className="maintenance-card__title">{request.title}</h3>
                <p className="maintenance-card__description">{request.description}</p>
                <div className="maintenance-card__foot">
                  <span>Priority: {request.priority}</span>
                  {/* {request.category ? <span>Category: {request.category}</span> : null} */}
                  {/* Category exists in type but maybe not fully populated in new schema yet, safe to check */}
                </div>
              </article>
            )
          })}
        </div>
      </div>
      <style jsx>{`
        .maintenance-card__foot {
          display: flex;
          justify-content: space-between;
          color: var(--color-muted);
          font-size: 0.9rem;
          margin-top: 1rem;
        }

        @media (max-width: 520px) {
          .maintenance-card__foot {
            flex-direction: column;
            gap: 0.35rem;
          }
        }
      `}</style>
    </section>
  );
}
