import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface RentStatusData {
  paid: number;
  pending: number;
  partial: number;
  overdue: number;
}

interface RentStatusBarProps {
  data: RentStatusData;
}

const STATUS_COLORS = {
  paid: 'var(--color-success, #22c55e)',
  pending: 'var(--color-text-secondary)',
  partial: 'var(--color-warning, #eab308)',
  overdue: 'var(--color-error, #ef4444)'
};

const STATUS_LABELS = {
  paid: 'Paid',
  pending: 'Pending',
  partial: 'Partial',
  overdue: 'Overdue'
};

export default function RentStatusBar({ data }: RentStatusBarProps) {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: STATUS_LABELS[key as keyof typeof STATUS_LABELS],
    value,
    color: STATUS_COLORS[key as keyof typeof STATUS_COLORS],
    key
  }));

  const total = Object.values(data).reduce((sum, val) => sum + val, 0);

  return (
    <div className="status-container">
      <h3 className="status-title">Rent Status This Month</h3>
      <div className="status-chart">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
          >
            <XAxis
              type="number"
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
              tickLine={{ stroke: 'var(--color-border)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: 'var(--color-text)', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              formatter={(value) => {
                const numValue = typeof value === 'number' ? value : 0;
                return [`${numValue} units`, ''];
              }}
              cursor={{ fill: 'var(--color-bg-secondary)' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="status-legend">
        {chartData.map((item) => (
          <div key={item.key} className="status-legend-item">
            <span className="status-legend-dot" style={{ background: item.color }} />
            <span className="status-legend-label">{item.name}</span>
            <span className="status-legend-value">
              {item.value} ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .status-container {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 20px;
        }

        .status-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 16px;
        }

        .status-chart {
          width: 100%;
          height: 180px;
        }

        .status-legend {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-top: 16px;
        }

        .status-legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8125rem;
        }

        .status-legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .status-legend-label {
          color: var(--color-text);
        }

        .status-legend-value {
          color: var(--color-text-secondary);
          margin-left: auto;
        }

        @media (max-width: 640px) {
          .status-legend {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
