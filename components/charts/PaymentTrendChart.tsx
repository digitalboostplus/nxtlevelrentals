import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrency, generateChartAriaLabel, formatLargeNumber } from '@/lib/chart-utils';
import {
  DEFAULT_TOOLTIP_STYLE,
  DEFAULT_GRID_CONFIG,
  DEFAULT_AXIS_CONFIG,
  RECHARTS_ANIMATION,
  CHART_GRADIENTS,
} from '@/lib/chart-config';

interface PaymentTrendData {
  month: string;
  collected: number;
  expected: number;
}

interface PaymentTrendChartProps {
  data: PaymentTrendData[];
}

export default function PaymentTrendChart({ data }: PaymentTrendChartProps) {
  // Calculate total collected and expected for aria label
  const totalCollected = data.reduce((sum, d) => sum + d.collected, 0);
  const totalExpected = data.reduce((sum, d) => sum + d.expected, 0);

  const ariaLabel = generateChartAriaLabel(
    'Payment trend area',
    data.length,
    `Showing ${data.length} months of payment data. Total collected: ${formatCurrency(totalCollected)}, total expected: ${formatCurrency(totalExpected)}`
  );

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const expected = payload.find((p: any) => p.dataKey === 'expected')?.value || 0;
    const collected = payload.find((p: any) => p.dataKey === 'collected')?.value || 0;
    const difference = collected - expected;
    const percentageOfExpected = expected > 0 ? (collected / expected) * 100 : 0;

    return (
      <div
        style={{
          ...DEFAULT_TOOLTIP_STYLE.contentStyle,
          minWidth: '200px',
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
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-success)',
                }}
              />
              Collected:
            </span>
            <strong style={{ color: 'var(--color-success)' }}>{formatCurrency(collected)}</strong>
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
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-info)',
                }}
              />
              Expected:
            </span>
            <strong style={{ color: 'var(--color-info)' }}>{formatCurrency(expected)}</strong>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: '6px',
              marginTop: '2px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
              <span style={{ ...DEFAULT_TOOLTIP_STYLE.itemStyle }}>Difference:</span>
              <strong style={{ color: difference >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                {difference >= 0 ? '+' : ''}
                {formatCurrency(difference)}
              </strong>
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                textAlign: 'right',
                marginTop: '4px',
              }}
            >
              {percentageOfExpected.toFixed(1)}% of expected
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="chart-container" role="img" aria-label={ariaLabel}>
      <h3 className="chart-title">Collection Trend</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {/* Expected gradient (blue) */}
              <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              {/* Collected gradient (green) */}
              <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>

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
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                paddingTop: '16px',
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
              }}
              formatter={(value) => (value === 'collected' ? 'Collected' : 'Expected')}
            />

            {/* Expected area (behind) */}
            <Area
              type="monotone"
              dataKey="expected"
              stroke="var(--color-info)"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#colorExpected)"
              {...RECHARTS_ANIMATION}
            />

            {/* Collected area (in front) */}
            <Area
              type="monotone"
              dataKey="collected"
              stroke="var(--color-success)"
              strokeWidth={2}
              fill="url(#colorCollected)"
              dot={{ fill: 'var(--color-success)', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: 'var(--color-success)', strokeWidth: 2 }}
              {...RECHARTS_ANIMATION}
            />
          </AreaChart>
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
