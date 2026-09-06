import { calculateBalance } from '@/lib/ledger';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import LoadingState from '@/components/common/LoadingState';
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
            <AdminLayout title="Tenant">
                <div className="owner-page">
                    <LoadingState message="Loading tenant profile..." />
                </div>
            </AdminLayout>
        );
    }

    if (!tenant) {
        return (
            <AdminLayout title="Tenant not found">
                <div className="owner-page">
                    <div className="owner-empty-state">
                        <h2>Tenant not found</h2>
                        <p className="owner-empty">No user record matches this ID.</p>
                        <Link href="/admin/tenants" className="primary-button">
                            Back to tenants
                        </Link>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    const currentBalance = calculateBalance(ledgerEntries);
    const leaseDate = (value: unknown) => {
        if (!value) return 'Not set';
        const d = typeof value === 'object' && value !== null && 'toDate' in value ? (value as { toDate: () => Date }).toDate() : new Date(value as string);
        return Number.isNaN(d.getTime()) ? 'Not set' : d.toLocaleDateString();
    };

    return (
        <AdminLayout title={tenant.displayName || 'Tenant profile'}>
            <Head>
                <title>{tenant.displayName || 'Tenant'} - Admin</title>
            </Head>

            <div className="owner-page">
                <div className="owner-page__head">
                    <div>
                        <p className="section-eyebrow">Admin · Tenant</p>
                        <h1>{tenant.displayName || 'Resident'}</h1>
                        <div className="owner-meta">
                            <span className="tag tag--success">Active resident</span>
                            <span>{tenant.email}</span>
                            {tenant.phoneNumber ? <span>{tenant.phoneNumber}</span> : null}
                            <span>Unit: <strong>{tenant.unit || 'Main'}</strong></span>
                        </div>
                    </div>
                    <div className="owner-page__actions">
                        <Link href={`/admin/ledger/${tenantId}`} className="outline-button">
                            View full ledger
                        </Link>
                        <button type="button" onClick={() => setIsPaymentModalOpen(true)} className="primary-button">
                            Record payment
                        </button>
                    </div>
                </div>

                <div className="owner-page__stats owner-page__stats--3">
                    <div className="stat-card">
                        <div className="stat-card__label">Outstanding balance</div>
                        <div className={`stat-card__value ${currentBalance > 0 ? 'stat-card__value--bad' : 'stat-card__value--good'}`}>${currentBalance.toLocaleString()}</div>
                        <div className="stat-card__meta">{currentBalance > 0 ? 'Payment due' : 'Account current'}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__label">Monthly contract rent</div>
                        <div className="stat-card__value">{activeLease?.monthlyRent ? `$${activeLease.monthlyRent.toLocaleString()}` : 'No lease'}</div>
                        <div className="stat-card__meta">{activeLease ? `Due on day ${activeLease.paymentDueDay || 1} of the month` : 'Assign a lease to set rent'}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__label">Security deposit held</div>
                        <div className="stat-card__value">{activeLease?.securityDeposit ? `$${activeLease.securityDeposit.toLocaleString()}` : 'None'}</div>
                        <div className="stat-card__meta">Held in escrow</div>
                    </div>
                </div>

                <div className="owner-page__grid">
                    <div className="owner-page__stack">
                        <section className="owner-card">
                            <div className="owner-card__head">
                                <h2>Active lease</h2>
                                {activeLease?.propertyId ? <Link href={`/admin/properties/${activeLease.propertyId}`} className="owner-small-button">View property</Link> : null}
                            </div>
                            {activeLease ? (
                                <div className="owner-kv">
                                    <div><span>Property</span><span>{activeLease.propertyName || 'Property'}</span></div>
                                    <div><span>Unit</span><span>{activeLease.unit || 'Main'}</span></div>
                                    <div><span>Start date</span><span>{leaseDate(activeLease.startDate)}</span></div>
                                    <div><span>End date</span><span>{leaseDate(activeLease.endDate)}</span></div>
                                    {activeLease.documents && activeLease.documents.length > 0 ? (
                                        <div><span>Signed lease</span><span><a href={activeLease.documents[0]} target="_blank" rel="noopener noreferrer">Download PDF</a></span></div>
                                    ) : null}
                                </div>
                            ) : (
                                <>
                                    <p className="owner-empty">No active lease found for this resident.</p>
                                    <div>
                                        <Link href="/admin/leases/new" className="owner-small-button">Assign lease</Link>
                                    </div>
                                </>
                            )}
                        </section>

                        <section className="owner-card">
                            <div className="owner-card__head">
                                <h2>Maintenance requests ({maintenanceList.length})</h2>
                                <Link href="/admin/maintenance" className="owner-small-button">Open queue</Link>
                            </div>
                            {maintenanceList.length > 0 ? (
                                <ul className="owner-list">
                                    {maintenanceList.slice(0, 5).map((m) => (
                                        <li key={m.id}>
                                            <div className="owner-list__text">
                                                <strong>{m.title}</strong>
                                                <span>{m.description}</span>
                                            </div>
                                            <span className={`tag ${m.status === 'completed' ? 'tag--success' : 'tag--info'}`}>{m.status.replace('_', ' ')}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="owner-empty">No maintenance tickets submitted.</p>
                            )}
                        </section>
                    </div>

                    <div className="owner-page__stack">
                        <section className="owner-card">
                            <div className="owner-card__head"><h2>Emergency contact</h2></div>
                            {tenant.emergencyContact ? (
                                <div className="owner-kv">
                                    <div><span>Name</span><span>{tenant.emergencyContact.name}</span></div>
                                    <div><span>Relationship</span><span>{tenant.emergencyContact.relationship}</span></div>
                                    <div><span>Phone</span><span>{tenant.emergencyContact.phone}</span></div>
                                </div>
                            ) : (
                                <p className="owner-empty">No emergency contact registered.</p>
                            )}
                        </section>

                        <section className="owner-card">
                            <div className="owner-card__head"><h2>Renter&apos;s insurance</h2></div>
                            {tenant.rentersInsurance ? (
                                <div className="owner-kv">
                                    <div><span>Policy status</span><span><span className={`tag ${tenant.rentersInsurance.status === 'active' ? 'tag--success' : 'tag--error'}`}>{tenant.rentersInsurance.status}</span></span></div>
                                    <div><span>Provider</span><span>{tenant.rentersInsurance.provider}</span></div>
                                    <div><span>Policy number</span><span className="owner-mono">{tenant.rentersInsurance.policyNumber}</span></div>
                                    <div><span>Expires</span><span>{tenant.rentersInsurance.expirationDate}</span></div>
                                </div>
                            ) : (
                                <p className="owner-note-warn">Proof of renter&apos;s insurance has not been submitted.</p>
                            )}
                        </section>

                        <section className="owner-card">
                            <div className="owner-card__head"><h2>Registered vehicles</h2></div>
                            {tenant.vehicles && tenant.vehicles.length > 0 ? (
                                <ul className="owner-list">
                                    {tenant.vehicles.map((v, i) => (
                                        <li key={i}>
                                            <div className="owner-list__text">
                                                <strong>{[v.year, v.make, v.model].filter(Boolean).join(' ')}</strong>
                                                <span>Plate {v.licensePlate}{v.state ? ` (${v.state})` : ''}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="owner-empty">No registered vehicles on file.</p>
                            )}
                        </section>

                        <section className="owner-card">
                            <div className="owner-card__head"><h2>Authorized pets</h2></div>
                            {tenant.pets && tenant.pets.length > 0 ? (
                                <ul className="owner-list">
                                    {tenant.pets.map((pet, i) => (
                                        <li key={i}>
                                            <div className="owner-list__text">
                                                <strong>{pet.name} ({pet.type})</strong>
                                                <span>{[pet.breed, pet.weight ? `${pet.weight} lbs` : ''].filter(Boolean).join(' · ')}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="owner-empty">No pets declared.</p>
                            )}
                        </section>
                    </div>
                </div>

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
                .owner-empty-state {
                    display: grid;
                    gap: 1rem;
                    justify-items: start;
                }
                .owner-note-warn {
                    margin: 0;
                    padding: 0.85rem 1rem;
                    border-radius: var(--radius-md);
                    background: var(--tag-warning-bg);
                    color: var(--tag-warning-text);
                    font-size: 0.9rem;
                }
            `}</style>
        </AdminLayout>
    );
};

Tenant360ProfilePage.requireAuth = true;
Tenant360ProfilePage.allowedRoles = ['admin', 'super-admin'];

export default Tenant360ProfilePage;
