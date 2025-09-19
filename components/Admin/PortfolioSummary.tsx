import type { PortfolioMetric } from '@/data/admin';

type PortfolioSummaryProps = {
  metrics: PortfolioMetric[];
};

const trendLabel: Record<PortfolioMetric['trend'], string> = {
  up: 'Up from last period',
  down: 'Down from last period',
  steady: 'Holding steady'
};

export default function PortfolioSummary({ metrics }: PortfolioSummaryProps) {
  return (
    <section className="section section--muted">
      <div className="section__inner">
        <div className="card__header" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card__title">Portfolio pulse</h2>
          <p style={{ color: 'var(--color-muted)' }}>Key performance indicators for this week.</p>
        </div>
        <div className="portfolio-metrics">
          {metrics.map((metric) => (
            <article key={metric.id} className={`portfolio-metric portfolio-metric--${metric.trend}`}>
              <span className="portfolio-metric__label">{metric.label}</span>
              <span className="portfolio-metric__value">{metric.value}</span>
              <span className="portfolio-metric__trend" aria-label={trendLabel[metric.trend]}>
                {metric.trend === 'up' ? '▲' : metric.trend === 'down' ? '▼' : '■'} {metric.trendValue}
              </span>
            </article>
          ))}
        </div>
      </div>
      <style jsx>{`
        .portfolio-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
        }

        .portfolio-metric {
          padding: 1.75rem;
          border-radius: var(--radius-md);
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: var(--color-surface);
          box-shadow: var(--shadow-sm);
          display: grid;
          gap: 0.75rem;
        }

        .portfolio-metric__label {
          font-size: 0.9rem;
          color: var(--color-muted);
        }

        .portfolio-metric__value {
          font-size: 2rem;
          font-weight: 700;
          color: #111827;
        }

        .portfolio-metric__trend {
          color: var(--color-muted);
          font-weight: 500;
        }

        .portfolio-metric--up .portfolio-metric__trend {
          color: var(--color-secondary);
        }

        .portfolio-metric--down .portfolio-metric__trend {
          color: #ef4444;
        }
      `}</style>
    </section>
  );
}
