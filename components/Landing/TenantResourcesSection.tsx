import Link from 'next/link';

const resources = [
  {
    category: 'Payments',
    title: 'Rent & utilities',
    description: 'Set up autopay, split rent with roommates, and view past receipts with downloadable statements.',
    linkLabel: 'Manage payments',
    href: '/login'
  },
  {
    category: 'Support',
    title: 'Maintenance & repairs',
    description: 'Submit new requests, add photos or videos, and chat with technicians in real time as status updates roll in.',
    linkLabel: 'Request maintenance',
    href: '/login'
  },
  {
    category: 'Documents',
    title: 'Lease & compliance',
    description: 'Access leases, addenda, insurance certificates, and move-in documentation from a secure digital vault.',
    linkLabel: 'Open document vault',
    href: '/login'
  },
  {
    category: 'Community',
    title: 'Announcements & feedback',
    description: 'Catch up on building news, share compliments, or submit general comments so we can make daily life even better.',
    linkLabel: 'Share feedback',
    href: '/login'
  }
];

export default function TenantResourcesSection() {
  return (
    <section className="tenant-resources" id="tenant-resources" aria-labelledby="tenantResourcesHeading">
      <div className="tenant-resources__inner">
        <div className="tenant-resources__header">
          <p className="section-eyebrow">Your digital concierge</p>
          <h2 id="tenantResourcesHeading">All the tools tenants need, accessible anywhere</h2>
          <p>
            The Next Level portal is optimized for mobile and desktop with accessibility at the forefront. Secure authentication,
            transparent history, and proactive updates help you stay in control of your home.
          </p>
        </div>
        <div className="tenant-resources__grid" role="list">
          {resources.map((resource) => (
            <article className="resource-card" key={resource.title} role="listitem">
              <p className="resource-card__category">{resource.category}</p>
              <h3>{resource.title}</h3>
              <p className="resource-card__description">{resource.description}</p>
              <Link href={resource.href} className="resource-card__link">
                {resource.linkLabel}
                <span aria-hidden="true">&gt;</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
      <style jsx>{`
        .tenant-resources {
          padding: clamp(3.5rem, 7vw, 5rem) 1.5rem;
          background: var(--color-surface-elevated);
        }

        .tenant-resources__inner {
          max-width: var(--max-width);
          margin: 0 auto;
          display: grid;
          gap: clamp(2rem, 6vw, 3rem);
        }

        .tenant-resources__header {
          max-width: 640px;
        }

        .tenant-resources__header h2 {
          font-size: clamp(2rem, 4vw, 2.5rem);
          color: var(--color-text);
          margin-bottom: 0.75rem;
        }

        .tenant-resources__header p {
          color: var(--color-muted);
          line-height: 1.7;
        }

        .tenant-resources__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .resource-card {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          padding: 1.75rem;
          display: grid;
          gap: 1rem;
          border: 1px solid rgba(15, 118, 110, 0.12);
          box-shadow: var(--shadow-sm);
        }

        .resource-card__category {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-weight: 700;
          color: rgba(15, 118, 110, 0.65);
        }

        .resource-card h3 {
          font-size: 1.2rem;
          color: var(--color-text);
        }

        .resource-card__description {
          color: var(--color-muted);
          line-height: 1.6;
        }

        .resource-card__link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: var(--color-primary);
        }

        .resource-card__link span {
          transition: transform 0.2s ease;
        }

        .resource-card__link:hover span,
        .resource-card__link:focus span {
          transform: translateX(4px);
        }
      `}</style>
    </section>
  );
}
