import Link from 'next/link';
import { useState } from 'react';

type RoleKey = 'tenant' | 'manager';

type RoleContent = {
  eyebrow: string;
  title: string;
  description: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  highlights: { label: string; value: string; description: string }[];
  card: { badge: string; title: string; items: { title: string; copy: string }[]; footer: string };
};

const roleContent: Record<RoleKey, RoleContent> = {
  tenant: {
    eyebrow: 'Designed for residents',
    title: 'Welcome home to the Next Level resident experience',
    description:
      'Track everything related to your rental - from rent payments and secure documents to upcoming community happenings. We curate the most important updates so you can plan with confidence and feel supported in every season.',
    primary: { label: 'Sign in to your portal', href: '/login' },
    secondary: { label: 'Contact sales', href: 'mailto:sales@nxtlevelrentals.com' },
    highlights: [
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
    ],
    card: {
      badge: 'Live dashboard',
      title: 'Everything tenants need in one place',
      items: [
        {
          title: 'Pay rent in seconds',
          copy: 'Set up autopay or make one-time payments with stored payment methods.'
        },
        {
          title: 'Access documents',
          copy: 'Leases, move-in checklists, and HOA notices are searchable and downloadable.'
        },
        {
          title: 'Request maintenance',
          copy: 'Describe the issue, add photos, pick preferred times, and track status updates.'
        },
        {
          title: 'Connect with your community',
          copy: 'Message your property manager, RSVP to events, and share building updates.'
        }
      ],
      footer: 'New resident? Request your portal invite'
    }
  },
  manager: {
    eyebrow: 'Built for property teams',
    title: 'Run your portfolio with clarity and confidence',
    description:
      'Manage payments, maintenance, and resident communications from a single command center. Automated workflows keep teams aligned while your residents get real-time updates.',
    primary: { label: 'Contact sales', href: 'mailto:sales@nxtlevelrentals.com' },
    secondary: { label: 'Sign in', href: '/login' },
    highlights: [
      {
        label: 'Rent Tracking',
        value: 'Real-time',
        description: 'Spot delinquencies early and forecast cash flow across every unit.'
      },
      {
        label: 'Work Orders',
        value: 'SLA-ready',
        description: 'Prioritize urgent maintenance and coordinate vendors with full visibility.'
      },
      {
        label: 'Portfolio Health',
        value: 'Unified view',
        description: 'Monitor occupancy, renewals, and resident sentiment at a glance.'
      }
    ],
    card: {
      badge: 'Portfolio view',
      title: 'All properties in one command center',
      items: [
        {
          title: 'Streamline payments',
          copy: 'Collect rent, reconcile balances, and export reports with one workflow.'
        },
        {
          title: 'Coordinate vendors',
          copy: 'Assign jobs, track progress, and share updates with residents.'
        },
        {
          title: 'Reduce churn',
          copy: 'Automate renewals and keep residents informed ahead of deadlines.'
        },
        {
          title: 'Centralize comms',
          copy: 'Broadcast announcements and respond to messages without leaving the dashboard.'
        }
      ],
      footer: 'Need an admin account? Talk to sales'
    }
  }
};

const trustSignals = [
  'SLA-backed maintenance updates',
  'PCI-compliant payments',
  'Emergency support 24/7'
];

const partnerLabels = ['Community Partners', 'Vendor Network', 'Resident Council', 'Local Services'];

export default function TenantHero() {
  const [activeRole, setActiveRole] = useState<RoleKey>('tenant');
  const content = roleContent[activeRole];

  const renderAction = (action: { label: string; href: string }, className: string) => {
    if (action.href.startsWith('mailto:')) {
      return (
        <a href={action.href} className={className}>
          {action.label}
        </a>
      );
    }

    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  };

  return (
    <section className="tenant-hero" aria-labelledby="tenantHeroHeading">
      <div className="tenant-hero__gradient" aria-hidden="true" />
      <div className="tenant-hero__grid">
        <div className="tenant-hero__content">
          <p className="tenant-hero__eyebrow">{content.eyebrow}</p>
          <h1 id="tenantHeroHeading">{content.title}</h1>
          <p className="tenant-hero__description">{content.description}</p>
          <div className="tenant-hero__role-toggle" role="tablist" aria-label="Choose your role">
            <button
              type="button"
              role="tab"
              aria-selected={activeRole === 'tenant'}
              className={`role-toggle__button${activeRole === 'tenant' ? ' role-toggle__button--active' : ''}`}
              onClick={() => setActiveRole('tenant')}
            >
              I am a tenant
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeRole === 'manager'}
              className={`role-toggle__button${activeRole === 'manager' ? ' role-toggle__button--active' : ''}`}
              onClick={() => setActiveRole('manager')}
            >
              I manage properties
            </button>
          </div>
          <div className="tenant-hero__actions">
            {renderAction(content.primary, 'primary-button tenant-hero__primary')}
            {renderAction(content.secondary, 'outline-button')}
          </div>
          <div className="tenant-hero__trust">
            {trustSignals.map((signal) => (
              <span key={signal} className="trust-pill">
                {signal}
              </span>
            ))}
          </div>
          <dl className="tenant-hero__highlights" aria-label="Platform highlights">
            {content.highlights.map((item) => (
              <div className="highlight-card glass" key={item.label}>
                <dt>{item.label}</dt>
                <dd>
                  <span>{item.value}</span>
                  <p>{item.description}</p>
                </dd>
              </div>
            ))}
          </dl>
          <div className="tenant-hero__logos" aria-label="Client logos">
            {partnerLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
        <aside className="tenant-hero__card" aria-label="Portal preview">
          <div className="tenant-hero__card-header">
            <span className="tenant-hero__card-badge">{content.card.badge}</span>
            <h2>{content.card.title}</h2>
          </div>
          <ul className="tenant-hero__card-list">
            {content.card.items.map((item) => (
              <li key={item.title}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.copy}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="tenant-hero__card-footer">
            <span>{content.card.footer}</span>
            <a href="mailto:welcome@nxtlevelrentals.com">Request your portal invite</a>
          </div>
        </aside>
      </div>
      <style jsx>{`
        .tenant-hero {
          position: relative;
          overflow: hidden;
          padding: clamp(4rem, 8vw, 6.5rem) 1.5rem;
          background: radial-gradient(circle at top left, rgba(15, 118, 110, 0.18), transparent 55%),
            linear-gradient(120deg, rgba(3, 105, 161, 0.12), transparent 65%),
            var(--color-surface);
        }

        .tenant-hero__gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 20% 20%, rgba(20, 184, 166, 0.18), transparent 55%),
            radial-gradient(circle at 80% 10%, rgba(3, 105, 161, 0.14), transparent 50%);
          pointer-events: none;
        }

        .tenant-hero__grid {
          position: relative;
          display: grid;
          gap: clamp(2.5rem, 5vw, 4rem);
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          max-width: var(--max-width);
          margin: 0 auto;
          z-index: 1;
        }

        .tenant-hero__content h1 {
          font-size: clamp(2.5rem, 5vw, 3.5rem);
          line-height: 1.1;
          color: var(--color-text);
        }

        .tenant-hero__eyebrow {
          text-transform: uppercase;
          font-size: 0.85rem;
          letter-spacing: 0.28em;
          font-weight: 700;
          color: rgba(15, 118, 110, 0.75);
          margin-bottom: 1rem;
        }

        .tenant-hero__description {
          font-size: 1.1rem;
          line-height: 1.7;
          color: var(--color-muted);
          margin-top: 1.25rem;
        }

        .tenant-hero__role-toggle {
          display: inline-flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 1.75rem;
          background: var(--color-surface-elevated);
          padding: 0.35rem;
          border-radius: 999px;
          border: 1px solid var(--color-border);
        }

        .role-toggle__button {
          border: none;
          background: transparent;
          padding: 0.5rem 1rem;
          border-radius: 999px;
          font-weight: 600;
          cursor: pointer;
          color: var(--color-muted);
          transition: all var(--transition-fast);
        }

        .role-toggle__button--active {
          background: var(--color-primary);
          color: #fff;
        }

        .tenant-hero__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 2rem;
        }

        .tenant-hero__primary {
          box-shadow: 0 18px 35px rgba(15, 118, 110, 0.2);
        }

        .tenant-hero__trust {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .trust-pill {
          padding: 0.35rem 0.85rem;
          border-radius: 999px;
          background: rgba(15, 118, 110, 0.12);
          color: var(--color-primary);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .tenant-hero__highlights {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          margin-top: 2.5rem;
        }

        .highlight-card {
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--glass-border);
          background: var(--glass-background);
        }

        .highlight-card dt {
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(15, 118, 110, 0.7);
          font-weight: 700;
        }

        .highlight-card dd {
          margin: 0.75rem 0 0;
        }

        .highlight-card span {
          display: block;
          font-weight: 700;
          font-size: 1.3rem;
          color: var(--color-primary-dark);
        }

        .highlight-card p {
          margin-top: 0.35rem;
          color: var(--color-muted);
          line-height: 1.6;
        }

        .tenant-hero__logos {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 2.5rem;
        }

        .tenant-hero__logos span {
          padding: 0.5rem 1rem;
          border-radius: 999px;
          border: 1px solid var(--color-border);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-muted);
          background: var(--color-surface);
        }

        .tenant-hero__card {
          background: rgba(15, 23, 42, 0.82);
          color: white;
          border-radius: clamp(1.5rem, 3vw, 2.25rem);
          padding: clamp(2rem, 4vw, 2.75rem);
          display: grid;
          gap: 1.75rem;
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.35);
          backdrop-filter: blur(8px);
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
          color: #bae6fd;
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
