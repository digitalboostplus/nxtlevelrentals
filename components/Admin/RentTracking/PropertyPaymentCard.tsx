import React from 'react';
import type { PropertyRentStatus } from '@/types/rent-tracking';

interface PropertyPaymentCardProps {
    property: PropertyRentStatus;
    onViewDetails?: (propertyId: string) => void;
    onRecordPayment?: (propertyId: string) => void;
}

export default function PropertyPaymentCard({
    property,
    onViewDetails,
    onRecordPayment
}: PropertyPaymentCardProps) {

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return { bg: 'var(--tag-success-bg)', text: 'var(--tag-success-text)', border: 'var(--color-border)' };
            case 'pending':
                return { bg: 'var(--tag-info-bg)', text: 'var(--tag-info-text)', border: 'var(--color-border)' };
            case 'overdue':
                return { bg: 'var(--tag-error-bg)', text: 'var(--tag-error-text)', border: 'var(--color-border)' };
            case 'partial':
                return { bg: 'var(--tag-warning-bg)', text: 'var(--tag-warning-text)', border: 'var(--color-border)' };
            default:
                return { bg: 'var(--tag-neutral-bg)', text: 'var(--tag-neutral-text)', border: 'var(--color-border)' };
        }
    };

    const statusColors = getStatusColor(property.status);
    const progressPercentage = property.amountDue > 0
        ? (property.amountPaid / property.amountDue) * 100
        : 0;

    const formatDate = (date?: Date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="property-card">
            <div className="card-header">
                <div className="property-info">
                    <h3 className="property-name">{property.propertyName}</h3>
                    <p className="property-address">{property.propertyAddress}</p>
                    <p className="tenant-name">👤 {property.tenantName}</p>
                </div>
                <span
                    className="status-badge"
                    style={{
                        backgroundColor: statusColors.bg,
                        color: statusColors.text,
                        borderColor: statusColors.border
                    }}
                >
                    {property.status}
                </span>
            </div>

            <div className="card-body">
                <div className="amount-section">
                    <div className="amount-row">
                        <span className="label">Monthly Rent:</span>
                        <span className="value">${property.monthlyRent.toLocaleString()}</span>
                    </div>
                    <div className="amount-row">
                        <span className="label">Amount Paid:</span>
                        <span className="value paid">${property.amountPaid.toLocaleString()}</span>
                    </div>
                    {property.amountPaid < property.amountDue && (
                        <div className="amount-row">
                            <span className="label">Remaining:</span>
                            <span className="value remaining">
                                ${(property.amountDue - property.amountPaid).toLocaleString()}
                            </span>
                        </div>
                    )}
                </div>

                {property.status !== 'pending' && (
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${Math.min(progressPercentage, 100)}%`,
                                backgroundColor: statusColors.text
                            }}
                        />
                    </div>
                )}

                <div className="payment-details">
                    <div className="detail-item">
                        <span className="detail-label">Due Date:</span>
                        <span className="detail-value">{formatDate(property.dueDate)}</span>
                    </div>
                    {property.lastPaymentDate && (
                        <div className="detail-item">
                            <span className="detail-label">Last Payment:</span>
                            <span className="detail-value">{formatDate(property.lastPaymentDate)}</span>
                        </div>
                    )}
                    {property.paymentMethod && (
                        <div className="detail-item">
                            <span className="detail-label">Method:</span>
                            <span className="detail-value">{property.paymentMethod}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="card-footer">
                <button
                    className="btn-secondary"
                    onClick={() => onViewDetails?.(property.propertyId)}
                >
                    View Details
                </button>
                {property.status !== 'paid' && (
                    <button
                        className="btn-primary"
                        onClick={() => onRecordPayment?.(property.propertyId)}
                    >
                        Record Payment
                    </button>
                )}
            </div>

            <style jsx>{`
        .property-card {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .property-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .card-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .property-info {
          flex: 1;
        }

        .property-name {
          margin: 0 0 0.5rem;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text);
        }

        .property-address {
          margin: 0 0 0.5rem;
          font-size: 0.875rem;
          color: var(--color-muted);
        }

        .tenant-name {
          margin: 0;
          font-size: 0.875rem;
          color: var(--color-text);
          font-weight: 500;
        }

        .status-badge {
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-size: 0.813rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: 2px solid;
          white-space: nowrap;
        }

        .card-body {
          padding: 1.5rem;
        }

        .amount-section {
          margin-bottom: 1rem;
        }

        .amount-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
        }

        .amount-row .label {
          font-size: 0.875rem;
          color: var(--color-muted);
          font-weight: 500;
        }

        .amount-row .value {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-text);
        }

        .amount-row .value.paid {
          color: var(--color-success);
        }

        .amount-row .value.remaining {
          color: var(--color-error);
        }

        .progress-bar {
          height: 8px;
          background: var(--color-surface-elevated);
          border-radius: 9999px;
          overflow: hidden;
          margin: 1rem 0;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 9999px;
        }

        .payment-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.813rem;
        }

        .detail-label {
          color: var(--color-muted);
          font-weight: 500;
        }

        .detail-value {
          color: var(--color-text);
          font-weight: 600;
        }

        .card-footer {
          padding: 1rem 1.5rem;
          background: var(--color-surface-elevated);
          border-top: 1px solid var(--color-border);
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .btn-secondary,
        .btn-primary {
          padding: 0.625rem 1.25rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-secondary {
          background: var(--color-surface);
          color: var(--color-text);
          border: 1px solid var(--color-border);
        }

        .btn-secondary:hover {
          background: var(--color-surface-elevated);
          border-color: var(--color-border);
        }

        .btn-primary {
          background: var(--color-primary);
          color: white;
        }

        .btn-primary:hover {
          background: var(--color-primary-dark);
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .card-header {
            flex-direction: column;
          }

          .status-badge {
            align-self: flex-start;
          }

          .card-footer {
            flex-direction: column;
          }

          .btn-secondary,
          .btn-primary {
            width: 100%;
          }
        }
      `}</style>
        </div>
    );
}

