import Head from 'next/head';
import { useMemo, useState } from 'react';
import SiteLayout from '@/components/Layout/SiteLayout';
import PortalHero from '@/components/Portal/PortalHero';
import DashboardHighlights from '@/components/Portal/DashboardHighlights';
import PaymentHistory from '@/components/Portal/PaymentHistory';
import MaintenanceRequests from '@/components/Portal/MaintenanceRequests';
import CommunicationHub from '@/components/Portal/CommunicationHub';
import LeaseDocuments from '@/components/Portal/LeaseDocuments';
import QuickActions from '@/components/Portal/QuickActions';
import SupportContacts from '@/components/Portal/SupportContacts';
import MaintenanceRequestForm from '@/components/Portal/MaintenanceRequestForm';
import ResidentResources from '@/components/Portal/ResidentResources';
import PayRentModal from '@/components/Portal/PayRentModal';
import { SkeletonCard, SkeletonStats, SkeletonTable } from '@/components/common/Skeleton';
import { tenantDashboard, type MaintenanceRequest as UiMaintenanceRequest } from '@/data/portal';
import { createMaintenanceRequest } from '@/lib/maintenance';
import { useAuth } from '@/context/AuthContext';
import { usePortalData } from '@/hooks/usePortalData';
import type { NextPageWithAuth } from './_app';

type MaintenanceStatusFilter = 'Open' | 'In Progress' | 'Resolved' | 'All';

type MaintenanceFormPayload = Omit<UiMaintenanceRequest, 'id' | 'submittedOn' | 'status'>;

const PortalPage: NextPageWithAuth = () => {
  const { user, profile } = useAuth();

  const {
    lease,
    property,
    payments,
    maintenanceRequests,
    metrics: realMetrics,
    loading,
    refresh
  } = usePortalData();

  const [maintenanceFilter, setMaintenanceFilter] = useState<MaintenanceStatusFilter>('All');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [isPayRentModalOpen, setIsPayRentModalOpen] = useState(false);

  const metrics = useMemo(
    () => ({
      ...tenantDashboard.metrics,
      currentBalance: realMetrics.currentBalance,
      dueDate: realMetrics.nextDueDate?.toISOString() || tenantDashboard.metrics.dueDate,
      leaseRenewalDate: lease?.endDate
        ? lease.endDate instanceof Date
          ? lease.endDate.toISOString()
          : (lease.endDate as any).toDate?.().toISOString() || lease.endDate.toString()
        : tenantDashboard.metrics.leaseRenewalDate,
      maintenanceOpen: maintenanceRequests.filter((request) => request.status !== 'completed' && request.status !== 'cancelled').length,
      lastPaymentDate: payments[0]?.paidAt
        ? payments[0].paidAt instanceof Date
          ? payments[0].paidAt.toISOString()
          : (payments[0].paidAt as any).toDate?.().toISOString() || (payments[0].paidAt as any).toString()
        : tenantDashboard.metrics.lastPaymentDate,
      lastPaymentAmount: payments[0]?.amount || tenantDashboard.metrics.lastPaymentAmount
    }),
    [realMetrics, lease, maintenanceRequests, payments]
  );

  const documents = lease?.documents
    ? [
      {
        id: 'lease-doc',
        title: 'Lease Agreement',
        updatedOn: (lease.updatedAt as any)?.toDate?.().toISOString() || new Date().toISOString(),
        downloadUrl: '#'
      }
    ]
    : tenantDashboard.documents;

  const quickActions = tenantDashboard.quickActions.map((action) => {
    switch (action.id) {
      case 'qa-pay-rent':
        return { ...action, onClick: () => setIsPayRentModalOpen(true) };
      case 'qa-maintenance':
        return { ...action, onClick: () => document.getElementById('maintenance')?.scrollIntoView({ behavior: 'smooth' }) };
      case 'qa-documents':
        return { ...action, onClick: () => document.getElementById('documents')?.scrollIntoView({ behavior: 'smooth' }) };
      default:
        return action;
    }
  });

  const handleRequestSubmit = async (payload: MaintenanceFormPayload) => {
    if (!user || !profile) return;
    setRequestSubmitting(true);

    try {
      await createMaintenanceRequest({
        ...payload,
        priority: payload.priority.toLowerCase() as any,
        category: (payload.category?.toLowerCase() || 'other') as any,
        tenantId: user.uid,
        propertyId: profile.propertyIds?.[0] || 'unassigned'
      });

      await refresh();
      setMaintenanceFilter('All');
    } catch (err) {
      console.error('Failed to create request', err);
    } finally {
      setRequestSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <Head>
        <title>Tenant Portal - Next Level Rentals</title>
        <meta
          name="description"
          content="Access rent payments, maintenance tracking, communications, and lease documents in the Next Level Rentals tenant portal."
        />
      </Head>

      <PortalHero
        residentName={profile?.displayName || tenantDashboard.residentName}
        propertyName={property?.name || tenantDashboard.propertyName}
        unit={profile?.unit || tenantDashboard.unit}
        nextDueDate={metrics.dueDate}
      />

      {loading ? (
        <section className="section">
          <div className="section__inner">
            <SkeletonStats />
          </div>
        </section>
      ) : (
        <DashboardHighlights metrics={metrics} />
      )}

      <QuickActions actions={quickActions} />

      {loading ? (
        <section className="section section--muted">
          <div className="section__inner">
            <div className="card__header" style={{ marginBottom: '1.5rem' }}>
              <h2 className="card__title">Maintenance requests</h2>
              <span className="tag tag--info">Loading</span>
            </div>
            <div className="maintenance-grid">
              {[0, 1, 2].map((item) => (
                <SkeletonCard key={item} />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <MaintenanceRequests
          requests={maintenanceRequests}
          activeStatus={maintenanceFilter}
          onStatusChange={setMaintenanceFilter}
        />
      )}

      <MaintenanceRequestForm onSubmit={handleRequestSubmit} submitting={requestSubmitting} />

      {loading ? (
        <section className="section" id="payments">
          <div className="section__inner">
            <SkeletonTable rows={4} />
          </div>
        </section>
      ) : (
        <PaymentHistory payments={payments} />
      )}

      <CommunicationHub
        announcements={tenantDashboard.announcements}
        messages={tenantDashboard.messages}
      />

      <LeaseDocuments documents={documents} />

      <ResidentResources resources={tenantDashboard.residentResources} />

      <SupportContacts contacts={tenantDashboard.supportContacts} />

      <PayRentModal
        isOpen={isPayRentModalOpen}
        onClose={() => setIsPayRentModalOpen(false)}
        currentBalance={metrics.currentBalance}
        propertyId={profile?.propertyIds?.[0] || ''}
      />
    </SiteLayout>
  );
};

PortalPage.requireAuth = true;
PortalPage.allowedRoles = ['tenant', 'admin', 'super-admin'];

export default PortalPage;
