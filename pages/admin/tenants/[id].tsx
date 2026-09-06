import { calculateBalance } from '@/lib/ledger';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import LoadingState from '@/components/common/LoadingState';
import Card from '@/components/common/Card';
import RecordPaymentModal from '@/components/Admin/RecordPaymentModal';
import { userUtils, maintenanceUtils, paymentUtils } from '@/lib/firebase-utils';
import { leaseUtils } from '@/lib/leases';
import type { UserProfile, Lease, MaintenanceRequest, LedgerEntry } from '@/types/schema';
import type { NextPageWithAuth } from '../../_app';

const Tenant360ProfilePage: NextPageWithAuth = () => {
    const router = useRouter();
    const { id } = router.query;
    const tenantId = id as string;

    const [tenant, setTenant] = useState<UserProfile | null>(null);
    const [activeLease, setActiveLease] = useState<Lease | null>(null);
    const [maintenanceList, setMaintenanceList] = useState<MaintenanceRequest[]>([]);
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const loadTenantData = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            const [profileData, leases, maint, ledger] = await Promise.all([
                userUtils.getUserRole(tenantId),
                leaseUtils.getLeasesByTenant(tenantId),
                maintenanceUtils.getRequestsByTenant(tenantId),
                paymentUtils.getLedgerByTenant(tenantId)
            ]);

            setTenant(profileData as unknown as UserProfile);
            setActiveLease((leases || [])[0] || null);
            setMaintenanceList((maint || []) as unknown as MaintenanceRequest[]);
            setLedgerEntries((ledger || []) as unknown as LedgerEntry[]);
        } catch (err) {
            console.error('Failed to load tenant 360 profile:', err);
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        if (tenantId) {
            loadTenantData();
        }
    }, [tenantId, loadTenantData]);

    if (loading) {
        return (
            <AdminLayout title="Tenant Profile">
                <div className="p-8">
                    <LoadingState message="Loading tenant profile..." />
                </div>
            </AdminLayout>
        );
    }

    if (!tenant) {
        return (
            <AdminLayout title="Tenant Not Found">
                <div className="p-8 text-center">
                    <h2>Tenant Not Found</h2>
                    <p className="text-gray-500 mb-4">No user record matches this ID.</p>
                    <Link href="/admin/tenants" className="primary-button">
                        Back to Tenants
                    </Link>
                </div>
            </AdminLayout>
        );
    }

    // Calculate real ledger balance
    const currentBalance = calculateBalance(ledgerEntries);

    return (
        <AdminLayout title={tenant.displayName || 'Tenant Profile'}>
            <Head>
                <title>{tenant.displayName || 'Tenant'} - Resident 360 Profile</title>
            </Head>

            <div className="tenant-profile-page">
                {/* Header */}
                <div className="profile-header">
                    <div className="profile-header__info">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="tag tag--success">Active Resident</span>
                            <span className="text-xs text-gray-400">UID: {tenant.uid || tenantId}</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-white">{tenant.displayName || 'Resident'}</h1>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-300 mt-2">
                            <span>📧 {tenant.email}</span>
                            {tenant.phoneNumber && <span>📱 {tenant.phoneNumber}</span>}
                            <span>🏠 Assigned Unit: <strong>{tenant.unit || 'Main'}</strong></span>
                        </div>
                    </div>

                    <div className="profile-header__actions">
                        <button
                            type="button"
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="primary-button"
                        >
                            Record Payment
                        </button>
                        <Link href={`/admin/ledger/${tenantId}`} className="secondary-button">
                            View Full Ledger
                        </Link>
                    </div>
                </div>

                {/* Financial Health & Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="stat-card">
                        <span className="stat-lbl">Outstanding Balance</span>
                        <span className={`stat-val ${currentBalance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            ${currentBalance.toLocaleString()}
                        </span>
                        <span className="stat-sub">{currentBalance > 0 ? 'Payment Overdue / Due' : 'Account Current'}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-lbl">Monthly Contract Rent</span>
                        <span className="stat-val text-white">
                            ${activeLease?.monthlyRent ? activeLease.monthlyRent.toLocaleString() : 'N/A'}
                        </span>
                        <span className="stat-sub">Due on 1st of month</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-lbl">Security Deposit Held</span>
                        <span className="stat-val text-primary">
                            ${activeLease?.securityDeposit ? activeLease.securityDeposit.toLocaleString() : 'N/A'}
                        </span>
                        <span className="stat-sub">Held in escrow account</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Left Column: Lease & Maintenance */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card title="Active Lease Agreement">
                            {activeLease ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase block">Property</span>
                                            <span className="text-base font-semibold text-white">{activeLease.propertyName || 'Property'}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase block">Unit</span>
                                            <span className="text-base font-semibold text-white">{activeLease.unit || 'Main'}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase block">Start Date</span>
                                            <span className="text-sm text-gray-300">
                                                {new Date(activeLease.startDate as string).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase block">End Date</span>
                                            <span className="text-sm text-gray-300">
                                                {new Date(activeLease.endDate as string).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {activeLease.documents && activeLease.documents.length > 0 && (
                                        <div className="pt-4 border-t border-border">
                                            <a
                                                href={activeLease.documents[0]}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline text-sm font-semibold"
                                            >
                                                📄 Download Signed Lease PDF
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-gray-400 text-sm mb-3">No active lease found for this resident.</p>
                                    <Link href="/admin/leases/new" className="outline-button text-xs">
                                        + Assign Lease Agreement
                                    </Link>
                                </div>
                            )}
                        </Card>

                        {/* Recent Maintenance Requests */}
                        <Card title={`Maintenance Requests (${maintenanceList.length})`}>
                            {maintenanceList.length > 0 ? (
                                <div className="divide-y divide-border">
                                    {maintenanceList.slice(0, 5).map((m) => (
                                        <div key={m.id} className="py-3 flex justify-between items-start gap-4">
                                            <div>
                                                <h4 className="font-bold text-white text-sm">{m.title}</h4>
                                                <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className={`tag text-xs ${m.status === 'completed' ? 'tag--success' : 'tag--info'}`}>
                                                    {m.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm text-center py-4">No maintenance tickets submitted.</p>
                            )}
                        </Card>
                    </div>

                    {/* Right Column: Emergency Contacts, Vehicles, Insurance, Pets */}
                    <div className="space-y-6">
                        {/* Emergency Contact */}
                        <Card title="Emergency Contact">
                            {tenant.emergencyContact ? (
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase">Name</span>
                                        <span className="text-white font-semibold">{tenant.emergencyContact.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase">Relationship</span>
                                        <span className="text-gray-300">{tenant.emergencyContact.relationship}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase">Phone</span>
                                        <span className="text-primary font-mono">{tenant.emergencyContact.phone}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm italic">No emergency contact registered.</p>
                            )}
                        </Card>

                        {/* Renter's Insurance */}
                        <Card title="Renter's Insurance Status">
                            {tenant.rentersInsurance ? (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-xs uppercase">Policy Status</span>
                                        <span className={`tag text-xs ${tenant.rentersInsurance.status === 'active' ? 'tag--success' : 'tag--error'}`}>
                                            {tenant.rentersInsurance.status}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase">Provider</span>
                                        <span className="text-white font-medium">{tenant.rentersInsurance.provider}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase">Policy Number</span>
                                        <span className="text-gray-300 font-mono">{tenant.rentersInsurance.policyNumber}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase">Expires On</span>
                                        <span className="text-amber-400">{tenant.rentersInsurance.expirationDate}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded text-xs text-amber-300">
                                    ⚠️ Proof of renter&apos;s insurance pending submission.
                                </div>
                            )}
                        </Card>

                        {/* Vehicles / Parking */}
                        <Card title="Registered Vehicles">
                            {tenant.vehicles && tenant.vehicles.length > 0 ? (
                                <div className="space-y-3">
                                    {tenant.vehicles.map((v, i) => (
                                        <div key={i} className="p-3 bg-gray-900 rounded border border-gray-800 text-sm">
                                            <span className="font-bold text-white block">{v.year || ''} {v.make} {v.model}</span>
                                            <span className="text-xs text-gray-400">Plate: <strong className="text-primary">{v.licensePlate}</strong> ({v.state || 'State'})</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm italic">No registered vehicles on file.</p>
                            )}
                        </Card>

                        {/* Pets */}
                        <Card title="Authorized Pets">
                            {tenant.pets && tenant.pets.length > 0 ? (
                                <div className="space-y-2">
                                    {tenant.pets.map((pet, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm p-2 bg-gray-900 rounded border border-gray-800">
                                            <span className="text-white font-medium">🐾 {pet.name} ({pet.type})</span>
                                            <span className="text-xs text-gray-400">{pet.breed || ''} {pet.weight ? `(${pet.weight} lbs)` : ''}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm italic">No pets declared.</p>
                            )}
                        </Card>
                    </div>
                </div>

                {/* Record Payment Modal */}
                <RecordPaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onSuccess={() => {
                        setIsPaymentModalOpen(false);
                        loadTenantData();
                    }}
                    preselectedTenantId={tenantId}
                />
            </div>

            <style jsx>{`
                .tenant-profile-page {
                    padding: 2rem;
                    max-width: var(--max-width);
                    margin: 0 auto;
                }

                .profile-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    flex-wrap: wrap;
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid var(--color-border);
                }

                .profile-header__actions {
                    display: flex;
                    gap: 1rem;
                }

                .stat-card {
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    padding: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .stat-lbl {
                    font-size: 0.75rem;
                    color: var(--color-muted);
                    text-transform: uppercase;
                    font-weight: 600;
                }

                .stat-val {
                    font-size: 1.5rem;
                    font-weight: 800;
                }

                .stat-sub {
                    font-size: 0.75rem;
                    color: var(--color-muted);
                }
            `}</style>
        </AdminLayout>
    );
};

Tenant360ProfilePage.requireAuth = true;
Tenant360ProfilePage.allowedRoles = ['admin', 'super-admin'];

export default Tenant360ProfilePage;
