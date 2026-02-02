import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  formatCurrency,
  generateChartAriaLabel,
  getPaymentMethodLabel,
  sortChartData,
} from '@/lib/chart-utils';
import {
  DEFAULT_TOOLTIP_STYLE,
  DEFAULT_GRID_CONFIG,
  DEFAULT_AXIS_CONFIG,
  RECHARTS_ANIMATION,
  CHART_SERIES_COLORS,
} from '@/lib/chart-config';

interface PaymentMethodData {
  method: string;
  count: number;
  amount: number;
}

interface PaymentMethodDistributionProps {
  data: PaymentMethodData[];
}

export default function PaymentMethodDistribution({ data }: PaymentMethodDistributionProps) {
  const [sortBy, setSortBy] = useState<'count' | 'amount'>('count');

  const sortedData = sortChartData(data, sortBy, 'desc');
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const totalAmount = data.reduce((sum, d) => sum + d.amount, 0);

  const ariaLabel = generateChartAriaLabel(
    'Payment method distribution',
    data.length,
    `${data.length} payment methods. Total transactions: ${total}, Total amount: ${formatCurrency(totalAmount)}`
  );

  const customTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const percentage = total > 0 ? ((data.count / total) * 100).toFixed(1) : '0';

    return (
      <div
        style={{
          ...DEFAULT_TOOLTIP_STYLE.contentStyle,
          minWidth: '200px',
        }}
      >
        <p style={{ ...DEFAULT_TOOLTIP_STYLE.labelStyle, marginBottom: '8px' }}>
          {getPaymentMethodLabel(data.method)}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ ...DEFAULT_TOOLTIP_STYLE.itemStyle }}>Transactions:</span>
            <strong style={{ color: 'var(--color-text)' }}>{data.count}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ ...DEFAULT_TOOLTIP_STYLE.itemStyle }}>Amount:</span>
            <strong style={{ color: 'var(--color-success)' }}>{formatCurrency(data.amount)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ ...DEFAULT_TOOLTIP_STYLE.itemStyle }}>Percentage:</span>
            <strong style={{ color: 'var(--color-primary)' }}>{percentage}%</strong>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="chart-container" role="img" aria-label={ariaLabel}>
      <div className="chart-header">
        <h3 className="chart-title">Payment Methods</h3>
        <div className="sort-controls">
          <button
            className={`sort-btn ${sortBy === 'count' ? 'active' : ''}`}
            onClick={() => setSortBy('count')}
          >
            By Count
          </button>
          <button
            className={`sort-btn ${sortBy === 'amount' ? 'active' : ''}`}
            onClick={() => setSortBy('amount')}
          >
            By Amount
          </button>
        </div>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
          >
            <CartesianGrid {...DEFAULT_GRID_CONFIG} horizontal={false} />

            <XAxis
              type="number"
              tick={DEFAULT_AXIS_CONFIG.tick}
              tickLine={false}
              axisLine={DEFAULT_AXIS_CONFIG.axisLine}
            />

            <YAxis
              type="category"
              dataKey="method"
              tick={DEFAULT_AXIS_CONFIG.tick}
              tickLine={false}
              axisLine={DEFAULT_AXIS_CONFIG.axisLine}
              tickFormatter={(value) => getPaymentMethodLabel(value)}
              width={75}
            />

            <Tooltip content={customTooltip} />

            <Bar dataKey={sortBy} radius={[0, 4, 4, 0]} {...RECHARTS_ANIMATION}>
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <style jsx>{`
        .chart-container {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          transition: box-shadow var(--transition-base);
        }

        .chart-container:hover {
          box-shadow: var(--shadow-md);
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          gap: 1rem;
        }

        .chart-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
        }

        .sort-controls {
          display: flex;
          gap: 0.5rem;
        }

        .sort-btn {
          padding: 0.375rem 0.75rem;
          font-size: 0.813rem;
          font-weight: 500;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-secondary);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .sort-btn:hover {
          background: var(--color-background);
          border-color: var(--color-primary);
        }

        .sort-btn.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .chart-wrapper {
          width: 100%;
          height: 280px;
        }

        @media (max-width: 768px) {
          .chart-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .chart-wrapper {
            height: 240px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .chart-container,
          .sort-btn {
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
