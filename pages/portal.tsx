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
import { tenantDashboard } from '@/data/portal';
import { createMaintenanceRequest } from '@/lib/maintenance';
import { useAuth } from '@/context/AuthContext';
import { usePortalData } from '@/hooks/usePortalData';
import type { NextPageWithAuth } from './_app';
import type { MaintenanceRequest } from '@/types/maintenance';

type MaintenanceStatusFilter = 'Open' | 'In Progress' | 'Resolved' | 'All';

type MaintenanceFormPayload = Omit<MaintenanceRequest, 'id' | 'submittedOn' | 'status' | 'createdAt' | 'updatedAt' | 'tenantId' | 'propertyId'>;

const PortalPage: NextPageWithAuth = () => {
  const { user, profile } = useAuth();

  // Use our new hook for data
  const {
    lease,
    payments,
    maintenanceRequests,
    metrics: realMetrics,
    loading,
    refresh
  } = usePortalData();

  const [maintenanceFilter, setMaintenanceFilter] = useState<MaintenanceStatusFilter>('All');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [isPayRentModalOpen, setIsPayRentModalOpen] = useState(false);

  // Combine real metrics with static fallbacks where needed
  const metrics = useMemo(
    () => ({
      ...tenantDashboard.metrics,
      currentBalance: realMetrics.currentBalance,
      dueDate: realMetrics.nextDueDate?.toISOString() || tenantDashboard.metrics.dueDate, // Fallback if null
      leaseRenewalDate: lease?.endDate ? (lease.endDate as any).toDate().toISOString() : tenantDashboard.metrics.leaseRenewalDate,
      // Dynamic Maintenance Count is now calculated in the hook? No, hook provides raw list.
      // But DashboardHighlights expects a `DashboardMetrics` object.
      // We are essentially patching the `tenantDashboard.metrics` object with real values.
      maintenanceOpen: maintenanceRequests.filter((request) => request.status !== 'completed' && request.status !== 'cancelled').length,
      lastPaymentDate: payments[0]?.paidAt ? (payments[0].paidAt as Date).toISOString() : tenantDashboard.metrics.lastPaymentDate,
      lastPaymentAmount: payments[0]?.amount || tenantDashboard.metrics.lastPaymentAmount
    }),
    [realMetrics, lease, maintenanceRequests, payments]
  );

  // Transform lease doc for UI - currently mock structure
  const documents = lease?.documents ? [{
    id: 'lease-doc',
    title: 'Lease Agreement',
    updatedOn: (lease.updatedAt as any)?.toDate?.().toISOString() || new Date().toISOString(),
    downloadUrl: '#'
  }] : tenantDashboard.documents;


  const handleRequestSubmit = async (payload: MaintenanceFormPayload) => {
    if (!user || !profile) return;
    setRequestSubmitting(true);

    try {
      await createMaintenanceRequest({
        ...payload,
        priority: payload.priority.toLowerCase() as any,
        category: (payload.category?.toLowerCase() || 'other') as any, // Safety check
        tenantId: user.uid,
        propertyId: profile.propertyIds?.[0] || 'unassigned',
        // unitId: profile.unit 
      });

      // Refresh data to show new request
      await refresh();
      setMaintenanceFilter('All');

      // Scroll to requests list is handled by UI likely, or we can add it here if needed.

    } catch (err) {
      console.error('Failed to create request', err);
    } finally {
      setRequestSubmitting(false);
    }
  };

  // if (loading) return <SiteLayout><div className="loading">Loading Portal...</div></SiteLayout>; 
  // Better to show skeleton or just let it pop in, keeping it simple for now as per instructions.

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
        propertyName={tenantDashboard.propertyName} // TODO: Fetch Property Name
        unit={profile?.unit || tenantDashboard.unit}
        nextDueDate={metrics.dueDate}
      />
      <DashboardHighlights metrics={metrics} />
      <QuickActions
        actions={tenantDashboard.quickActions.map((action) => {
          switch (action.id) {
            case 'qa-pay-rent':
              return { ...action, onClick: () => setIsPayRentModalOpen(true) };
            case 'qa-maintenance':
              return { ...action, onClick: () => document.getElementById('maintenance-form')?.scrollIntoView({ behavior: 'smooth' }) };
            case 'qa-documents':
              return { ...action, onClick: () => document.getElementById('lease-documents')?.scrollIntoView({ behavior: 'smooth' }) };
            default:
              return action;
          }
        })}
      />
      <PaymentHistory payments={payments} />

      <PayRentModal
        isOpen={isPayRentModalOpen}
        onClose={() => setIsPayRentModalOpen(false)}
        currentBalance={metrics.currentBalance}
        propertyId={profile?.propertyIds?.[0] || ''}
      />
      <MaintenanceRequestForm onSubmit={handleRequestSubmit} submitting={requestSubmitting} />
      <MaintenanceRequests
        requests={maintenanceRequests}
        activeStatus={maintenanceFilter}
        onStatusChange={setMaintenanceFilter}
      />
      <CommunicationHub
        announcements={tenantDashboard.announcements}
        messages={tenantDashboard.messages}
      />
      <LeaseDocuments documents={documents} />
      <ResidentResources resources={tenantDashboard.residentResources} />
      <SupportContacts contacts={tenantDashboard.supportContacts} />
    </SiteLayout>
  );
};

PortalPage.requireAuth = true;
PortalPage.allowedRoles = ['tenant', 'admin', 'super-admin'];

export default PortalPage;
