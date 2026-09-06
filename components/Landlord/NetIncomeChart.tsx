import { formatMoney } from '@/lib/console-home';

type Bar = { label: string; value: number };

type NetIncomeChartProps = {
  series: Bar[];
  title?: string;
};

// Single-series bar chart, one hue, rendered as inline SVG so it needs no
// chart library and matches the design canvas. Only the first and last bars
// carry a value label; the y axis carries the scale.
export default function NetIncomeChart({ series, title = 'Net income, last 6 months' }: NetIncomeChartProps) {
  const width = 420;
  const height = 200;
  const left = 44;
  const top = 20;
  const bottom = 30;
  const plotHeight = height - top - bottom;
  const plotWidth = width - left - 10;
  const maxValue = Math.max(1, ...series.map((bar) => Math.max(0, bar.value)));
  const niceMax = Math.ceil(maxValue / 1000) * 1000 || 1000;
  const slot = series.length > 0 ? plotWidth / series.length : plotWidth;
  const barWidth = Math.min(48, slot * 0.6);
  const gridSteps = 3;

  const y = (value: number) => top + plotHeight - (Math.max(0, value) / niceMax) * plotHeight;
  const compact = (value: number) => (value >= 1000 ? `$${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : formatMoney(value));

  const hasData = series.some((bar) => bar.value !== 0);

  return (
    <div className="card net-chart">
      <div className="net-chart__head">
        <h2>{title}</h2>
        <span>After paid expenses, before your payout.</span>
      </div>
      {hasData ? (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}: ${series.map((bar) => `${bar.label} ${formatMoney(bar.value)}`).join(', ')}`}>
          <g stroke="var(--color-border)" strokeWidth="1">
            {Array.from({ length: gridSteps + 1 }, (_, i) => {
              const yy = top + (plotHeight / gridSteps) * i;
              return <line key={i} x1={left} y1={yy} x2={width - 10} y2={yy} />;
            })}
          </g>
          <g fill="var(--color-muted)" fontSize="12" fontFamily="inherit">
            {Array.from({ length: gridSteps + 1 }, (_, i) => {
              const yy = top + (plotHeight / gridSteps) * i;
              const value = niceMax - (niceMax / gridSteps) * i;
              return (
                <text key={i} x={left - 8} y={yy + 4} textAnchor="end">
                  {compact(value)}
                </text>
              );
            })}
          </g>
          <g fill="var(--color-primary)">
            {series.map((bar, i) => {
              const x = left + slot * i + (slot - barWidth) / 2;
              const barTop = y(bar.value);
              const h = Math.max(0, top + plotHeight - barTop);
              if (h <= 0) return null;
              const r = Math.min(4, h);
              return (
                <path
                  key={bar.label}
                  d={`M${x} ${barTop + r} a${r} ${r} 0 0 1 ${r} -${r} h${barWidth - 2 * r} a${r} ${r} 0 0 1 ${r} ${r} v${h - r} h-${barWidth} z`}
                />
              );
            })}
          </g>
          <g fill="var(--color-text)" fontSize="12" fontWeight="600" fontFamily="inherit" textAnchor="middle">
            {series.map((bar, i) =>
              i === 0 || i === series.length - 1 ? (
                <text key={bar.label} x={left + slot * i + slot / 2} y={y(bar.value) - 6}>
                  {compact(bar.value)}
                </text>
              ) : null
            )}
          </g>
          <g fill="var(--color-muted)" fontSize="12" fontFamily="inherit" textAnchor="middle">
            {series.map((bar, i) => (
              <text key={bar.label} x={left + slot * i + slot / 2} y={height - 8}>
                {bar.label}
              </text>
            ))}
          </g>
        </svg>
      ) : (
        <p className="net-chart__empty">No posted rent or expenses in the last six months yet.</p>
      )}
      <style jsx>{`
        .net-chart {
          display: grid;
          gap: 1rem;
        }

        .net-chart__head {
          display: grid;
          gap: 0.25rem;
        }

        .net-chart__head h2 {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .net-chart__head span {
          font-size: 0.85rem;
          color: var(--color-muted);
        }

        svg {
          width: 100%;
          height: auto;
          display: block;
        }

        .net-chart__empty {
          color: var(--color-muted);
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
}
