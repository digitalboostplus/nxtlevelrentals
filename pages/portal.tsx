import Head from 'next/head';
import { useState } from 'react';
import SiteLayout from '@/components/Layout/SiteLayout';
import PortalHero from '@/components/Portal/PortalHero';
import DashboardHighlights from '@/components/Portal/DashboardHighlights';
import PaymentHistory from '@/components/Portal/PaymentHistory';
import MaintenanceRequests from '@/components/Portal/MaintenanceRequests';
import CommunicationHub from '@/components/Portal/CommunicationHub';
import LeaseDocuments from '@/components/Portal/LeaseDocuments';
import { tenantDashboard, type MaintenanceRequest } from '@/data/portal';

type MaintenanceStatusFilter = MaintenanceRequest['status'] | 'All';

export default function PortalPage() {
  const [maintenanceFilter, setMaintenanceFilter] = useState<MaintenanceStatusFilter>('All');

  return (
    <SiteLayout>
      <Head>
        <title>Tenant Portal · Next Level Rentals</title>
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
      <DashboardHighlights metrics={tenantDashboard.metrics} />
      <PaymentHistory payments={tenantDashboard.payments} />
      <MaintenanceRequests
        requests={tenantDashboard.maintenance}
        activeStatus={maintenanceFilter}
        onStatusChange={setMaintenanceFilter}
      />
      <CommunicationHub announcements={tenantDashboard.announcements} messages={tenantDashboard.messages} />
      <LeaseDocuments documents={tenantDashboard.documents} />
    </SiteLayout>
  );
}
