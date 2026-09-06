import { normalizeDate } from '@/lib/date';
import { useMemo, useState } from 'react';
import TenantHome from '@/components/Portal/TenantHome';
import PaymentHistory from '@/components/Portal/PaymentHistory';
import MaintenanceRequests from '@/components/Portal/MaintenanceRequests';
import LeaseDocuments from '@/components/Portal/LeaseDocuments';
import MaintenanceRequestForm, { type MaintenanceRequestPayload } from '@/components/Portal/MaintenanceRequestForm';
import PayRentModal from '@/components/Portal/PayRentModal';
import { useAuth } from '@/context/AuthContext';
import { usePortalData } from '@/hooks/usePortalData';
import { formatPropertyAddress, tenantActivity, tenantAttentionItems } from '@/lib/console-home';
import { lastRecordedPayment } from '@/lib/tenantPayments';

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

    // Transform lease doc for UI
    const documents = (lease?.documents || []).filter(url => url.startsWith('https://')).map((url, index) => ({
        id: `lease-${index}`, title: 'Lease Agreement', updatedOn: normalizeDate(lease?.updatedAt)?.toISOString() || '', downloadUrl: url
    }));

    const attention = useMemo(
        () => tenantAttentionItems({
            maintenanceRequests,
            lease,
            hasRentersInsurance: Boolean(profile?.rentersInsurance?.provider),
            currentBalance: realMetrics.currentBalance,
            nextDueDate: realMetrics.nextDueDate,
        }),
        [maintenanceRequests, lease, profile?.rentersInsurance, realMetrics.currentBalance, realMetrics.nextDueDate]
    );
    const activity = useMemo(() => tenantActivity({ payments, maintenanceRequests }), [payments, maintenanceRequests]);
    const lastPayment = useMemo(() => lastRecordedPayment(payments), [payments]);

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
        <div className="tenant-portal">
            {requestSaved && <p role="status" className="tenant-portal__status">Request received! We will follow up shortly.</p>}
            <TenantHome
                name={(profile?.displayName || '').split(' ')[0] || 'there'}
                addressLine={[formatPropertyAddress(property?.address), lease?.unit || profile?.unit].filter(Boolean).join(' · ')}
                rentAmount={lease?.monthlyRent ?? lease?.rentAmount ?? null}
                currentBalance={realMetrics.currentBalance}
                nextDueDate={realMetrics.nextDueDate}
                daysUntilDue={realMetrics.daysUntilDue}
                lastPayment={lastPayment}
                attention={attention}
                activity={activity}
                documents={documents}
                hasPrivateLeaseDocuments={Boolean(lease?.fileIds?.length)}
                hasRentersInsurance={Boolean(profile?.rentersInsurance?.provider)}
                onPayRent={() => setIsPayModalOpen(true)}
            />
            <PaymentHistory payments={payments} />

            <MaintenanceRequestForm propertyId={lease?.propertyId || profile?.propertyIds?.[0]} onSubmit={handleRequestSubmit} submitting={requestSubmitting} />
            <MaintenanceRequests
                requests={maintenanceRequests}
                activeStatus={maintenanceFilter}
                onStatusChange={setMaintenanceFilter}
            />
            <LeaseDocuments
                documents={documents}
                lease={lease}
                rentersInsurance={profile?.rentersInsurance}
                onInsuranceUpdated={refresh}
            />

            <PayRentModal
                isOpen={isPayModalOpen}
                onClose={() => setIsPayModalOpen(false)}
                currentBalance={realMetrics.currentBalance}
                propertyName={property?.name}
                onSuccess={refresh}
            />
        </div>
    );
}
