import Head from 'next/head';
import { useMemo, useState, useEffect } from 'react';
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
import { tenantDashboard, type MaintenanceRequest } from '@/data/portal';
import { getMaintenanceRequests, createMaintenanceRequest } from '@/lib/maintenance';
import { useAuth } from '@/context/AuthContext';
import type { NextPageWithAuth } from './_app';

type MaintenanceStatusFilter = MaintenanceRequest['status'] | 'All';

type MaintenanceFormPayload = Omit<MaintenanceRequest, 'id' | 'submittedOn' | 'status'>;

const PortalPage: NextPageWithAuth = () => {
  const { user, profile } = useAuth();
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [maintenanceFilter, setMaintenanceFilter] = useState<MaintenanceStatusFilter>('All');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [isPayRentModalOpen, setIsPayRentModalOpen] = useState(false);

  // State for GHL Data
  const [leaseDoc, setLeaseDoc] = useState<any>(null); // TODO: Type this

  // Helper to map backend type to frontend type for UI display
  // Backend uses: 'submitted' | 'in_progress' | 'completed' | 'cancelled'
  // Frontend displays: 'Open' | 'In Progress' | 'Resolved'
  const mapBackendToFrontend = (req: any): MaintenanceRequest => {
    let status: MaintenanceRequest['status'] = 'Open';
    if (req.status === 'in_progress') status = 'In Progress';
    if (req.status === 'completed') status = 'Resolved';
    if (req.status === 'cancelled') status = 'Resolved'; // Treat cancelled as resolved for UI

    return {
      id: req.id,
      title: req.title,
      description: req.description,
      priority: req.priority === 'emergency' ? 'High' : (req.priority === 'low' ? 'Low' : 'Medium'), // Approx mapping
      category: req.category,
      submittedOn: req.createdAt ? new Date(req.createdAt).toISOString() : new Date().toISOString(),
      status: status
    };
  };

  // Fetch requests & lease on load
  useEffect(() => {
    async function fetchData() {
      if (!user || !profile) return;
      try {
        // 1. Maintenance
        const data = await getMaintenanceRequests(user.uid, profile.role || 'tenant');
        // Map backend types to frontend types to satisfy TS and UI
        setMaintenanceRequests(data.map(mapBackendToFrontend));

        // 2. Lease Document
        const db = await import('@/lib/firebase').then(m => m.getFirestoreClient());
        const { doc, getDoc } = await import('firebase/firestore');
        const leaseSnap = await getDoc(doc(db, 'leaseDocuments', `lease-${user.uid}`));
        if (leaseSnap.exists()) {
          setLeaseDoc(leaseSnap.data());
        }

      } catch (err) {
        console.error('Failed to fetch data', err);
      }
    }
    fetchData();
  }, [user, profile]);

  const metrics = useMemo(
    () => ({
      ...tenantDashboard.metrics,
      // Map GHL/Firestore Profile Data
      currentBalance: profile?.monthlyRent || 0, // Show rent amount as balance/info for now
      leaseRenewalDate: leaseDoc?.leaseEnd || '2025-01-01',
      // Dynamic Maintenance Count
      maintenanceOpen: maintenanceRequests.filter((request) => request.status !== 'Resolved').length
    }),
    [maintenanceRequests, profile, leaseDoc]
  );

  // Transform lease doc for UI
  const documents = leaseDoc ? [{
    id: 'lease-doc',
    title: leaseDoc.title || 'Lease Agreement',
    updatedOn: leaseDoc.updatedAt || new Date().toISOString(),
    downloadUrl: '#' // We don't have the PDF URL yet
  }] : [];

  const handleRequestSubmit = async (payload: MaintenanceFormPayload) => {
    if (!user || !profile) return;
    setRequestSubmitting(true);

    try {
      // 1. Create in Firestore
      // 1. Create in Firestore
      const newId = await createMaintenanceRequest({
        ...payload,
        priority: payload.priority.toLowerCase() as any,
        category: (payload.category?.toLowerCase() === 'safety' ? 'general' :
          payload.category?.toLowerCase() === 'structural' ? 'other' :
            payload.category?.toLowerCase() || 'other') as any,
        tenantId: user.uid,
        propertyId: profile.propertyIds?.[0] || 'unassigned', // Fallback if not set
        // unitId: profile.unit // Optional if we had it in profile
      });

      // 2. Optimistic Update (or re-fetch)
      const newRequest: MaintenanceRequest = {
        id: newId,
        status: 'submitted', // Matches the default in createMaintenanceRequest
        submittedOn: new Date().toISOString(), // UI expects string/ISO usually, but DB saves timestamp. 
        // We might need to normalize this if the UI components expect a specific format.
        // The create fn uses Date.now(), so we should probably align types.
        // However, for the UI display solely, ISO string is often easier if components expect it.
        // Let's look at `MaintenanceRequest` type in `types/maintenance.ts` vs `data/portal.ts`.
        ...payload,
        tenantId: user.uid,
        propertyId: profile.propertyIds?.[0] || 'unassigned',
        createdAt: Date.now(),
        updatedAt: Date.now()
      } as unknown as MaintenanceRequest;
      // Note: The `MaintenanceRequest` type from `data/portal` might differ slightly from `types/maintenance`.
      // We should probably strictly use `types/maintenance` everywhere, but `PortalHero` and others rely on `data/portal` mocks.
      // For now, I will cast to satisfy the immediate UI, but valid Typescript refactoring is needed to unify types.

      // Re-fetch to be safe and consistent
      const data = await getMaintenanceRequests(user.uid, profile.role || 'tenant');
      setMaintenanceRequests(data.map(mapBackendToFrontend));

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
        propertyName={tenantDashboard.propertyName} // We could pull this from property details if we had them
        unit={profile?.unit || tenantDashboard.unit} // We need to add 'unit' to UserProfile type if it's not there
        nextDueDate={tenantDashboard.metrics.dueDate}
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
      <PaymentHistory payments={tenantDashboard.payments} />

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
      <LeaseDocuments documents={documents.length > 0 ? documents : tenantDashboard.documents} />
      <ResidentResources resources={tenantDashboard.residentResources} />
      <SupportContacts contacts={tenantDashboard.supportContacts} />
    </SiteLayout>
  );
};

PortalPage.requireAuth = true;
PortalPage.allowedRoles = ['tenant', 'admin', 'super-admin'];

export default PortalPage;
