import React from 'react';
import type { RentPaymentFilters, PaymentStatus } from '@/types/rent-tracking';

interface PaymentFiltersProps {
    filters: RentPaymentFilters;
    onFiltersChange: (filters: RentPaymentFilters) => void;
    selectedMonth: string;
    onMonthChange: (month: string) => void;
    viewMode: 'grid' | 'table';
    onViewModeChange: (mode: 'grid' | 'table') => void;
}

export default function PaymentFilters({
    filters,
    onFiltersChange,
    selectedMonth,
    onMonthChange,
    viewMode,
    onViewModeChange
}: PaymentFiltersProps) {

    const handleStatusChange = (status: 'all' | PaymentStatus) => {
        onFiltersChange({ ...filters, status });
    };

    const handleSearchChange = (searchQuery: string) => {
        onFiltersChange({ ...filters, searchQuery });
    };

    const handleSortChange = (sortBy: RentPaymentFilters['sortBy']) => {
        onFiltersChange({ ...filters, sortBy });
    };

    const handleSortOrderToggle = () => {
        onFiltersChange({
            ...filters,
            sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
        });
    };

    // Generate month options (current month and 11 previous months)
    const getMonthOptions = () => {
        const options = [];
        const now = new Date();

        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = date.toISOString().slice(0, 7);
            const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            options.push({ value: monthStr, label });
        }

        return options;
    };

    const monthOptions = getMonthOptions();

    return (
        <div className="payment-filters">
            <div className="filters-row">
                <div className="filter-group">
                    <label htmlFor="month-select">Month</label>
                    <select
                        id="month-select"
                        value={selectedMonth}
                        onChange={(e) => onMonthChange(e.target.value)}
                        className="select-input"
                    >
                        {monthOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="search-input">Search</label>
                    <input
                        id="search-input"
                        type="text"
                        placeholder="Search property or tenant..."
                        value={filters.searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="filter-group">
                    <label htmlFor="status-select">Status</label>
                    <select
                        id="status-select"
                        value={filters.status}
                        onChange={(e) => handleStatusChange(e.target.value as any)}
                        className="select-input"
                    >
                        <option value="all">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="overdue">Overdue</option>
                        <option value="partial">Partial</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="sort-select">Sort By</label>
                    <div className="sort-controls">
                        <select
                            id="sort-select"
                            value={filters.sortBy}
                            onChange={(e) => handleSortChange(e.target.value as any)}
                            className="select-input"
                        >
                            <option value="property">Property</option>
                            <option value="tenant">Tenant</option>
                            <option value="amount">Amount</option>
                            <option value="dueDate">Due Date</option>
                            <option value="status">Status</option>
                        </select>
                        <button
                            className="sort-order-btn"
                            onClick={handleSortOrderToggle}
                            title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                        >
                            {filters.sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                </div>

                <div className="filter-group view-toggle">
                    <label>View</label>
                    <div className="toggle-buttons">
                        <button
                            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => onViewModeChange('grid')}
                            title="Grid View"
                        >
                            ⊞
                        </button>
                        <button
                            className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => onViewModeChange('table')}
                            title="Table View"
                        >
                            ☰
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
        .payment-filters {
          background: white;
          border-radius: var(--radius-lg);
          border: 1px solid #e2e8f0;
          padding: 1.5rem 2rem;
          margin-bottom: 2rem;
        }

        .filters-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          align-items: end;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-group label {
          font-size: 0.813rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .select-input,
        .search-input {
          padding: 0.75rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: var(--radius-md);
          font-size: 0.938rem;
          color: #1e293b;
          background: white;
          transition: all 0.2s;
        }

        .select-input:focus,
        .search-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
        }

        .search-input::placeholder {
          color: #94a3b8;
        }

        .sort-controls {
          display: flex;
          gap: 0.5rem;
        }

        .sort-controls .select-input {
          flex: 1;
        }

        .sort-order-btn {
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: var(--radius-md);
          font-size: 1.25rem;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 48px;
        }

        .sort-order-btn:hover {
          background: #e2e8f0;
        }

        .view-toggle {
          max-width: 150px;
        }

        .toggle-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .toggle-btn {
          flex: 1;
          padding: 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: var(--radius-md);
          font-size: 1.25rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-btn:hover {
          background: #e2e8f0;
        }

        .toggle-btn.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        @media (max-width: 1024px) {
          .filters-row {
            grid-template-columns: 1fr 1fr;
          }

          .filter-group.view-toggle {
            max-width: none;
          }
        }

        @media (max-width: 640px) {
          .payment-filters {
            padding: 1rem;
          }

          .filters-row {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }
      `}</style>
        </div>
    );
}

