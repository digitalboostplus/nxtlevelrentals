import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import AdminHero from '@/components/Admin/AdminHero';
import PortfolioSummary from '@/components/Admin/PortfolioSummary';
import WorkOrderTable from '@/components/Admin/WorkOrderTable';
import DocumentQueue from '@/components/Admin/DocumentQueue';
import AddTenantModal from '@/components/Admin/AddTenantModal';
import RecordPaymentModal from '@/components/Admin/RecordPaymentModal';
import CollectionGauge from '@/components/charts/CollectionGauge';
import RentStatusBar from '@/components/charts/RentStatusBar';
import PaymentTrendChart from '@/components/charts/PaymentTrendChart';
import { adminUtils, rentTrackingUtils } from '@/lib/firebase-utils';
import {
  documentTasks,
  highPriorityWorkOrders,
  portfolioMetrics,
} from '@/data/admin';
import type { NextPageWithAuth } from '../_app';

// Helper function to generate sample trend data
function generateTrendData(currentCollected: number) {
  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
  const baseExpected = currentCollected * 1.1; // Assume expected is about 10% more

  return months.map((month, i) => ({
    month,
    collected: Math.round(currentCollected * (0.85 + Math.random() * 0.3)),
    expected: Math.round(baseExpected * (0.95 + Math.random() * 0.1))
  }));
}

const AdminPage: NextPageWithAuth = () => {
  const [stats, setStats] = useState<any>(null);
  const [rentSummary, setRentSummary] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [portfolioData, rentData] = await Promise.all([
        adminUtils.getPortfolioStats(),
        rentTrackingUtils.getMonthlyPaymentSummary()
      ]);
      setStats(portfolioData);
      setRentSummary(rentData);
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Update portfolio metrics with dynamic data if available
  const dynamicMetrics = stats ? [
    { ...portfolioMetrics[0], value: stats.activeTenants.toString(), trendValue: '+2.4%' },
    { ...portfolioMetrics[1], value: `$${stats.overdueAmount.toLocaleString()}`, trendValue: '-5.1%' },
    { id: 'total-value', label: 'Portfolio Value', value: `$${stats.totalRentValue.toLocaleString()}`, trend: 'steady', trendValue: '0%' }
  ] : portfolioMetrics;

  return (
    <AdminLayout title="Dashboard">
      <AdminHero
        managerName="Alex Jordan"
        portfolioLabel="Next Level Management"
        stats={
          <>
            <div className="admin-stat">
              <span className="admin-stat__label">Properties</span>
              <span className="admin-stat__value">{stats?.totalProperties || '--'}</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat__label">Active Tenants</span>
              <span className="admin-stat__value">{stats?.activeTenants || '--'}</span>
            </div>
          </>
        }
      />

      <AddTenantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refreshData}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        onSuccess={refreshData}
      />

      <div className="admin-actions">
        <button
          className="secondary-button"
          onClick={() => setIsRecordPaymentModalOpen(true)}
        >
          💵 Record Payment
        </button>
        <button
          className="primary-button"
          onClick={() => setIsAddModalOpen(true)}
        >
          ➕ Add Tenant
        </button>
      </div>

      <PortfolioSummary metrics={dynamicMetrics as any} />

      {rentSummary && (
        <>
          <div className="rent-quick-link">
            <div className="quick-link-card">
              <div className="card-header">
                <h3>Rent Payment Tracking</h3>
                <Link href="/admin/rent-payments" className="view-all-link">View All</Link>
              </div>
              <div className="card-stats">
                <div className="stat-item">
                  <span className="stat-label">Collection Rate</span>
                  <span className="stat-value rate">{rentSummary.collectionRate.toFixed(1)}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Overdue</span>
                  <span className="stat-value overdue">{rentSummary.overdueCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Collected</span>
                  <span className="stat-value collected">${rentSummary.totalCollected.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="analytics-grid">
            <CollectionGauge
              percentage={rentSummary.collectionRate}
              collected={rentSummary.totalCollected}
              expected={rentSummary.totalExpected || rentSummary.totalCollected * (100 / Math.max(rentSummary.collectionRate, 1))}
            />
            <RentStatusBar
              data={{
                paid: rentSummary.paidCount || 0,
                pending: rentSummary.pendingCount || 0,
                partial: rentSummary.partialCount || 0,
                overdue: rentSummary.overdueCount || 0
              }}
            />
            <PaymentTrendChart
              data={generateTrendData(rentSummary.totalCollected)}
            />
          </div>
        </>
      )}

      <div className="admin-sections">
        <WorkOrderTable workOrders={highPriorityWorkOrders} />
        <DocumentQueue tasks={documentTasks} />
      </div>

      <style jsx>{`
        .admin-actions {
          padding: 0 2rem 2rem;
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .admin-sections {
          padding: 0 2rem 2rem;
          display: grid;
          gap: 2rem;
        }

        @media (min-width: 1200px) {
          .admin-sections {
            grid-template-columns: 1fr 1fr;
          }
        }

        .rent-quick-link {
          padding: 0 2rem 2rem;
        }

        .quick-link-card {
          background: linear-gradient(135deg, #6c5ce7 0%, #5b4bc9 100%);
          border-radius: var(--radius-lg);
          padding: 2rem;
          color: white;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .card-header h3 {
          margin: 0;
          font-size: 1.5rem;
        }

        .view-all-link {
          color: white;
          text-decoration: none;
          font-weight: 600;
          opacity: 0.9;
          transition: opacity 0.2s;
        }

        .view-all-link:hover {
          opacity: 1;
        }

        .card-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1.5rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .stat-label {
          font-size: 0.875rem;
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
        }

        .stat-value.rate {
          color: #fbbf24;
        }

        .stat-value.overdue {
          color: #fca5a5;
        }

        .stat-value.collected {
          color: #86efac;
        }

        .analytics-grid {
          padding: 0 2rem 2rem;
          display: grid;
          gap: 1.5rem;
          grid-template-columns: 1fr;
        }

        @media (min-width: 768px) {
          .analytics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1200px) {
          .analytics-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </AdminLayout>
  );
};

AdminPage.requireAuth = true;
AdminPage.allowedRoles = ['admin', 'super-admin'];

export default AdminPage;
