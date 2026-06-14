import React from 'react';
import type { PaymentPlan } from '@/lib/firebase-utils';
import { formatLocalDate } from '@/lib/date';

interface PaymentPlanCardProps {
    plan: PaymentPlan;
}

export default function PaymentPlanCard({ plan }: PaymentPlanCardProps) {
    const progress = ((plan.totalAmount - plan.remainingAmount) / plan.totalAmount) * 100;

    return (
        <div className="plan-card">
            <div className="plan-header">
                <div>
                    <h3>Active Payment Plan</h3>
                    <p className="plan-dates">Started {formatLocalDate(plan.startDate?.toDate ? plan.startDate.toDate() : plan.startDate)}</p>
                </div>
                <span className={`status-badge status--${plan.status}`}>{plan.status}</span>
            </div>

            <div className="plan-stats">
                <div className="stat">
                    <span className="stat-label">Total Amount</span>
                    <span className="stat-value">${plan.totalAmount.toFixed(2)}</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Remaining</span>
                    <span className="stat-value">${plan.remainingAmount.toFixed(2)}</span>
                </div>
            </div>

            <div className="progress-container">
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="progress-text">{progress.toFixed(0)}% Complete</span>
            </div>

            <div className="installments-preview">
                <h4>Upcoming Installments</h4>
                <ul>
                    {plan.installments.filter(i => i.status === 'pending').slice(0, 3).map((inst, idx) => (
                        <li key={idx}>
                            <span>{formatLocalDate(inst.dueDate?.toDate ? inst.dueDate.toDate() : inst.dueDate)}</span>
                            <strong>${inst.amount.toFixed(2)}</strong>
                        </li>
                    ))}
                </ul>
            </div>

            <style jsx>{`
        .plan-card {
          background: var(--color-surface);
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-sm);
        }

        .plan-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        h3 {
          margin: 0;
          font-size: 1.1rem;
          color: var(--color-text);
        }

        .plan-dates {
          font-size: 0.85rem;
          color: var(--color-muted);
          margin: 0.25rem 0 0;
        }

        .status-badge {
          padding: 0.25rem 0.6rem;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status--active { background: var(--tag-success-bg); color: var(--tag-success-text); }
        .status--broken { background: var(--tag-error-bg); color: var(--tag-error-text); }

        .plan-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat {
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--color-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text);
        }

        .progress-container {
          margin-bottom: 1.5rem;
        }

        .progress-bar {
          height: 8px;
          background: var(--color-surface-elevated);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: var(--color-secondary);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.8rem;
          color: var(--color-muted);
        }

        .installments-preview h4 {
          font-size: 0.85rem;
          color: var(--color-text);
          margin-bottom: 0.75rem;
        }

        ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        li {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          font-size: 0.9rem;
          border-top: 1px solid var(--color-border);
        }
      `}</style>
        </div>
    );
}
