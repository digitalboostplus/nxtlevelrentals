import type { ResidentResource } from '@/data/portal';

type ResidentResourcesProps = {
  resources: ResidentResource[];
};

export default function ResidentResources({ resources }: ResidentResourcesProps) {
  return (
    <section className="section">
      <div className="section__inner">
        <div className="card__header" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card__title">Resident resources</h2>
          <p style={{ color: 'var(--color-muted)' }}>
            Explore helpful guides, perks, and upcoming events curated for Lakeside residents.
          </p>
        </div>
        <div className="resources-grid">
          {resources.length === 0 ? (
            <div className="resource-empty">
              <h3>No resources yet</h3>
              <p>Check back soon for move-in guides and community perks.</p>
            </div>
          ) : (
            resources.map((resource) => (
              <article key={resource.id} className="resource-card">
                <h3>{resource.title}</h3>
                <p>{resource.summary}</p>
                <a className="outline-button" href={resource.link}>
                  View details
                </a>
              </article>
            ))
          )}
        </div>
      </div>
      <style jsx>{`
        .resources-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
        }

        .resource-card {
          padding: 1.75rem;
          border-radius: var(--radius-md);
          border: 1px solid rgba(15, 118, 110, 0.12);
          background: var(--color-surface);
          box-shadow: var(--shadow-sm);
          display: grid;
          gap: 0.9rem;
        }

        .resource-card h3 {
          margin: 0;
          color: var(--color-text);
        }

        .resource-card .outline-button {
          justify-self: flex-start;
        }

        .resource-empty {
          grid-column: 1 / -1;
          background: var(--color-surface);
          border-radius: var(--radius-md);
          border: 1px dashed var(--color-border);
          padding: 2rem;
          display: grid;
          gap: 0.75rem;
          color: var(--color-muted);
        }

        .resource-empty h3 {
          margin: 0;
          color: var(--color-text);
        }
      `}</style>
    </section>
  );
}
