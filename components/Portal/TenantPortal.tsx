import { normalizeDate } from '@/lib/date';
import { useMemo, useState } from 'react';
import Link from 'next/link';
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

export type PortalView = 'home' | 'payments' | 'maintenance' | 'documents';

const VIEW_COPY: Record<Exclude<PortalView, 'home'>, { title: string; sub: string }> = {
  payments: { title: 'Payment history', sub: 'Every rent receipt we have recorded for your account.' },
  maintenance: { title: 'Maintenance', sub: 'Send us a repair request and follow the ones already open.' },
  documents: { title: 'Documents', sub: 'Your lease, addenda and renters insurance in one place.' },
};

export default function TenantPortal({ view = 'home' }: { view?: PortalView }) {
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
    const homeProps = {
        name: (profile?.displayName || '').split(' ')[0] || 'there',
    };
    if (view !== 'home') {
        const copy = VIEW_COPY[view];
        return (
            <div className="tenant-portal tenant-portal--page">
                <div className="owner-page tenant-portal__head">
                    <div className="owner-page__head">
                        <div>
                            <p className="section-eyebrow">Tenant portal</p>
                            <h1>{copy.title}</h1>
                            <p className="owner-page__sub">{copy.sub}</p>
                        </div>
                        <div className="owner-page__actions">
                            <Link href="/portal" className="outline-button">Back to home</Link>
                        </div>
                    </div>
                </div>
                {requestSaved && <p role="status" className="tenant-portal__status">Request received! We will follow up shortly.</p>}
                {view === 'payments' ? <PaymentHistory payments={payments} /> : null}
                {view === 'maintenance' ? (
                    <>
                        <MaintenanceRequestForm propertyId={lease?.propertyId || profile?.propertyIds?.[0]} onSubmit={handleRequestSubmit} submitting={requestSubmitting} />
                        <MaintenanceRequests requests={maintenanceRequests} activeStatus={maintenanceFilter} onStatusChange={setMaintenanceFilter} />
                    </>
                ) : null}
                {view === 'documents' ? (
                    <LeaseDocuments documents={documents} lease={lease} rentersInsurance={profile?.rentersInsurance} onInsuranceUpdated={refresh} />
                ) : null}
            </div>
        );
    }
    return (
        <div className="tenant-portal">
            {requestSaved && <p role="status" className="tenant-portal__status">Request received! We will follow up shortly.</p>}
            <TenantHome
                name={homeProps.name}
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
