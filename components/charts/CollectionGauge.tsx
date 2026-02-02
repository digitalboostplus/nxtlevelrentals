import { useEffect, useState } from 'react';
import { formatCurrency, generateChartAriaLabel, getAnimationDuration } from '@/lib/chart-utils';
import { getCollectionRateColor } from '@/lib/chart-config';

interface CollectionGaugeProps {
  percentage: number;
  collected: number;
  expected: number;
}

export default function CollectionGauge({ percentage, collected, expected }: CollectionGaugeProps) {
  const [displayPercentage, setDisplayPercentage] = useState(0);

  // Animate percentage counter on mount
  useEffect(() => {
    const duration = getAnimationDuration(1000);
    if (duration === 0) {
      setDisplayPercentage(percentage);
      return;
    }

    const increment = percentage / (duration / 16); // ~60fps
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= percentage) {
        setDisplayPercentage(percentage);
        clearInterval(timer);
      } else {
        setDisplayPercentage(current);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [percentage]);

  // Calculate stroke dashoffset for the progress arc
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Determine color based on percentage using config
  const color = getCollectionRateColor(percentage);

  // Generate accessible label
  const ariaLabel = generateChartAriaLabel(
    'Collection rate gauge',
    1,
    `${Math.round(percentage)}% collection rate. ${formatCurrency(collected)} collected out of ${formatCurrency(expected)} expected`
  );

  return (
    <div className="gauge-container" role="img" aria-label={ariaLabel}>
      <h3 className="gauge-title">Collection Rate</h3>
      <div className="gauge-wrapper">
        <svg viewBox="0 0 160 160" className="gauge-svg" aria-hidden="true">
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
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 80 80)"
            className="gauge-progress"
          />
        </svg>
        <div className="gauge-center">
          <span className="gauge-percentage">{Math.round(displayPercentage)}%</span>
          <span className="gauge-label">Collected</span>
        </div>
      </div>
      <div className="gauge-stats">
        <div className="gauge-stat">
          <span className="gauge-stat-value">{formatCurrency(collected)}</span>
          <span className="gauge-stat-label">Collected</span>
        </div>
        <div className="gauge-stat">
          <span className="gauge-stat-value">{formatCurrency(expected)}</span>
          <span className="gauge-stat-label">Expected</span>
        </div>
      </div>

      <style jsx>{`
        .gauge-container {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }

        .gauge-container:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .gauge-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 1rem;
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
          transition: stroke-dashoffset var(--transition-slow);
        }

        .gauge-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          transition: transform var(--transition-fast);
        }

        .gauge-container:hover .gauge-center {
          transform: translate(-50%, -50%) scale(1.05);
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
          margin-top: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .gauge-stats {
          display: flex;
          gap: 2rem;
          margin-top: 1rem;
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
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 0.25rem;
        }

        @media (prefers-reduced-motion: reduce) {
          .gauge-container,
          .gauge-progress,
          .gauge-center {
            transition-duration: 0.01ms !important;
          }

          .gauge-container:hover {
            transform: none;
          }

          .gauge-container:hover .gauge-center {
            transform: translate(-50%, -50%);
          }
        }

        @media (max-width: 640px) {
          .gauge-wrapper {
            width: 140px;
            height: 140px;
          }

          .gauge-percentage {
            font-size: 1.75rem;
          }
        }
      `}</style>
    </div>
  );
}
