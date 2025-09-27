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
import { tenantDashboard, type MaintenanceRequest } from '@/data/portal';
import type { NextPageWithAuth } from './_app';

type MaintenanceStatusFilter = MaintenanceRequest['status'] | 'All';

type MaintenanceFormPayload = Omit<MaintenanceRequest, 'id' | 'submittedOn' | 'status'>;

const PortalPage: NextPageWithAuth = () => {
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>(tenantDashboard.maintenance);
  const [maintenanceFilter, setMaintenanceFilter] = useState<MaintenanceStatusFilter>('All');
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  const metrics = useMemo(
    () => ({
      ...tenantDashboard.metrics,
      maintenanceOpen: maintenanceRequests.filter((request) => request.status !== 'Resolved').length
    }),
    [maintenanceRequests]
  );

  const handleRequestSubmit = async (payload: MaintenanceFormPayload) => {
    setRequestSubmitting(true);

    const newRequest: MaintenanceRequest = {
      id: `mnt-${Date.now()}`,
      status: 'Open',
      submittedOn: new Date().toISOString(),
      ...payload
    };

    setMaintenanceRequests((prev) => [newRequest, ...prev]);
    setMaintenanceFilter('All');
    await new Promise((resolve) => setTimeout(resolve, 450));
    setRequestSubmitting(false);
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
        residentName={tenantDashboard.residentName}
        propertyName={tenantDashboard.propertyName}
        unit={tenantDashboard.unit}
        nextDueDate={tenantDashboard.metrics.dueDate}
      />
      <DashboardHighlights metrics={metrics} />
      <QuickActions actions={tenantDashboard.quickActions} />
      <PaymentHistory payments={tenantDashboard.payments} />
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
      <LeaseDocuments documents={tenantDashboard.documents} />
      <ResidentResources resources={tenantDashboard.residentResources} />
      <SupportContacts contacts={tenantDashboard.supportContacts} />
    </SiteLayout>
  );
};

PortalPage.requireAuth = true;
PortalPage.allowedRoles = ['tenant', 'admin', 'super-admin'];

export default PortalPage;
