import { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import AdminLayout from '@/components/Admin/AdminLayout';
import PageHeader from '@/components/common/PageHeader';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
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

            <PageHeader
                title="Rent Payment Tracking"
                subtitle="Monitor rent payments across all properties"
                actions={
                    <button
                        className="refresh-btn"
                        onClick={fetchData}
                        disabled={loading}
                    >
                        🔄 Refresh
                    </button>
                }
            />

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
                    <LoadingState message="Loading payment data..." />
                ) : filteredProperties.length === 0 ? (
                    <EmptyState
                        icon="🏘️"
                        title="No properties found"
                        description={
                            filters.status !== 'all' || filters.searchQuery
                                ? 'Try adjusting your filters'
                                : 'No properties available for this month'
                        }
                    />
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
        .refresh-btn {
          padding: 0.75rem 1.5rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.938rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .refresh-btn:hover:not(:disabled) {
          background: var(--color-background);
          border-color: var(--color-primary);
          color: var(--color-text);
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .content-section {
          padding: 0 2rem 2rem;
        }

        .properties-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 2rem;
        }

        @media (max-width: 768px) {
          .properties-grid {
            grid-template-columns: 1fr;
          }

          .content-section {
            padding: 0 1rem 1rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .refresh-btn {
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
        </AdminLayout>
    );
};

RentPaymentsPage.requireAuth = true;
RentPaymentsPage.allowedRoles = ['admin', 'super-admin'];

export default RentPaymentsPage;
