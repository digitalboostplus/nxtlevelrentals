import { useState } from 'react';
import { company, localGuide, type GuideTab } from '@/data/site';

export default function LocalGuideSection() {
  const [activeId, setActiveId] = useState<GuideTab['id']>(localGuide[0].id);
  const [expanded, setExpanded] = useState(false);
  const active = localGuide.find((tab) => tab.id === activeId) ?? localGuide[0];

  const selectTab = (id: GuideTab['id']) => {
    setActiveId(id);
    setExpanded(false);
  };

  return (
    <section className="guide" id="local-guide" aria-labelledby="guideHeading">
      <div className="guide__inner">
        <div className="guide__header">
          <p className="section-eyebrow">Living in {company.city}</p>
          <h2 id="guideHeading">The local stuff we get asked about most</h2>
          <p>Who to call, what to set up before move-in, and what to do when the weather turns. Bookmark this page.</p>
        </div>

        <div className="guide__tabs" role="tablist" aria-label="Local guide topics">
          {localGuide.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`guide-tab-${tab.id}`}
              aria-selected={tab.id === active.id}
              aria-controls={`guide-panel-${tab.id}`}
              className={`filter-chip${tab.id === active.id ? ' filter-chip--active' : ''}`}
              onClick={() => selectTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          className={`guide__grid${expanded ? ' guide__grid--expanded' : ''}`}
          role="tabpanel"
          id={`guide-panel-${active.id}`}
          aria-labelledby={`guide-tab-${active.id}`}
        >
          {active.entries.map((entry) => (
            <article className="guide-card" key={entry.title}>
              <p className="guide-card__label">{entry.title}</p>
              {entry.value ? (
                entry.tel ? (
                  <a className="guide-card__value" href={`tel:${entry.tel}`}>
                    {entry.value}
                  </a>
                ) : entry.href ? (
                  <a className="guide-card__value" href={entry.href} target="_blank" rel="noreferrer">
                    {entry.value}
                  </a>
                ) : (
                  <p className="guide-card__value">{entry.value}</p>
                )
              ) : null}
              <p className="guide-card__note">{entry.note}</p>
              {entry.href && entry.tel ? (
                <a className="guide-card__link" href={entry.href} target="_blank" rel="noreferrer">
                  Open their site
                </a>
              ) : null}
            </article>
          ))}
        </div>

        {active.entries.length > 3 ? (
          <button type="button" className="outline-button guide__more" onClick={() => setExpanded((prev) => !prev)}>
            {expanded ? 'Show fewer' : `Show all ${active.entries.length}`}
          </button>
        ) : null}
      </div>

      <style jsx>{`
        .guide {
          padding: clamp(3.5rem, 7vw, 5rem) 1.5rem;
          background: var(--color-background);
          border-top: 1px solid var(--color-border);
          scroll-margin-top: var(--header-height);
        }

        .guide__inner {
          max-width: var(--max-width);
          margin: 0 auto;
          display: grid;
          gap: clamp(1.5rem, 3vw, 2rem);
        }

        .guide__header {
          max-width: 640px;
          display: grid;
          gap: 0.75rem;
        }

        .guide__header h2 {
          font-size: clamp(2rem, 4vw, 2.5rem);
          line-height: 1.15;
          color: var(--color-text);
        }

        .guide__header p {
          color: var(--color-muted);
          line-height: 1.7;
        }

        .guide__tabs {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          padding-bottom: 0.25rem;
          scrollbar-width: none;
        }

        .guide__tabs::-webkit-scrollbar {
          display: none;
        }

        .guide__tabs :global(.filter-chip) {
          flex: none;
          min-height: 44px;
          background: var(--color-surface);
        }

        .guide__tabs :global(.filter-chip--active) {
          background: rgba(124, 192, 255, 0.12);
        }

        .guide__grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }

        .guide__more {
          display: none;
          justify-self: stretch;
        }

        .guide-card {
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          background: var(--color-surface);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--color-border);
          display: grid;
          gap: 0.5rem;
          align-content: start;
        }

        .guide-card__label {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 700;
          color: var(--color-primary);
        }

        .guide-card__value {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--color-text);
          line-height: 1.3;
        }

        a.guide-card__value:hover {
          color: var(--color-primary);
        }

        .guide-card__note {
          font-size: 0.9rem;
          color: var(--color-muted);
          line-height: 1.6;
        }

        .guide-card__link {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-primary);
        }

        @media (max-width: 960px) {
          .guide__grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .guide__grid {
            grid-template-columns: 1fr;
          }

          .guide__grid > :global(.guide-card:nth-child(n + 4)) {
            display: none;
          }

          .guide__grid--expanded > :global(.guide-card:nth-child(n + 4)) {
            display: grid;
          }

          .guide__more {
            display: inline-flex;
          }
        }
      `}</style>
    </section>
  );
}
