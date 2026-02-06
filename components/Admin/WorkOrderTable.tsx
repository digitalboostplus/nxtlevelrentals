import type { WorkOrder } from '@/data/admin';

import { formatLocalDate } from '@/lib/date';

type WorkOrderTableProps = {
  workOrders: WorkOrder[];
};

export default function WorkOrderTable({ workOrders }: WorkOrderTableProps) {
  return (
    <section className="section">
      <div className="section__inner">
        <div className="card__header" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card__title">High-priority work orders</h2>
          <p style={{ color: 'var(--color-muted)' }}>Coordinate with vendors to resolve issues before SLA breaches.</p>
        </div>
        <div className="table-wrapper" role="region" aria-live="polite">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Ticket</th>
                <th scope="col">Unit</th>
                <th scope="col">Submitted</th>
                <th scope="col">Status</th>
                <th scope="col">Priority</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((order) => (
                <tr key={order.id}>
                  <th scope="row">{order.summary}</th>
                  <td>{order.unit}</td>
                  <td>{formatLocalDate(order.submittedOn)}</td>
                  <td>{order.status}</td>
                  <td>
                    <span className={`tag ${order.priority === 'High' ? 'tag--warning' : 'tag--info'}`}>
                      {order.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <style jsx>{`
        .table-wrapper {
          overflow-x: auto;
          border-radius: var(--radius-md);
          border: 1px solid rgba(15, 118, 110, 0.12);
          background: var(--color-surface);
          box-shadow: var(--shadow-sm);
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 640px;
        }

        th,
        td {
          padding: 1.15rem 1.35rem;
          text-align: left;
        }

        thead tr {
          border-bottom: 1px solid rgba(15, 118, 110, 0.12);
          background: var(--color-surface-elevated);
        }

        thead th {
          position: sticky;
          top: var(--header-height);
          z-index: 1;
        }

        tbody tr:nth-child(even) {
          background: rgba(15, 118, 110, 0.04);
        }

        tbody tr + tr {
          border-top: 1px solid rgba(15, 118, 110, 0.08);
        }

        th {
          font-size: 0.85rem;
          color: var(--color-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        tbody th {
          color: var(--color-text);
          font-size: 1rem;
          text-transform: none;
          letter-spacing: normal;
        }
      `}</style>
    </section>
  );
}
