import React from 'react';
import type { MonthlyPaymentSummary } from '@/types/rent-tracking';

interface PaymentSummaryStatsProps {
    summary: MonthlyPaymentSummary;
    loading?: boolean;
}

export default function PaymentSummaryStats({ summary, loading }: PaymentSummaryStatsProps) {
    if (loading) {
        return (
            <div className="summary-stats loading">
                <div className="spinner"></div>
                <p>Loading statistics...</p>
                <style jsx>{`
          .summary-stats.loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            padding: 3rem;
            background: white;
            border-radius: var(--radius-lg);
            border: 1px solid #e2e8f0;
          }
          .spinner {
            width: 24px;
            height: 24px;
            border: 3px solid #e2e8f0;
            border-top-color: var(--color-primary, #6c5ce7);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
            </div>
        );
    }

    const stats = [
        {
            label: 'Total Properties',
            value: summary.totalProperties,
            color: '#64748b',
            icon: '🏘️'
        },
        {
            label: 'Paid',
            value: summary.paidCount,
            percentage: summary.totalProperties > 0 ? (summary.paidCount / summary.totalProperties * 100).toFixed(1) : '0',
            color: '#10b981',
            icon: '✅'
        },
        {
            label: 'Pending',
            value: summary.pendingCount,
            percentage: summary.totalProperties > 0 ? (summary.pendingCount / summary.totalProperties * 100).toFixed(1) : '0',
            color: '#3b82f6',
            icon: '⏳'
        },
        {
            label: 'Overdue',
            value: summary.overdueCount,
            percentage: summary.totalProperties > 0 ? (summary.overdueCount / summary.totalProperties * 100).toFixed(1) : '0',
            color: '#ef4444',
            icon: '⚠️'
        },
        {
            label: 'Partial',
            value: summary.partialCount,
            percentage: summary.totalProperties > 0 ? (summary.partialCount / summary.totalProperties * 100).toFixed(1) : '0',
            color: '#f59e0b',
            icon: '📊'
        }
    ];

    return (
        <div className="summary-stats">
            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <div key={index} className="stat-card">
                        <div className="stat-icon">{stat.icon}</div>
                        <div className="stat-content">
                            <div className="stat-label">{stat.label}</div>
                            <div className="stat-value" style={{ color: stat.color }}>
                                {stat.value}
                                {stat.percentage && (
                                    <span className="stat-percentage">({stat.percentage}%)</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="revenue-summary">
                <div className="revenue-item">
                    <span className="revenue-label">Total Expected</span>
                    <span className="revenue-value">${summary.totalExpected.toLocaleString()}</span>
                </div>
                <div className="revenue-item">
                    <span className="revenue-label">Total Collected</span>
                    <span className="revenue-value collected">${summary.totalCollected.toLocaleString()}</span>
                </div>
                <div className="revenue-item highlight">
                    <span className="revenue-label">Collection Rate</span>
                    <span className="revenue-value rate">{summary.collectionRate.toFixed(1)}%</span>
                </div>
            </div>

            <style jsx>{`
        .summary-stats {
          background: white;
          border-radius: var(--radius-lg);
          border: 1px solid #e2e8f0;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: var(--radius-md);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .stat-icon {
          font-size: 2rem;
          line-height: 1;
        }

        .stat-content {
          flex: 1;
        }

        .stat-label {
          font-size: 0.813rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          line-height: 1;
        }

        .stat-percentage {
          font-size: 0.875rem;
          margin-left: 0.5rem;
          opacity: 0.7;
        }

        .revenue-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          padding-top: 2rem;
          border-top: 2px solid #e2e8f0;
        }

        .revenue-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .revenue-item.highlight {
          background: linear-gradient(135deg, #6c5ce7 0%, #5b4bc9 100%);
          padding: 1.25rem;
          border-radius: var(--radius-md);
        }

        .revenue-item.highlight .revenue-label,
        .revenue-item.highlight .revenue-value {
          color: white;
        }

        .revenue-label {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .revenue-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }

        .revenue-value.collected {
          color: #10b981;
        }

        .revenue-value.rate {
          font-size: 2rem;
        }

        @media (max-width: 768px) {
          .summary-stats {
            padding: 1.5rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .revenue-summary {
            grid-template-columns: 1fr;
          }

          .stat-value {
            font-size: 1.5rem;
          }
        }
      `}</style>
        </div>
    );
}
