import React, { useState } from 'react';
import type { PropertyRentStatus } from '@/types/rent-tracking';
import { useRouter } from 'next/router';

interface MonthlyPaymentGridProps {
    properties: PropertyRentStatus[];
    onRecordPayment?: (propertyId: string) => void;
}

type SortField = 'property' | 'tenant' | 'amount' | 'dueDate' | 'status';
type SortOrder = 'asc' | 'desc';

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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return { bg: '#dcfce7', text: '#166534' };
            case 'pending':
                return { bg: '#dbeafe', text: '#1e40af' };
            case 'overdue':
                return { bg: '#fee2e2', text: '#991b1b' };
            case 'partial':
                return { bg: '#fef3c7', text: '#92400e' };
            default:
                return { bg: '#f1f5f9', text: '#475569' };
        }
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    const exportToCSV = () => {
        const headers = ['Property', 'Address', 'Tenant', 'Monthly Rent', 'Amount Paid', 'Status', 'Due Date'];
        const rows = sortedProperties.map(p => [
            p.propertyName,
            p.propertyAddress,
            p.tenantName,
            p.monthlyRent,
            p.amountPaid,
            p.status,
            formatDate(p.dueDate)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rent-payments-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="payment-grid">
            <div className="grid-header">
                <h2>Payment Details</h2>
                <button className="export-btn" onClick={exportToCSV}>
                    📥 Export to CSV
                </button>
            </div>

            <div className="table-wrapper">
                <table className="payment-table">
                    <thead>
                        <tr>
                            <th onClick={() => toggleSort('property')} className="sortable">
                                Property {sortField === 'property' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => toggleSort('tenant')} className="sortable">
                                Tenant {sortField === 'tenant' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => toggleSort('amount')} className="sortable">
                                Monthly Rent {sortField === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th>Amount Paid</th>
                            <th onClick={() => toggleSort('status')} className="sortable">
                                Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => toggleSort('dueDate')} className="sortable">
                                Due Date {sortField === 'dueDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedProperties.map((property) => {
                            const statusColors = getStatusColor(property.status);
                            return (
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
                                        <span
                                            className="status-badge"
                                            style={{
                                                backgroundColor: statusColors.bg,
                                                color: statusColors.text
                                            }}
                                        >
                                            {property.status}
                                        </span>
                                    </td>
                                    <td>{formatDate(property.dueDate)}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-view"
                                                onClick={() => router.push(`/admin/ledger/${property.tenantId}`)}
                                                title="View Ledger"
                                            >
                                                👁️
                                            </button>
                                            {property.status !== 'paid' && (
                                                <button
                                                    className="btn-record"
                                                    onClick={() => onRecordPayment?.(property.propertyId)}
                                                    title="Record Payment"
                                                >
                                                    💵
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {sortedProperties.length === 0 && (
                    <div className="empty-state">
                        <span className="empty-icon">📋</span>
                        <p>No properties found</p>
                    </div>
                )}
            </div>

            <style jsx>{`
        .payment-grid {
          background: white;
          border-radius: var(--radius-lg);
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .grid-header {
          padding: 1.5rem 2rem;
          border-bottom: 2px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .grid-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #1e293b;
        }

        .export-btn {
          padding: 0.625rem 1.25rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }

        .export-btn:hover {
          background: #e2e8f0;
          transform: translateY(-1px);
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .payment-table {
          width: 100%;
          border-collapse: collapse;
        }

        thead {
          background: #f8fafc;
        }

        th {
          text-align: left;
          padding: 1rem 1.5rem;
          font-size: 0.813rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        th.sortable {
          cursor: pointer;
          user-select: none;
          transition: background 0.2s;
        }

        th.sortable:hover {
          background: #f1f5f9;
        }

        td {
          padding: 1rem 1.5rem;
          border-top: 1px solid #f1f5f9;
          font-size: 0.938rem;
          color: #475569;
        }

        tbody tr {
          transition: background 0.2s;
        }

        tbody tr:hover {
          background: #fafbfc;
        }

        .property-cell {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .property-cell strong {
          color: #1e293b;
        }

        .property-cell .address {
          font-size: 0.813rem;
          color: #94a3b8;
        }

        .amount {
          font-weight: 600;
          text-align: right;
        }

        .amount.paid {
          color: #10b981;
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

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .btn-view,
        .btn-record {
          padding: 0.5rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: var(--radius-sm);
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-view:hover,
        .btn-record:hover {
          background: #e2e8f0;
          transform: scale(1.1);
        }

        .empty-state {
          padding: 4rem 2rem;
          text-align: center;
        }

        .empty-icon {
          font-size: 4rem;
          opacity: 0.3;
          display: block;
          margin-bottom: 1rem;
        }

        .empty-state p {
          color: #94a3b8;
          font-size: 1.125rem;
        }

        @media (max-width: 1024px) {
          th, td {
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
