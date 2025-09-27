import Head from 'next/head';
import SiteLayout from '@/components/Layout/SiteLayout';
import AdminHero from '@/components/Admin/AdminHero';
import PortfolioSummary from '@/components/Admin/PortfolioSummary';
import WorkOrderTable from '@/components/Admin/WorkOrderTable';
import TenantPortfolioTable from '@/components/Admin/TenantPortfolioTable';
import DocumentQueue from '@/components/Admin/DocumentQueue';
import {
  documentTasks,
  highPriorityWorkOrders,
  portfolioMetrics,
  tenantPortfolio
} from '@/data/admin';
import type { NextPageWithAuth } from '../_app';

const AdminPage: NextPageWithAuth = () => {
  return (
    <SiteLayout>
      <Head>
        <title>Admin Console - Next Level Management</title>
        <meta
          name="description"
          content="Manage properties, tenants, and maintenance operations for the Next Level Management portfolio."
        />
      </Head>
      <AdminHero
        managerName="Alex Jordan"
        portfolioLabel="Next Level Management"
        stats={
          <>
            <div className="admin-stat">
              <span className="admin-stat__label">Active units</span>
              <span className="admin-stat__value">412</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat__label">Avg. response time</span>
              <span className="admin-stat__value">3.6 hrs</span>
            </div>
          </>
        }
      />
      <PortfolioSummary metrics={portfolioMetrics} />
      <WorkOrderTable workOrders={highPriorityWorkOrders} />
      <TenantPortfolioTable tenants={tenantPortfolio} />
      <DocumentQueue tasks={documentTasks} />
    </SiteLayout>
  );
};

AdminPage.requireAuth = true;
AdminPage.allowedRoles = ['admin', 'super-admin'];

export default AdminPage;
