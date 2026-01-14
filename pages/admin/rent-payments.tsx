import { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import AdminLayout from '@/components/Admin/AdminLayout';
import PaymentSummaryStats from '@/components/Admin/RentTracking/PaymentSummaryStats';
import PaymentFilters from '@/components/Admin/RentTracking/PaymentFilters';
import MonthlyPaymentGrid from '@/components/Admin/RentTracking/MonthlyPaymentGrid';
import PropertyPaymentCard from '@/components/Admin/RentTracking/PropertyPaymentCard';
import RecordPaymentModal from '@/components/Admin/RecordPaymentModal';
import { rentTrackingUtils } from '@/lib/firebase-utils';
import type { PropertyRentStatus, MonthlyPaymentSummary, RentPaymentFilters } from '@/types/rent-tracking';
import type { NextPageWithAuth } from '../_app';

const RentPaymentsPage: NextPageWithAuth = () => {
    const [properties, setProperties] = useState<PropertyRentStatus[]>([]);
    const [summary, setSummary] = useState<MonthlyPaymentSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

    const [filters, setFilters] = useState<RentPaymentFilters>({
        status: 'all',
        searchQuery: '',
        sortBy: 'property',
        sortOrder: 'asc'
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [propertiesData, summaryData] = await Promise.all([
                rentTrackingUtils.getAllPropertiesRentStatus(selectedMonth),
                rentTrackingUtils.getMonthlyPaymentSummary(selectedMonth)
            ]);

            setProperties(propertiesData);
            setSummary(summaryData);
        } catch (error) {
            console.error('Failed to fetch rent payment data:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filter and sort properties
    const filteredProperties = useMemo(() => {
        let filtered = [...properties];

        // Apply status filter
        if (filters.status !== 'all') {
            filtered = filtered.filter(p => p.status === filters.status);
        }

        // Apply search filter
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.propertyName.toLowerCase().includes(query) ||
                p.propertyAddress.toLowerCase().includes(query) ||
                p.tenantName.toLowerCase().includes(query)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let compareValue = 0;

            switch (filters.sortBy) {
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

            return filters.sortOrder === 'asc' ? compareValue : -compareValue;
        });

        return filtered;
    }, [properties, filters]);

    const handleRecordPayment = (propertyId: string) => {
        setSelectedPropertyId(propertyId);
        setIsRecordPaymentModalOpen(true);
    };

    const handleRecordPaymentSuccess = () => {
        setIsRecordPaymentModalOpen(false);
        setSelectedPropertyId(null);
        fetchData(); // Refresh data
    };

    return (
        <AdminLayout title="Rent Payments">
            <Head>
                <title>Rent Payments - Admin - Next Level Rentals</title>
            </Head>

            <div className="page-header">
                <div>
                    <h1>Rent Payment Tracking</h1>
                    <p>Monitor rent payments across all properties</p>
                </div>
                <div className="header-actions">
                    <button
                        className="refresh-btn"
                        onClick={fetchData}
                        disabled={loading}
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {summary && <PaymentSummaryStats summary={summary} loading={loading} />}

            <PaymentFilters
                filters={filters}
                onFiltersChange={setFilters}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
            />

            <div className="content-section">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading payment data...</p>
                    </div>
                ) : filteredProperties.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">🏘️</span>
                        <h3>No properties found</h3>
                        <p>
                            {filters.status !== 'all' || filters.searchQuery
                                ? 'Try adjusting your filters'
                                : 'No properties available for this month'}
                        </p>
                    </div>
                ) : viewMode === 'table' ? (
                    <MonthlyPaymentGrid
                        properties={filteredProperties}
                        onRecordPayment={handleRecordPayment}
                    />
                ) : (
                    <div className="properties-grid">
                        {filteredProperties.map(property => (
                            <PropertyPaymentCard
                                key={property.propertyId}
                                property={property}
                                onRecordPayment={handleRecordPayment}
                            />
                        ))}
                    </div>
                )}
            </div>

            <RecordPaymentModal
                isOpen={isRecordPaymentModalOpen}
                onClose={() => {
                    setIsRecordPaymentModalOpen(false);
                    setSelectedPropertyId(null);
                }}
                onSuccess={handleRecordPaymentSuccess}
            />

            <style jsx>{`
        .page-header {
          padding: 2rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .page-header h1 {
          margin: 0 0 0.5rem;
          font-size: 2rem;
          color: #1e293b;
        }

        .page-header p {
          margin: 0;
          color: #64748b;
          font-size: 1rem;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
        }

        .refresh-btn {
          padding: 0.75rem 1.5rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: var(--radius-md);
          font-size: 0.938rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .content-section {
          padding: 0 2rem 2rem;
        }

        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          background: white;
          border-radius: var(--radius-lg);
          border: 1px solid #e2e8f0;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e2e8f0;
          border-top-color: var(--color-primary, #6c5ce7);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-state p {
          color: #64748b;
          font-size: 1rem;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.3;
        }

        .empty-state h3 {
          margin: 0 0 0.5rem;
          color: #475569;
          font-size: 1.25rem;
        }

        .empty-state p {
          margin: 0;
          color: #94a3b8;
        }

        .properties-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 2rem;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .properties-grid {
            grid-template-columns: 1fr;
          }

          .content-section {
            padding: 0 1rem 1rem;
          }
        }
      `}</style>
        </AdminLayout>
    );
};

RentPaymentsPage.requireAuth = true;
RentPaymentsPage.allowedRoles = ['admin', 'super-admin'];

export default RentPaymentsPage;
