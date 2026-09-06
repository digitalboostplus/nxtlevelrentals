import type { DashboardMetrics } from '@/data/portal';

import { formatLocalDate } from '@/lib/date';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

type DashboardHighlightsProps = {
  metrics: DashboardMetrics;
  onPayRent?: () => void;
};

export default function DashboardHighlights({ metrics, onPayRent }: DashboardHighlightsProps) {
  const stats = [
    {
      label: 'Current Balance',
      value: formatCurrency(metrics.currentBalance),
      meta: metrics.dueDate ? `Oldest posted charge: ${formatLocalDate(metrics.dueDate)}` : 'No posted balance due'
    },
    {
      label: 'AutoPay',
      value: 'Unavailable',
      meta: 'Contact management for payment instructions'
    },
    {
      label: 'Next Inspection',
      value: formatLocalDate(metrics.nextInspection, { month: 'short', day: 'numeric', year: 'numeric' }),
      meta: 'A reminder will be sent 72 hours prior'
    },
    {
      label: 'Lease Renewal',
      value: formatLocalDate(metrics.leaseRenewalDate, { month: 'short', day: 'numeric', year: 'numeric' }),
      meta: `Last payment ${formatLocalDate(metrics.lastPaymentDate, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })} - ${formatCurrency(metrics.lastPaymentAmount)}`
    }
  ];

  return (
    <section className="section">
      <div className="section__inner">
        <div className="card__header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="card__title">Dashboard overview</h2>
            <p style={{ color: 'var(--color-muted)', margin: 0 }}>Monitor rent balance, lease status, and community notifications.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span className="tag tag--info">Online payments unavailable</span>
            {onPayRent && (
              <button
                type="button"
                onClick={onPayRent}
                className="primary-button"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                💳 Pay Rent
              </button>
            )}
          </div>
        </div>
        <div className="stat-grid">
          {stats.map((stat) => (
            <div className="stat-card" key={stat.label}>
              <div className="stat-card__label">{stat.label}</div>
              <div className="stat-card__value">{stat.value}</div>
              <div className="stat-card__meta">{stat.meta}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
