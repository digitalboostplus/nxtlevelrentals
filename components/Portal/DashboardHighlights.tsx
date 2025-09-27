import type { DashboardMetrics } from '@/data/portal';

import { formatLocalDate } from '@/lib/date';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

type DashboardHighlightsProps = {
  metrics: DashboardMetrics;
};

export default function DashboardHighlights({ metrics }: DashboardHighlightsProps) {
  const stats = [
    {
      label: 'Current Balance',
      value: formatCurrency(metrics.currentBalance),
      meta: `Due ${formatLocalDate(metrics.dueDate, { month: 'short', day: 'numeric', year: 'numeric' })}`
    },
    {
      label: 'AutoPay',
      value: metrics.autoPayEnabled ? 'Enabled' : 'Disabled',
      meta: metrics.autoPayEnabled ? 'Payments drafted automatically' : 'Enable autopay to avoid late fees'
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
      })} · ${formatCurrency(metrics.lastPaymentAmount)}`
    }
  ];

  return (
    <section className="section">
      <div className="section__inner">
        <div className="card__header" style={{ marginBottom: '2rem' }}>
          <h2 className="card__title">Dashboard overview</h2>
          <span className="tag tag--info">All systems operational</span>
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
