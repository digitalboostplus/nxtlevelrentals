import Link from 'next/link';

const highlights = [
  {
    label: 'City Alerts',
    value: 'Updated daily',
    description: 'Stay informed about street closures, community events, and seasonal reminders tailored to your neighborhood.'
  },
  {
    label: 'Weather Ready',
    value: 'Severe weather watch',
    description: 'Receive push and email notifications when storms, heat waves, or cold snaps are expected in your area.'
  },
  {
    label: 'Maintenance',
    value: '24/7 response',
    description: 'Submit work orders, see ETA updates, and review completed maintenance directly from your portal.'
  }
];

export default function TenantHero() {
  return (
    <section className="tenant-hero" aria-labelledby="tenantHeroHeading">
      <div className="tenant-hero__gradient" aria-hidden="true" />
      <div className="tenant-hero__grid">
        <div className="tenant-hero__content">
          <p className="tenant-hero__eyebrow">Designed for residents</p>
          <h1 id="tenantHeroHeading">Welcome home to the Next Level resident experience</h1>
          <p className="tenant-hero__description">
            Track everything related to your rental — from rent payments and secure documents to upcoming community happenings.
            We curate the most important updates so you can plan with confidence and feel supported in every season.
          </p>
          <div className="tenant-hero__actions">
            <Link href="/login" className="primary-button tenant-hero__primary">
              Sign in to your portal
            </Link>
            <Link href="/#tenant-resources" className="outline-button">
              Explore resident resources
            </Link>
          </div>
          <dl className="tenant-hero__highlights" aria-label="Platform highlights">
            {highlights.map((item) => (
              <div className="highlight-card" key={item.label}>
                <dt>{item.label}</dt>
                <dd>
                  <span>{item.value}</span>
                  <p>{item.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <aside className="tenant-hero__card" aria-label="Portal preview">
          <div className="tenant-hero__card-header">
            <span className="tenant-hero__card-badge">Live dashboard</span>
            <h2>Everything tenants need in one place</h2>
          </div>
          <ul className="tenant-hero__card-list">
            <li>
              <div>
                <strong>Pay rent in seconds</strong>
                <p>Set up autopay or make one-time payments with stored payment methods.</p>
              </div>
            </li>
            <li>
              <div>
                <strong>Access documents</strong>
                <p>Leases, move-in checklists, and HOA notices are searchable and downloadable.</p>
              </div>
            </li>
            <li>
              <div>
                <strong>Request maintenance</strong>
                <p>Describe the issue, add photos, pick preferred times, and track status updates.</p>
              </div>
            </li>
            <li>
              <div>
                <strong>Connect with your community</strong>
                <p>Message your property manager, RSVP to events, and share building updates.</p>
              </div>
            </li>
          </ul>
          <div className="tenant-hero__card-footer">
            <span>New resident?</span>
            <Link href="mailto:welcome@nxtlevelrentals.com">Request your portal invite</Link>
          </div>
        </aside>
      </div>
      <style jsx>{`
        .tenant-hero {
          position: relative;
          overflow: hidden;
          padding: clamp(4rem, 8vw, 6.5rem) 1.5rem;
          background: radial-gradient(circle at top left, rgba(108, 92, 231, 0.18), transparent 55%),
            var(--color-surface);
        }

        .tenant-hero__gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, rgba(108, 92, 231, 0.12), transparent 60%),
            linear-gradient(200deg, rgba(30, 64, 175, 0.12), transparent 50%);
          pointer-events: none;
        }

        .tenant-hero__grid {
          position: relative;
          display: grid;
          gap: clamp(2.5rem, 5vw, 4rem);
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          max-width: 1120px;
          margin: 0 auto;
          z-index: 1;
        }

        .tenant-hero__content h1 {
          font-size: clamp(2.5rem, 5vw, 3.5rem);
          line-height: 1.1;
          color: #0f172a;
        }

        .tenant-hero__eyebrow {
          text-transform: uppercase;
          font-size: 0.85rem;
          letter-spacing: 0.28em;
          font-weight: 700;
          color: rgba(15, 23, 42, 0.65);
          margin-bottom: 1rem;
        }

        .tenant-hero__description {
          font-size: 1.1rem;
          line-height: 1.7;
          color: rgba(15, 23, 42, 0.78);
          margin-top: 1.25rem;
        }

        .tenant-hero__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 2.25rem;
        }

        .tenant-hero__primary {
          box-shadow: 0 18px 35px rgba(79, 70, 229, 0.2);
        }

        .tenant-hero__highlights {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          margin-top: 2.5rem;
        }

        .highlight-card {
          background: white;
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          box-shadow: var(--shadow-sm);
          border: 1px solid rgba(15, 23, 42, 0.08);
        }

        .highlight-card dt {
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(15, 23, 42, 0.55);
          font-weight: 700;
        }

        .highlight-card dd {
          margin: 0.75rem 0 0;
        }

        .highlight-card span {
          display: block;
          font-weight: 700;
          font-size: 1.3rem;
          color: #312e81;
        }

        .highlight-card p {
          margin-top: 0.35rem;
          color: rgba(15, 23, 42, 0.68);
          line-height: 1.6;
        }

        .tenant-hero__card {
          background: rgba(15, 23, 42, 0.78);
          color: white;
          border-radius: clamp(1.5rem, 3vw, 2.25rem);
          padding: clamp(2rem, 4vw, 2.75rem);
          display: grid;
          gap: 1.75rem;
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.35);
          backdrop-filter: blur(6px);
          align-self: start;
        }

        .tenant-hero__card-header h2 {
          font-size: 1.65rem;
          line-height: 1.3;
        }

        .tenant-hero__card-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-weight: 700;
          padding: 0.4rem 0.8rem;
          border-radius: 999px;
          background: rgba(96, 165, 250, 0.18);
          color: #bfdbfe;
        }

        .tenant-hero__card-list {
          display: grid;
          gap: 1.35rem;
        }

        .tenant-hero__card-list li {
          list-style: none;
          display: flex;
          gap: 1rem;
        }

        .tenant-hero__card-list strong {
          font-size: 1rem;
          display: block;
          margin-bottom: 0.35rem;
        }

        .tenant-hero__card-list p {
          color: rgba(226, 232, 240, 0.82);
          line-height: 1.6;
        }

        .tenant-hero__card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          font-size: 0.95rem;
        }

        .tenant-hero__card-footer a {
          color: #c7d2fe;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .tenant-hero__card {
            order: -1;
          }

          .tenant-hero__card-footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </section>
  );
}
