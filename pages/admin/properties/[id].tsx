import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import LoadingState from '@/components/common/LoadingState';
import MaintenanceStatusModal from '@/components/Admin/MaintenanceStatusModal';
import { propertyUtils, maintenanceUtils, paymentUtils } from '@/lib/firebase-utils';
import { leaseUtils } from '@/lib/leases';
import type { Property, Lease, MaintenanceRequest, Payment } from '@/types/schema';
import type { NextPageWithAuth } from '../../_app';

function formatAddress(address: Property['address']) {
    if (!address) return 'No address provided';
    if (typeof address === 'string') return address;
    return `${address.street || ''}${address.city ? `, ${address.city}` : ''}${address.state ? ` ${address.state}` : ''}${address.zipCode ? ` ${address.zipCode}` : ''}`;
}

const AdminPropertyDetailPage: NextPageWithAuth = () => {
    const router = useRouter();
    const { id } = router.query;
    const propertyId = id as string;

    const [property, setProperty] = useState<Property | null>(null);
    const [activeLease, setActiveLease] = useState<Lease | null>(null);
    const [maintenanceList, setMaintenanceList] = useState<MaintenanceRequest[]>([]);
    const [paymentsList, setPaymentsList] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMaintenance, setSelectedMaintenance] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'units' | 'lease' | 'maintenance' | 'financials'>('overview');

    const loadData = useCallback(async () => {
        if (!propertyId) return;
        setLoading(true);
        try {
            const [propData, leaseData, maintData] = await Promise.all([
                propertyUtils.getProperty(propertyId),
                leaseUtils.getActiveLeaseForProperty(propertyId),
                maintenanceUtils.getRequestsByProperty(propertyId)
            ]);

            setProperty(propData as unknown as Property);
            setActiveLease(leaseData);
            setMaintenanceList((maintData || []) as unknown as MaintenanceRequest[]);

            try {
                const payments = await paymentUtils.getPaymentsByProperty(propertyId);
                setPaymentsList((payments || []) as unknown as Payment[]);
            } catch {
                setPaymentsList([]);
            }
        } catch (err) {
            console.error('Failed to load property details:', err);
        } finally {
            setLoading(false);
        }
    }, [propertyId]);

    useEffect(() => {
        if (propertyId) {
            loadData();
        }
    }, [propertyId, loadData]);

    if (loading) {
        return (
            <AdminLayout title="Property">
                <div className="owner-page">
                    <LoadingState message="Loading property details..." />
                </div>
            </AdminLayout>
        );
    }

    if (!property) {
        return (
            <AdminLayout title="Property not found">
                <div className="owner-page">
                    <div className="owner-empty-state">
                        <h2>Property not found</h2>
                        <p className="owner-empty">No property matches this ID.</p>
                        <Link href="/admin/properties" className="primary-button">
                            Back to properties
                        </Link>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    const totalCollected = paymentsList
        .filter((p) => p.status === 'paid' || p.status === 'succeeded')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

    const openTickets = maintenanceList.filter((m) => m.status !== 'completed' && m.status !== 'cancelled');
    const rent = property.defaultRentAmount || property.rent || 0;
    const occupied = property.status === 'occupied';
    const tabs: [typeof activeTab, string][] = [
        ['overview', 'Overview & specs'],
        ['units', `Units (${property.units?.length || 1})`],
        ['lease', 'Lease & tenant'],
        ['maintenance', `Maintenance (${maintenanceList.length})`],
        ['financials', 'Payment ledger'],
    ];
    const paidAt = (p: Payment) => {
        const raw = p.paidAt as unknown;
        if (!raw) return 'Pending';
        const d = typeof raw === 'object' && raw !== null && 'toDate' in raw ? (raw as { toDate: () => Date }).toDate() : new Date(raw as string);
        return d.toLocaleDateString();
    };

    return (
        <AdminLayout title={property.name}>
            <Head>
                <title>{property.name} - Admin</title>
            </Head>

            <div className="owner-page">
                <div className="owner-page__head">
                    <div>
                        <p className="section-eyebrow">Admin · Property</p>
                        <h1>{property.name}</h1>
                        <p className="owner-page__sub">{formatAddress(property.address)}</p>
                        <div className="owner-meta">
                            <span className={`tag ${occupied ? 'tag--success' : 'tag--warning'}`}>{occupied ? 'Occupied' : 'Vacant'}</span>
                            <span>Source: {property.source === 'ghl' ? 'GoHighLevel' : 'Direct'}</span>
                            {property.ghlObjectId ? <span className="tag tag--info">GHL linked</span> : null}
                        </div>
                    </div>
                    <div className="owner-page__actions">
                        <button type="button" className="outline-button" onClick={() => router.push(`/admin/properties/${property.id}/edit`)}>
                            Edit property
                        </button>
                        <Link href={`/admin/leases/new?propertyId=${property.id}`} className="primary-button">
                            Create lease
                        </Link>
                    </div>
                </div>

                <div className="owner-page__stats">
                    <div className="stat-card">
                        <div className="stat-card__label">Monthly rent</div>
                        <div className="stat-card__value">${rent.toLocaleString()}</div>
                        <div className="stat-card__meta">{activeLease ? 'Under an active lease' : 'Target rent while vacant'}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__label">Total collected</div>
                        <div className="stat-card__value stat-card__value--good">${totalCollected.toLocaleString()}</div>
                        <div className="stat-card__meta">Recorded payments, all time</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__label">Open work orders</div>
                        <div className={`stat-card__value${openTickets.length ? ' stat-card__value--warn' : ''}`}>{openTickets.length}</div>
                        <div className="stat-card__meta">{maintenanceList.length} ticket{maintenanceList.length === 1 ? '' : 's'} on record</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__label">Units</div>
                        <div className="stat-card__value">{property.units?.length || 1}</div>
                        <div className="stat-card__meta">{property.units?.length ? 'Multi-unit building' : 'Single family'}</div>
                    </div>
                </div>

                {property.images && property.images.length > 0 && (
                    <div className="photo-strip">
                        {property.images.slice(0, 4).map((url, i) => (
                            <div key={i} className="photo-item">
                                <Image src={url} alt={`Photo ${i + 1}`} fill style={{ objectFit: 'cover' }} />
                            </div>
                        ))}
                    </div>
                )}

                <div className="owner-tabs" role="tablist" aria-label="Property sections">
                    {tabs.map(([key, label]) => (
                        <button key={key} type="button" role="tab" aria-selected={activeTab === key} className={`owner-tab${activeTab === key ? ' owner-tab--active' : ''}`} onClick={() => setActiveTab(key)}>
                            {label}
                        </button>
                    ))}
                </div>

                {activeTab === 'overview' && (
                    <div className="owner-page__grid">
                        <div className="owner-page__stack">
                            <section className="owner-card">
                                <div className="owner-card__head"><h2>Unit specifications</h2></div>
                                <div className="owner-kv">
                                    <div><span>Bedrooms</span><span>{property.bedrooms || 1}</span></div>
                                    <div><span>Bathrooms</span><span>{property.bathrooms || 1}</span></div>
                                    <div><span>Square feet</span><span>{property.squareFeet ? property.squareFeet.toLocaleString() : 'Not recorded'}</span></div>
                                    <div><span>Status</span><span className="capitalize">{property.status || 'unknown'}</span></div>
                                </div>
                                {property.description && (
                                    <div>
                                        <h3 className="owner-card__subhead">Description</h3>
                                        <p className="owner-note">{property.description}</p>
                                    </div>
                                )}
                            </section>

                            {property.amenities && property.amenities.length > 0 && (
                                <section className="owner-card">
                                    <div className="owner-card__head"><h2>Amenities</h2></div>
                                    <div className="owner-page__chips">
                                        {property.amenities.map((item, idx) => (
                                            <span key={idx} className="tag tag--neutral">{item}</span>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="owner-page__stack">
                            <section className="owner-card">
                                <div className="owner-card__head"><h2>Ownership</h2></div>
                                <div className="owner-kv">
                                    <div><span>Assigned landlord</span><span>{property.landlordName || 'Unassigned / Direct'}</span></div>
                                    {property.landlordId && <div><span>Landlord ID</span><span className="owner-mono">{property.landlordId}</span></div>}
                                </div>
                            </section>

                            <section className="owner-card">
                                <div className="owner-card__head"><h2>Management</h2></div>
                                <div className="owner-page__chips">
                                    <Link href="/admin/rent-payments" className="owner-small-button">View rent roll</Link>
                                    <Link href="/admin/maintenance" className="owner-small-button">Maintenance queue</Link>
                                </div>
                            </section>
                        </div>
                    </div>
                )}

                {activeTab === 'units' && (
                    <section className="owner-card owner-table">
                        <div className="owner-card__head"><h2>Units</h2></div>
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Unit</th>
                                        <th>Beds / baths</th>
                                        <th>Square feet</th>
                                        <th>Target rent</th>
                                        <th>Status</th>
                                        <th>Current resident</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {property.units && property.units.length > 0 ? (
                                        property.units.map((unit) => (
                                            <tr key={unit.id}>
                                                <th scope="row">Unit {unit.unitNumber}</th>
                                                <td>{unit.bedrooms}b / {unit.bathrooms}ba</td>
                                                <td>{unit.squareFeet} sqft</td>
                                                <td>${unit.rent}/mo</td>
                                                <td><span className={`tag ${unit.status === 'occupied' ? 'tag--success' : 'tag--warning'}`}>{unit.status}</span></td>
                                                <td>{unit.currentTenantName || 'Vacant'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <th scope="row">Main / single family</th>
                                            <td>{property.bedrooms || 1}b / {property.bathrooms || 1}ba</td>
                                            <td>{property.squareFeet || 0} sqft</td>
                                            <td>${rent.toLocaleString()}/mo</td>
                                            <td><span className={`tag ${occupied ? 'tag--success' : 'tag--warning'}`}>{property.status}</span></td>
                                            <td>{activeLease?.tenantName || 'See lease tab'}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {activeTab === 'lease' && (
                    activeLease ? (
                        <section className="owner-card">
                            <div className="owner-card__head">
                                <h2>Active lease</h2>
                                <Link href={`/admin/ledger/${activeLease.tenantId}`} className="owner-small-button">Tenant ledger</Link>
                            </div>
                            <div className="owner-kv">
                                <div><span>Resident</span><span><Link href={`/admin/tenants/${activeLease.tenantId}`}>{activeLease.tenantName || 'Resident'}</Link></span></div>
                                <div><span>Contract rent</span><span>${activeLease.monthlyRent.toLocaleString()}/mo, due day {activeLease.paymentDueDay || 1}</span></div>
                                <div><span>Lease term</span><span>{new Date(activeLease.startDate as string).toLocaleDateString()} to {new Date(activeLease.endDate as string).toLocaleDateString()}</span></div>
                                {activeLease.securityDeposit ? <div><span>Security deposit</span><span>${activeLease.securityDeposit.toLocaleString()}</span></div> : null}
                            </div>
                        </section>
                    ) : (
                        <section className="owner-card">
                            <div className="owner-card__head"><h2>No active lease</h2></div>
                            <p className="owner-empty">Nobody is on a lease at this property right now.</p>
                            <div>
                                <Link href={`/admin/leases/new?propertyId=${property.id}`} className="primary-button">Create lease</Link>
                            </div>
                        </section>
                    )
                )}

                {activeTab === 'maintenance' && (
                    <section className="owner-card">
                        <div className="owner-card__head"><h2>Maintenance</h2></div>
                        {maintenanceList.length > 0 ? (
                            <ul className="owner-list">
                                {maintenanceList.map((ticket) => (
                                    <li key={ticket.id}>
                                        <div className="owner-list__text">
                                            <strong>{ticket.title}</strong>
                                            <span>{ticket.description}</span>
                                            {ticket.adminNotes ? <span>Note: {ticket.adminNotes}</span> : null}
                                        </div>
                                        <span className={`tag ${ticket.priority === 'urgent' || ticket.priority === 'high' ? 'tag--error' : 'tag--neutral'}`}>{ticket.priority}</span>
                                        <span className={`tag ${ticket.status === 'completed' ? 'tag--success' : 'tag--info'}`}>{ticket.status.replace('_', ' ')}</span>
                                        <button type="button" className="owner-small-button" onClick={() => setSelectedMaintenance(ticket)}>Update</button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="owner-empty">No maintenance tickets for this property.</p>
                        )}
                    </section>
                )}

                {activeTab === 'financials' && (
                    <section className="owner-card owner-table">
                        <div className="owner-card__head"><h2>Payment records</h2></div>
                        {paymentsList.length > 0 ? (
                            <div className="table-wrapper">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Description</th>
                                            <th>Method</th>
                                            <th>Status</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paymentsList.map((p) => (
                                            <tr key={p.id}>
                                                <th scope="row">{paidAt(p)}</th>
                                                <td>{p.description || 'Monthly rent'}</td>
                                                <td className="capitalize">{p.paymentMethod || 'Online'}</td>
                                                <td><span className={`tag ${p.status === 'paid' || p.status === 'succeeded' ? 'tag--success' : 'tag--warning'}`}>{p.status}</span></td>
                                                <td>${p.amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="owner-empty">No payment history recorded for this property.</p>
                        )}
                    </section>
                )}

                {selectedMaintenance && (
                    <MaintenanceStatusModal
                        isOpen={Boolean(selectedMaintenance)}
                        request={selectedMaintenance}
                        onClose={() => setSelectedMaintenance(null)}
                        onSuccess={() => {
                            setSelectedMaintenance(null);
                            loadData();
                        }}
                    />
                )}
            </div>

            <style jsx>{`
                .photo-strip {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1rem;
                    height: 200px;
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                }
                .photo-item {
                    position: relative;
                    height: 100%;
                    background: var(--color-surface-elevated);
                }
                .owner-card__subhead {
                    margin: 0 0 0.35rem;
                    font-size: 0.95rem;
                    color: var(--color-text);
                }
                .owner-empty-state {
                    display: grid;
                    gap: 1rem;
                    justify-items: start;
                }
                .capitalize {
                    text-transform: capitalize;
                }
                @media (max-width: 720px) {
                    .photo-strip {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
            `}</style>
        </AdminLayout>
    );
};

AdminPropertyDetailPage.requireAuth = true;
AdminPropertyDetailPage.allowedRoles = ['admin', 'super-admin'];

export default AdminPropertyDetailPage;
