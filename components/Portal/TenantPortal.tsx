import { normalizeDate } from '@/lib/date';
import { useMemo, useState } from 'react';
import PortalHero from '@/components/Portal/PortalHero';
import DashboardHighlights from '@/components/Portal/DashboardHighlights';
import PaymentHistory from '@/components/Portal/PaymentHistory';
import MaintenanceRequests from '@/components/Portal/MaintenanceRequests';
import CommunicationHub from '@/components/Portal/CommunicationHub';
import LeaseDocuments from '@/components/Portal/LeaseDocuments';
import QuickActions from '@/components/Portal/QuickActions';
import SupportContacts from '@/components/Portal/SupportContacts';
import MaintenanceRequestForm, { type MaintenanceRequestPayload } from '@/components/Portal/MaintenanceRequestForm';
import ResidentResources from '@/components/Portal/ResidentResources';
import PayRentModal from '@/components/Portal/PayRentModal';
import { tenantDashboard } from '@/data/portal';
import { useAuth } from '@/context/AuthContext';
import { usePortalData } from '@/hooks/usePortalData';

type MaintenanceStatusFilter = 'Open' | 'In Progress' | 'Resolved' | 'All';

export default function TenantPortal() {
    const { user, profile } = useAuth();

    // Use our portal data hook
    const {
        lease,
        property,
        payments,
        maintenanceRequests,
        metrics: realMetrics,
        loading,
        error,
        refresh
    } = usePortalData();

    const [maintenanceFilter, setMaintenanceFilter] = useState<MaintenanceStatusFilter>('All');
    const [requestSubmitting, setRequestSubmitting] = useState(false);
    const [requestSaved, setRequestSaved] = useState(false);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);

    // Combine real metrics with static fallbacks where needed
    const metrics = useMemo(
        () => ({
            ...tenantDashboard.metrics,
            currentBalance: realMetrics.currentBalance,
            autoPayEnabled: false,
            dueDate: realMetrics.nextDueDate?.toISOString() || '',
            leaseRenewalDate: normalizeDate(lease?.endDate)?.toISOString() || '',
            maintenanceOpen: maintenanceRequests.filter((request) => request.status !== 'completed' && request.status !== 'cancelled').length,
            lastPaymentDate: payments[0]?.paidAt ? (payments[0].paidAt as Date).toISOString() : tenantDashboard.metrics.lastPaymentDate,
            lastPaymentAmount: payments[0]?.amount || tenantDashboard.metrics.lastPaymentAmount
        }),
        [realMetrics, lease, maintenanceRequests, payments]
    );

    // Transform lease doc for UI
    const documents = (lease?.documents || []).filter(url => url.startsWith('https://')).map((url, index) => ({
        id: `lease-${index}`, title: 'Lease Agreement', updatedOn: normalizeDate(lease?.updatedAt)?.toISOString() || '', downloadUrl: url
    }));

    const handleRequestSubmit = async (payload: MaintenanceRequestPayload) => {
        if (!user || !profile) return;
        setRequestSubmitting(true);
        setRequestSaved(false);

        try {
            // Save the request and its attachments through the authorized server route.
            const token = await user.getIdToken();
            const res = await fetch('/api/maintenance/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: payload.title,
                    description: payload.description,
                    priority: payload.priority.toLowerCase(),
                    category: payload.category?.toLowerCase() || 'other',
                    propertyId: lease?.propertyId || profile.propertyIds?.[0] || 'unassigned',
                    permissionToEnter: payload.permissionToEnter,
                    hasPets: payload.hasPets,
                    fileIds: payload.fileIds,
                    operationId: payload.operationId,
                    preferredTime: payload.preferredTime,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to create request');
            }

            setRequestSaved(true);
            // Refresh data to show new request
            await refresh();
            setMaintenanceFilter('All');
        } catch (err) {
            console.error('Failed to create request', err);
            throw err;
        } finally {
            setRequestSubmitting(false);
        }
    };

    if (loading) return <p role="status">Loading resident records...</p>;
    if (error) return <div>{requestSaved && <p role="status">Request received. Refresh the page to reload your records.</p>}<p role="alert">{error}</p></div>;
    return (
        <>
            {requestSaved && <p role="status">Request received! We will follow up shortly.</p>}
            <p>Online payments are unavailable. Contact management for payment instructions.</p>
            <PortalHero
                residentName={profile?.displayName || tenantDashboard.residentName}
                propertyName={property?.name || tenantDashboard.propertyName}
                unit={lease?.unit || profile?.unit || 'Unassigned'}
                nextDueDate={metrics.dueDate}
            />
            <DashboardHighlights
                metrics={metrics}

            />
            <QuickActions
                actions={tenantDashboard.quickActions.filter(a => a.id !== 'qa-pay-rent').map((action) => {
                    switch (action.id) {
                        case 'qa-pay-rent':
                            return { ...action, onClick: () => setIsPayModalOpen(true) };
                        case 'qa-maintenance':
                            return { ...action, onClick: () => document.getElementById('maintenance')?.scrollIntoView({ behavior: 'smooth' }) };
                        case 'qa-documents':
                            return { ...action, onClick: () => document.getElementById('documents')?.scrollIntoView({ behavior: 'smooth' }) };
                        default:
                            return action;
                    }
                })}
            />
            <PaymentHistory payments={payments} />

            <MaintenanceRequestForm propertyId={lease?.propertyId || profile?.propertyIds?.[0]} onSubmit={handleRequestSubmit} submitting={requestSubmitting} />
            <MaintenanceRequests
                requests={maintenanceRequests}
                activeStatus={maintenanceFilter}
                onStatusChange={setMaintenanceFilter}
            />
            <CommunicationHub
                announcements={tenantDashboard.announcements}
                messages={tenantDashboard.messages}
            />
            <LeaseDocuments
                documents={documents}
                lease={lease}
                rentersInsurance={profile?.rentersInsurance}
                onInsuranceUpdated={refresh}
            />
            <ResidentResources resources={tenantDashboard.residentResources} />
            <SupportContacts contacts={tenantDashboard.supportContacts} />

            <PayRentModal
                isOpen={isPayModalOpen}
                onClose={() => setIsPayModalOpen(false)}
                currentBalance={metrics.currentBalance}
                propertyName={property?.name}
                onSuccess={refresh}
            />
        </>
    );
}
