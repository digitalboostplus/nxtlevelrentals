interface CollectionGaugeProps {
  percentage: number;
  collected: number;
  expected: number;
}

export default function CollectionGauge({ percentage, collected, expected }: CollectionGaugeProps) {
  // Calculate stroke dashoffset for the progress arc
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Determine color based on percentage
  const getColor = () => {
    if (percentage >= 90) return 'var(--color-success, #22c55e)';
    if (percentage >= 70) return 'var(--color-primary)';
    if (percentage >= 50) return 'var(--color-warning, #eab308)';
    return 'var(--color-error, #ef4444)';
  };

  return (
    <div className="gauge-container">
      <h3 className="gauge-title">Collection Rate</h3>
      <div className="gauge-wrapper">
        <svg viewBox="0 0 160 160" className="gauge-svg">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 80 80)"
            className="gauge-progress"
          />
        </svg>
        <div className="gauge-center">
          <span className="gauge-percentage">{Math.round(percentage)}%</span>
          <span className="gauge-label">Collected</span>
        </div>
      </div>
      <div className="gauge-stats">
        <div className="gauge-stat">
          <span className="gauge-stat-value">${collected.toLocaleString()}</span>
          <span className="gauge-stat-label">Collected</span>
        </div>
        <div className="gauge-stat">
          <span className="gauge-stat-value">${expected.toLocaleString()}</span>
          <span className="gauge-stat-label">Expected</span>
        </div>
      </div>

      <style jsx>{`
        .gauge-container {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .gauge-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 16px;
          align-self: flex-start;
        }

        .gauge-wrapper {
          position: relative;
          width: 160px;
          height: 160px;
        }

        .gauge-svg {
          width: 100%;
          height: 100%;
        }

        .gauge-progress {
          transition: stroke-dashoffset 1s ease-out;
        }

        .gauge-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .gauge-percentage {
          display: block;
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-text);
          line-height: 1;
        }

        .gauge-label {
          display: block;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          margin-top: 4px;
        }

        .gauge-stats {
          display: flex;
          gap: 32px;
          margin-top: 16px;
          width: 100%;
          justify-content: center;
        }

        .gauge-stat {
          text-align: center;
        }

        .gauge-stat-value {
          display: block;
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .gauge-stat-label {
          display: block;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}
