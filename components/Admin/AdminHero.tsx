import type { ReactNode } from 'react';

type AdminHeroProps = {
  managerName: string;
  portfolioLabel: string;
  stats: ReactNode;
};

export default function AdminHero({ managerName, portfolioLabel, stats }: AdminHeroProps) {
  return (
    <section className="section">
      <div className="section__inner admin-hero">
        <div className="admin-hero__copy">
          <span className="tag tag--info">Portfolio overview</span>
          <h1>Good day, {managerName}</h1>
          <p>
            Here is the latest health snapshot for <strong>{portfolioLabel}</strong>. Review open work orders, lease
            renewals, and outstanding balances at a glance.
          </p>
        </div>
        <div className="admin-hero__stats">{stats}</div>
      </div>
      <style jsx>{`
        .admin-hero {
          display: grid;
          gap: 2.5rem;
          align-items: center;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }

        .admin-hero__copy h1 {
          font-size: clamp(2.1rem, 4vw, 2.8rem);
          margin: 0.75rem 0;
          color: #111827;
        }

        .admin-hero__copy p {
          max-width: 480px;
          color: var(--color-muted);
        }

        .admin-hero__stats {
          display: grid;
          gap: 1rem;
        }

        .admin-stat {
          background: var(--color-surface);
          padding: 1.5rem;
          border-radius: var(--radius-md);
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: var(--shadow-sm);
        }

        .admin-stat span {
          display: block;
        }

        .admin-stat__label {
          font-size: 0.9rem;
          color: var(--color-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 0.35rem;
        }

        .admin-stat__value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
        }
      `}</style>
    </section>
  );
}
