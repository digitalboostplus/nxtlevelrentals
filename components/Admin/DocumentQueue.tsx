import type { DocumentTask } from '@/data/admin';

import { formatLocalDate } from '@/lib/date';

type DocumentQueueProps = {
  tasks: DocumentTask[];
};

export default function DocumentQueue({ tasks }: DocumentQueueProps) {
  return (
    <section className="section">
      <div className="section__inner">
        <div className="card__header" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card__title">Document queue</h2>
          <p style={{ color: 'var(--color-muted)' }}>Approve renewals and compliance uploads awaiting your review.</p>
        </div>
        <div className="document-queue">
          {tasks.map((task) => (
            <article key={task.id} className={`document-queue__item document-queue__item--${task.status.replace(/\s/g, '').toLowerCase()}`}>
              <div className="document-queue__header">
                <h3>{task.title}</h3>
                <span className="tag tag--info">{task.status}</span>
              </div>
              <dl>
                <div>
                  <dt>Owner</dt>
                  <dd>{task.owner}</dd>
                </div>
                <div>
                  <dt>Received</dt>
                  <dd>{formatLocalDate(task.receivedOn)}</dd>
                </div>
              </dl>
              <div className="document-queue__actions">
                <button className="primary-button" type="button">
                  Review
                </button>
                <button className="ghost-button" type="button">
                  Assign
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
      <style jsx>{`
        .document-queue {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
        }

        .document-queue__item {
          border-radius: var(--radius-md);
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: var(--color-surface);
          box-shadow: var(--shadow-sm);
          padding: 1.75rem;
          display: grid;
          gap: 1.1rem;
        }

        .document-queue__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        h3 {
          margin: 0;
          color: #111827;
          font-size: 1.15rem;
        }

        dl {
          margin: 0;
          display: grid;
          gap: 0.75rem;
        }

        dt {
          font-size: 0.85rem;
          color: var(--color-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        dd {
          margin: 0.15rem 0 0;
          font-weight: 600;
          color: #111827;
        }

        .document-queue__actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
      `}</style>
    </section>
  );
}
