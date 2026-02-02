import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency, generateChartAriaLabel, formatLargeNumber } from '@/lib/chart-utils';
import {
  DEFAULT_TOOLTIP_STYLE,
  DEFAULT_GRID_CONFIG,
  DEFAULT_AXIS_CONFIG,
  RECHARTS_ANIMATION,
} from '@/lib/chart-config';

interface RevenueSummaryData {
  month: string;
  expected: number;
  collected: number;
}

interface RevenueSummaryChartProps {
  data: RevenueSummaryData[];
}

export default function RevenueSummaryChart({ data }: RevenueSummaryChartProps) {
  const totalExpected = data.reduce((sum, d) => sum + d.expected, 0);
  const totalCollected = data.reduce((sum, d) => sum + d.collected, 0);

  const ariaLabel = generateChartAriaLabel(
    'Revenue summary bar',
    data.length,
    `${data.length} months of revenue data. Expected: ${formatCurrency(totalExpected)}, Collected: ${formatCurrency(totalCollected)}`
  );

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const expected = payload.find((p: any) => p.dataKey === 'expected')?.value || 0;
    const collected = payload.find((p: any) => p.dataKey === 'collected')?.value || 0;
    const difference = collected - expected;

    return (
      <div
        style={{
          ...DEFAULT_TOOLTIP_STYLE.contentStyle,
          minWidth: '180px',
        }}
      >
        <p style={{ ...DEFAULT_TOOLTIP_STYLE.labelStyle, marginBottom: '8px' }}>{label}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span
              style={{
                ...DEFAULT_TOOLTIP_STYLE.itemStyle,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--color-info)',
                }}
              />
              Expected:
            </span>
            <strong style={{ color: 'var(--color-info)' }}>{formatCurrency(expected)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span
              style={{
                ...DEFAULT_TOOLTIP_STYLE.itemStyle,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--color-success)',
                }}
              />
              Collected:
            </span>
            <strong style={{ color: 'var(--color-success)' }}>{formatCurrency(collected)}</strong>
          </div>
          {difference !== 0 && (
            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: '6px',
                marginTop: '2px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Difference:
              </span>
              <strong
                style={{
                  fontSize: '12px',
                  color: difference >= 0 ? 'var(--color-success)' : 'var(--color-error)',
                }}
              >
                {difference >= 0 ? '+' : ''}
                {formatCurrency(difference)}
              </strong>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="chart-container" role="img" aria-label={ariaLabel}>
      <h3 className="chart-title">Revenue Summary</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid {...DEFAULT_GRID_CONFIG} />

            <XAxis
              dataKey="month"
              tick={DEFAULT_AXIS_CONFIG.tick}
              tickLine={false}
              axisLine={DEFAULT_AXIS_CONFIG.axisLine}
            />

            <YAxis
              tick={DEFAULT_AXIS_CONFIG.tick}
              tickLine={false}
              axisLine={DEFAULT_AXIS_CONFIG.axisLine}
              tickFormatter={(value) => `$${formatLargeNumber(value)}`}
            />

            <Tooltip content={customTooltip} />

            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="square"
              iconSize={10}
              wrapperStyle={{
                paddingTop: '16px',
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
              }}
              formatter={(value) => (value === 'collected' ? 'Collected' : 'Expected')}
            />

            <Bar
              dataKey="expected"
              fill="var(--color-info)"
              radius={[4, 4, 0, 0]}
              {...RECHARTS_ANIMATION}
            />

            <Bar
              dataKey="collected"
              fill="var(--color-success)"
              radius={[4, 4, 0, 0]}
              {...RECHARTS_ANIMATION}
            />
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

        .chart-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 1rem;
        }

        .chart-wrapper {
          width: 100%;
          height: 300px;
        }

        @media (max-width: 768px) {
          .chart-wrapper {
            height: 250px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .chart-container {
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
