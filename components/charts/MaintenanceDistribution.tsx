import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface MaintenanceCategory {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface MaintenanceDistributionProps {
  data: MaintenanceCategory[];
}

const COLORS = [
  'var(--color-primary)',
  'var(--color-success, #22c55e)',
  'var(--color-warning, #eab308)',
  'var(--color-error, #ef4444)',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6'
];

export default function MaintenanceDistribution({ data }: MaintenanceDistributionProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="donut-container">
      <h3 className="donut-title">Maintenance by Category</h3>
      <div className="donut-wrapper">
        <div className="donut-chart">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                formatter={(value, name) => {
                  const numValue = typeof value === 'number' ? value : 0;
                  return [
                    `${numValue} requests (${total > 0 ? Math.round((numValue / total) * 100) : 0}%)`,
                    name
                  ];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center">
            <span className="donut-total">{total}</span>
            <span className="donut-label">Total</span>
          </div>
        </div>
        <div className="donut-legend">
          {data.map((item, index) => (
            <div key={item.name} className="donut-legend-item">
              <span
                className="donut-legend-dot"
                style={{ background: COLORS[index % COLORS.length] }}
              />
              <span className="donut-legend-label">{item.name}</span>
              <span className="donut-legend-value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .donut-container {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 20px;
        }

        .donut-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 16px;
        }

        .donut-wrapper {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .donut-chart {
          position: relative;
          width: 180px;
          height: 180px;
          flex-shrink: 0;
        }

        .donut-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .donut-total {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text);
          line-height: 1;
        }

        .donut-label {
          display: block;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          margin-top: 2px;
        }

        .donut-legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .donut-legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8125rem;
        }

        .donut-legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .donut-legend-label {
          color: var(--color-text);
          flex: 1;
        }

        .donut-legend-value {
          color: var(--color-text-secondary);
          font-weight: 500;
        }

        @media (max-width: 640px) {
          .donut-wrapper {
            flex-direction: column;
          }

          .donut-legend {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
