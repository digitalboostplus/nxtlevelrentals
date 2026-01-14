import type { QuickAction } from '@/data/portal';

type QuickActionsProps = {
  actions: QuickAction[];
};

export default function QuickActions({ actions }: QuickActionsProps) {
  return (
    <section className="section">
      <div className="section__inner">
        <div className="card__header" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card__title">Quick actions</h2>
          <p style={{ color: 'var(--color-muted)' }}>Manage common tasks in a couple of clicks.</p>
        </div>
        <div className="quick-actions-grid">
          {actions.map((action) => (
            <article className="quick-action" key={action.id}>
              <h3>{action.label}</h3>
              <p>{action.description}</p>
              <a className="outline-button" href={action.href}>
                Open
              </a>
            </article>
          ))}
        </div>
      </div>
      <style jsx>{`
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }

        .quick-action {
          padding: 1.75rem;
          border-radius: var(--radius-md);
          background: var(--color-surface);
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: var(--shadow-sm);
          display: grid;
          gap: 0.85rem;
        }

        .quick-action h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #111827;
        }

        .quick-action p {
          font-size: 0.95rem;
        }

        .quick-action .outline-button {
          justify-self: flex-start;
        }
      `}</style>
    </section>
  );
}
