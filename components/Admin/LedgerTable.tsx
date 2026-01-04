import React, { useState } from 'react';
import type { LedgerEntry } from '@/lib/firebase-utils';
import { formatLocalDate } from '@/lib/date';

interface LedgerTableProps {
    entries: LedgerEntry[];
}

type SortField = 'date' | 'amount' | 'type' | 'category' | 'status' | 'description';
type SortOrder = 'asc' | 'desc';

export default function LedgerTable({ entries }: LedgerTableProps) {
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const sortedEntries = [...entries]
        .filter(entry => {
            if (filterType !== 'all' && entry.type !== filterType) return false;
            if (filterStatus !== 'all' && entry.status !== filterStatus) return false;
            return true;
        })
        .sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            // Handle Timestamp/Date objects for sorting
            if (sortField === 'date') {
                const dateA = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
                const dateB = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortOrder === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            }

            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortOrder === 'asc' ? valA - valB : valB - valA;
            }

            return 0;
        });

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'tag--success';
            case 'overdue': return 'tag--error';
            case 'pending': return 'tag--warning';
            default: return 'tag--muted';
        }
    };

    return (
        <div className="ledger-container">
            <div className="ledger-controls">
                <div className="filter-group">
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                        <option value="all">All Types</option>
                        <option value="charge">Charges</option>
                        <option value="payment">Payments</option>
                        <option value="adjustment">Adjustments</option>
                    </select>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="all">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="overdue">Overdue</option>
                    </select>
                </div>
            </div>

            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th onClick={() => toggleSort('date')} style={{ cursor: 'pointer' }}>
                                Date {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => toggleSort('description')} style={{ cursor: 'pointer' }}>
                                Description
                            </th>
                            <th onClick={() => toggleSort('category')} style={{ cursor: 'pointer' }}>
                                Category
                            </th>
                            <th onClick={() => toggleSort('amount')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                                Amount {sortField === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => toggleSort('status')} style={{ cursor: 'pointer' }}>
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedEntries.map((entry) => (
                            <tr key={entry.id}>
                                <td>{formatLocalDate(entry.date?.toDate ? entry.date.toDate() : entry.date)}</td>
                                <td>{entry.description}</td>
                                <td style={{ textTransform: 'capitalize' }}>{entry.category.replace('_', ' ')}</td>
                                <td style={{
                                    textAlign: 'right',
                                    fontWeight: 'bold',
                                    color: entry.type === 'payment' ? 'var(--color-secondary)' : 'var(--color-primary)'
                                }}>
                                    {entry.type === 'payment' ? '-' : ''}${Math.abs(entry.amount).toFixed(2)}
                                </td>
                                <td>
                                    <span className={`tag ${getStatusColor(entry.status)}`}>
                                        {entry.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {sortedEntries.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>
                                    No ledger entries found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <style jsx>{`
        .ledger-container {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          border: 1px solid rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }

        .ledger-controls {
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }

        .filter-group {
          display: flex;
          gap: 0.5rem;
        }

        select {
          padding: 0.5rem;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: white;
          font-size: 0.875rem;
          color: #475569;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          padding: 1rem 1.5rem;
          text-align: left;
          font-size: 0.95rem;
        }

        thead {
          background: #f1f5f9;
        }

        th {
          font-weight: 600;
          color: #475569;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          user-select: none;
        }

        tbody tr {
          border-bottom: 1px solid rgba(15, 23, 42, 0.04);
          transition: background 0.2s;
        }

        tbody tr:hover {
          background: rgba(15, 23, 42, 0.01);
        }

        .tag--error { background: #fee2e2; color: #991b1b; }
        .tag--warning { background: #fef3c7; color: #92400e; }
        .tag--success { background: #dcfce7; color: #166534; }
        .tag--muted { background: #f1f5f9; color: #475569; }
      `}</style>
        </div>
    );
}
