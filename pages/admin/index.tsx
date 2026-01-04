import Head from 'next/head';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import AdminHero from '@/components/Admin/AdminHero';
import PortfolioSummary from '@/components/Admin/PortfolioSummary';
import WorkOrderTable from '@/components/Admin/WorkOrderTable';
import DocumentQueue from '@/components/Admin/DocumentQueue';
import AddTenantModal from '@/components/Admin/AddTenantModal';
import RecordPaymentModal from '@/components/Admin/RecordPaymentModal';
import { adminUtils } from '@/lib/firebase-utils';
import {
  documentTasks,
  highPriorityWorkOrders,
  portfolioMetrics,
} from '@/data/admin';
import type { NextPageWithAuth } from '../_app';

const AdminPage: NextPageWithAuth = () => {
  const [stats, setStats] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      setLoading(true);
      const data = await adminUtils.getPortfolioStats();
      setStats(data);
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
      `}</style>
    </AdminLayout>
  );
};

AdminPage.requireAuth = true;
AdminPage.allowedRoles = ['admin', 'super-admin'];

export default AdminPage;
