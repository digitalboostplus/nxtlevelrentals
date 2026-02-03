import { useState } from 'react';
import type { PropertyRentStatus } from '@/types/rent-tracking';
import { useRouter } from 'next/router';

interface MonthlyPaymentGridProps {
  properties: PropertyRentStatus[];
  onRecordPayment?: (propertyId: string) => void;
}

type SortField = 'property' | 'tenant' | 'amount' | 'dueDate' | 'status';
type SortOrder = 'asc' | 'desc';

function ExportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 15v4h16v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function RecordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function MonthlyPaymentGrid({ properties, onRecordPayment }: MonthlyPaymentGridProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('property');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return '';
    return sortOrder === 'asc' ? String.fromCharCode(0x2191) : String.fromCharCode(0x2193);
  };

  const sortedProperties = [...properties].sort((a, b) => {
    let compareValue = 0;

    switch (sortField) {
      case 'property':
        compareValue = a.propertyName.localeCompare(b.propertyName);
        break;
      case 'tenant':
        compareValue = a.tenantName.localeCompare(b.tenantName);
        break;
      case 'amount':
        compareValue = a.monthlyRent - b.monthlyRent;
        break;
      case 'dueDate':
        compareValue = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        break;
      case 'status':
        const statusOrder = { overdue: 0, partial: 1, pending: 2, paid: 3 };
        compareValue = statusOrder[a.status] - statusOrder[b.status];
        break;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'status-badge status-badge--paid';
      case 'pending':
        return 'status-badge status-badge--pending';
      case 'overdue':
        return 'status-badge status-badge--overdue';
      case 'partial':
        return 'status-badge status-badge--partial';
      default:
        return 'status-badge';
    }
  };

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

  const exportToCSV = () => {
    const headers = ['Property', 'Address', 'Tenant', 'Monthly Rent', 'Amount Paid', 'Status', 'Due Date'];
    const rows = sortedProperties.map((property) => [
      property.propertyName,
      property.propertyAddress,
      property.tenantName,
      property.monthlyRent,
      property.amountPaid,
      property.status,
      formatDate(property.dueDate)
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rent-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="payment-grid">
      <div className="grid-header">
        <div>
          <h2>Payment Details</h2>
          <p>Track rent status across your portfolio in real time.</p>
        </div>
        <button className="export-btn" onClick={exportToCSV} type="button">
          <ExportIcon />
          Export to CSV
        </button>
      </div>

      <div className="table-wrapper">
        <table className="payment-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort('property')} className="sortable">
                Property {getSortIndicator('property')}
              </th>
              <th onClick={() => toggleSort('tenant')} className="sortable">
                Tenant {getSortIndicator('tenant')}
              </th>
              <th onClick={() => toggleSort('amount')} className="sortable">
                Monthly Rent {getSortIndicator('amount')}
              </th>
              <th>Amount Paid</th>
              <th onClick={() => toggleSort('status')} className="sortable">
                Status {getSortIndicator('status')}
              </th>
              <th onClick={() => toggleSort('dueDate')} className="sortable">
                Due Date {getSortIndicator('dueDate')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedProperties.map((property) => (
              <tr key={property.propertyId}>
                <td>
                  <div className="property-cell">
                    <strong>{property.propertyName}</strong>
                    <span className="address">{property.propertyAddress}</span>
                  </div>
                </td>
                <td>{property.tenantName}</td>
                <td className="amount">${property.monthlyRent.toLocaleString()}</td>
                <td className="amount paid">${property.amountPaid.toLocaleString()}</td>
                <td>
                  <span className={getStatusClass(property.status)}>{property.status}</span>
                </td>
                <td>{formatDate(property.dueDate)}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-view"
                      onClick={() => router.push(`/admin/ledger/${property.tenantId}`)}
                      title="View Ledger"
                      type="button"
                    >
                      <EyeIcon />
                    </button>
                    {property.status !== 'paid' && (
                      <button
                        className="btn-record"
                        onClick={() => onRecordPayment?.(property.propertyId)}
                        title="Record Payment"
                        type="button"
                      >
                        <RecordIcon />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedProperties.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              <span>0</span>
            </div>
            <p>No properties found</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .payment-grid {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          overflow: hidden;
        }

        .grid-header {
          padding: 1.5rem 2rem;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .grid-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: var(--color-text);
        }

        .grid-header p {
          margin: 0.35rem 0 0;
          color: var(--color-muted);
        }

        .export-btn {
          padding: 0.625rem 1.25rem;
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text);
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .export-btn:hover {
          background: rgba(15, 118, 110, 0.08);
          border-color: rgba(15, 118, 110, 0.3);
          transform: translateY(-1px);
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .payment-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 960px;
        }

        thead {
          background: var(--color-surface-elevated);
        }

        th {
          text-align: left;
          padding: 1rem 1.5rem;
          font-size: 0.813rem;
          font-weight: 700;
          color: var(--color-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
          position: sticky;
          top: var(--header-height);
          z-index: 1;
        }

        th.sortable {
          cursor: pointer;
          user-select: none;
          transition: background 0.2s;
        }

        th.sortable:hover {
          background: rgba(15, 118, 110, 0.08);
        }

        td {
          padding: 1rem 1.5rem;
          border-top: 1px solid rgba(15, 118, 110, 0.08);
          font-size: 0.938rem;
          color: var(--color-text);
        }

        tbody tr:nth-child(even) {
          background: rgba(15, 118, 110, 0.04);
        }

        tbody tr:hover {
          background: rgba(15, 118, 110, 0.08);
        }

        .property-cell {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .property-cell strong {
          color: var(--color-text);
        }

        .property-cell .address {
          font-size: 0.813rem;
          color: var(--color-muted);
        }

        .amount {
          font-weight: 600;
          text-align: right;
        }

        .amount.paid {
          color: var(--color-secondary);
        }

        .status-badge {
          display: inline-block;
          padding: 0.375rem 0.875rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-badge--paid {
          background: rgba(15, 118, 110, 0.12);
          color: #0f766e;
        }

        .status-badge--pending {
          background: rgba(3, 105, 161, 0.12);
          color: #075985;
        }

        .status-badge--overdue {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-badge--partial {
          background: #fef3c7;
          color: #92400e;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .btn-view,
        .btn-record {
          padding: 0.5rem;
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
          color: var(--color-text);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .btn-view:hover,
        .btn-record:hover {
          background: rgba(15, 118, 110, 0.08);
          border-color: rgba(15, 118, 110, 0.3);
          transform: translateY(-1px);
        }

        .empty-state {
          padding: 4rem 2rem;
          text-align: center;
          color: var(--color-muted);
        }

        .empty-icon {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: 2px dashed var(--color-border);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          font-weight: 700;
          color: var(--color-muted);
        }

        @media (max-width: 1024px) {
          th,
          td {
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
          }

          .property-cell .address {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
