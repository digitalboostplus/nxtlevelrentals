import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PaymentTrendData {
  month: string;
  collected: number;
  expected: number;
}

interface PaymentTrendChartProps {
  data: PaymentTrendData[];
}

export default function PaymentTrendChart({ data }: PaymentTrendChartProps) {
  return (
    <div className="chart-container">
      <h3 className="chart-title">Collection Trend</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="month"
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
              tickLine={{ stroke: 'var(--color-border)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
              tickLine={{ stroke: 'var(--color-border)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }}
              formatter={(value, name) => {
                const numValue = typeof value === 'number' ? value : 0;
                return [
                  `$${numValue.toLocaleString()}`,
                  name === 'collected' ? 'Collected' : 'Expected'
                ];
              }}
            />
            <Line
              type="monotone"
              dataKey="expected"
              stroke="var(--color-text-secondary)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="expected"
            />
            <Line
              type="monotone"
              dataKey="collected"
              stroke="var(--color-primary)"
              strokeWidth={3}
              dot={{ fill: 'var(--color-primary)', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: 'var(--color-primary)' }}
              name="collected"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <style jsx>{`
        .chart-container {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 20px;
        }

        .chart-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 16px;
        }

        .chart-wrapper {
          width: 100%;
          height: 240px;
        }
      `}</style>
    </div>
  );
}
