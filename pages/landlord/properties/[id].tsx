import PrivateFile from '@/components/common/PrivateFile';
import { formatLocalDate } from '@/lib/date';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState } from 'react';
import LandlordLayout from '@/components/Landlord/LandlordLayout';
import LoadingState from '@/components/common/LoadingState';
import Card from '@/components/common/Card';
import { useLandlordData } from '@/hooks/useLandlordData';
import { ownerStatement } from '@/lib/ownerFinancials';
import type { Property, Lease, MaintenanceRequest, Payment } from '@/types/schema';
import type { NextPageWithAuth } from '../../_app';

function formatAddress(address: Property['address']) {
    if (!address) return 'No address provided';
    if (typeof address === 'string') return address;
    return `${address.street || ''}${address.city ? `, ${address.city}` : ''}${address.state ? ` ${address.state}` : ''}${address.zipCode ? ` ${address.zipCode}` : ''}`;
}

const LandlordPropertyDetailPage: NextPageWithAuth = () => {
    const router = useRouter();
    const { id } = router.query;
    const propertyId = id as string;

    const { properties, leases, maintenanceRequests: maintenanceList, payments: paymentsList, ledger, expenses, loading, error, refresh } = useLandlordData(propertyId);
    const property = properties.find(p => p.id === propertyId) || null;
    const activeLeases = leases.filter(l => l.isActive && l.status === 'active');
    const activeLease = activeLeases[0] || null;
    const [activeTab, setActiveTab] = useState<'overview' | 'lease' | 'maintenance' | 'financials'>('overview');
    const statement = ownerStatement(ledger, expenses, 'all-time');
    if (error) return <LandlordLayout title="Property unavailable"><p role="alert">{error} <button onClick={refresh}>Retry</button></p></LandlordLayout>;

    if (loading) {
        return (
            <LandlordLayout title="Property Details">
                <div className="p-8">
                    <LoadingState message="Loading property details..." />
                </div>
            </LandlordLayout>
        );
    }

    if (!property) {
        return (
            <LandlordLayout title="Property Not Found">
                <div className="p-8 text-center">
                    <h2>Property Not Found</h2>
                    <p className="text-gray-500 mb-4">The requested property does not exist or has been removed.</p>
                    <Link href="/landlord/properties" className="primary-button">
                        Back to Properties
                    </Link>
                </div>
            </LandlordLayout>
        );
    }

    const totalCollected = statement.rent;

    return (
        <LandlordLayout title={property.name}>
            <Head>
                <title>{property.name} - Property Details</title>
            </Head>

            <div className="property-detail-page">
                {activeLeases.length > 1 && <Card title="Active unit leases">{activeLeases.map(l => <p key={l.id}>{l.unit || 'Unit'}: {l.tenantName || 'Resident'} ? ${l.monthlyRent.toFixed(2)} per month</p>)}</Card>}
                <p>All-time recorded rent: ${statement.rent.toFixed(2)} ? Paid expenses: ${statement.totalExpenses.toFixed(2)} ? Recorded net: ${statement.net.toFixed(2)}</p>
                {/* Header / Hero */}
                <div className="property-header">
                    <div className="property-header__main">
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`status-tag ${property.status === 'occupied' ? 'status--occupied' : 'status--vacant'}`}>
                                {property.status === 'occupied' ? 'Occupied' : 'Vacant'}
                            </span>
                            <span className="text-sm text-gray-400">ID: {property.id}</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-white">{property.name}</h1>
                        <p className="text-gray-400 text-base mt-1">{formatAddress(property.address)}</p>
                    </div>

                    <div className="property-header__stats">
                        <div className="header-stat">
                            <span className="stat-lbl">Target Rent</span>
                            <span className="stat-val">${(property.defaultRentAmount || property.rent || 0).toLocaleString()}/mo</span>
                        </div>
                        <div className="header-stat">
                            <span className="stat-lbl">Collected</span>
                            <span className="stat-val text-green-400">${totalCollected.toLocaleString()}</span>
                        </div>
                        <div className="header-stat">
                            <span className="stat-lbl">Open Tickets</span>
                            <span className="stat-val text-amber-400">
                                {maintenanceList.filter((m) => m.status !== 'completed' && m.status !== 'cancelled').length}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Photos strip */}
                {property.images && property.images.length > 0 ? (
                    <div className="property-gallery">
                        {property.images.slice(0, 4).map((imgUrl, idx) => (
                            <div key={idx} className="gallery-item">
                                <Image
                                    src={imgUrl}
                                    alt={`${property.name} photo ${idx + 1}`}
                                    fill
                                    style={{ objectFit: 'cover' }}
                                />
                            </div>
                        ))}
                    </div>
                ) : null}

                {/* Navigation Tabs */}
                <div className="detail-tabs">
                    <button
                        className={`tab-link ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview & Specs
                    </button>
                    <button
                        className={`tab-link ${activeTab === 'lease' ? 'active' : ''}`}
                        onClick={() => setActiveTab('lease')}
                    >
                        Active Lease & Tenant
                    </button>
                    <button
                        className={`tab-link ${activeTab === 'maintenance' ? 'active' : ''}`}
                        onClick={() => setActiveTab('maintenance')}
                    >
                        Maintenance ({maintenanceList.length})
                    </button>
                    <button
                        className={`tab-link ${activeTab === 'financials' ? 'active' : ''}`}
                        onClick={() => setActiveTab('financials')}
                    >
                        Financials & Ledger
                    </button>
                </div>

                {/* Tab Contents */}
                <div className="detail-content">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-6">
                                <Card title="Property Specifications">
                                    <div className="specs-grid">
                                        <div className="spec-card">
                                            <span className="spec-label">Bedrooms</span>
                                            <span className="spec-value">🛏️ {property.bedrooms || 'Studio'}</span>
                                        </div>
                                        <div className="spec-card">
                                            <span className="spec-label">Bathrooms</span>
                                            <span className="spec-value">🚿 {property.bathrooms || 1}</span>
                                        </div>
                                        <div className="spec-card">
                                            <span className="spec-label">Square Feet</span>
                                            <span className="spec-value">📐 {property.squareFeet ? property.squareFeet.toLocaleString() : 'N/A'} sqft</span>
                                        </div>
                                        <div className="spec-card">
                                            <span className="spec-label">Property Type</span>
                                            <span className="spec-value">Residential</span>
                                        </div>
                                    </div>

                                    {property.description && (
                                        <div className="mt-6 pt-6 border-t border-gray-800">
                                            <h4 className="text-sm font-semibold text-gray-300 mb-2">Description</h4>
                                            <p className="text-gray-400 text-sm leading-relaxed">{property.description}</p>
                                        </div>
                                    )}
                                </Card>

                                {property.amenities && property.amenities.length > 0 && (
                                    <Card title="Features & Amenities">
                                        <div className="flex flex-wrap gap-2">
                                            {property.amenities.map((item, i) => (
                                                <span key={i} className="amenity-chip">
                                                    ✨ {item}
                                                </span>
                                            ))}
                                        </div>
                                    </Card>
                                )}
                            </div>

                            <div className="space-y-6">
                                <Card title="Occupancy Overview">
                                    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800 text-center">
                                        <span className={`text-sm font-bold uppercase tracking-wider ${property.status === 'occupied' ? 'text-green-400' : 'text-amber-400'}`}>
                                            Status: {property.status}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {property.status === 'occupied'
                                                ? 'Currently leased and occupied by resident'
                                                : 'Vacant - available for prospective tenants'}
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Monthly Rent:</span>
                                            <span className="font-bold text-white">${(property.defaultRentAmount || property.rent || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Management Status:</span>
                                            <span className="text-blue-400 font-semibold capitalize">{property.managementStatus || 'Active'}</span>
                                        </div>
                                    </div>
                                </Card>

                                <Card title="Quick Owner Actions">
                                    <div className="flex flex-col gap-3">
                                        <Link href={`/landlord/expenses?propertyId=${property.id}`} className="outline-button w-full text-center">
                                            + Log Property Expense
                                        </Link>
                                        <Link href={`/landlord/financials`} className="secondary-button w-full text-center">
                                            View Revenue Statements
                                        </Link>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {activeTab === 'lease' && (
                        <div>
                            {activeLease ? (
                                <Card title="Current Lease Agreement">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-sm text-gray-400">Resident / Tenant</h4>
                                            <p className="text-lg font-bold text-white mt-1">
                                                {activeLease.tenantName || 'Resident (Assigned)'}
                                            </p>
                                            <span className="text-xs text-gray-500">Tenant UID: {activeLease.tenantId}</span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm text-gray-400">Monthly Rent</h4>
                                            <p className="text-2xl font-extrabold text-green-400 mt-1">
                                                ${activeLease.monthlyRent.toLocaleString()}/mo
                                            </p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm text-gray-400">Lease Term</h4>
                                            <p className="text-base text-gray-200 mt-1">
                                                {formatLocalDate(activeLease.startDate)} — {formatLocalDate(activeLease.endDate)}
                                            </p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm text-gray-400">Security Deposit</h4>
                                            <p className="text-base text-gray-200 mt-1">
                                                ${(activeLease.securityDeposit || 0).toLocaleString()} (Lease deposit amount)
                                            </p>
                                        </div>
                                    </div>

                                    {activeLease.fileIds?.map(id => <PrivateFile key={id} id={id} />)}
                                    {activeLease.documents && activeLease.documents.length > 0 && (
                                        <div className="mt-6 pt-6 border-t border-gray-800">
                                            <h4 className="text-sm font-semibold text-gray-300 mb-3">Lease Documents</h4>
                                            <div className="space-y-2">
                                                {activeLease.documents.map((docUrl, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={docUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 p-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-primary transition-colors text-sm text-primary"
                                                    >
                                                        📄 View Signed Lease Document (PDF)
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            ) : (
                                <div className="p-8 text-center bg-gray-900 rounded-xl border border-gray-800">
                                    <p className="text-gray-400 mb-3">No active lease agreement registered for this property.</p>
                                    <span className="text-xs text-gray-500">The property manager will record new leases upon tenant placement.</span>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'maintenance' && (
                        <div>
                            {maintenanceList.length > 0 ? (
                                <div className="space-y-4">
                                    {maintenanceList.map((ticket) => (
                                        <div key={ticket.id} className="p-5 bg-gray-900 rounded-xl border border-gray-800">
                                            <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                                                <div>
                                                    <h4 className="text-lg font-bold text-white">{ticket.title}</h4>
                                                    <span className="text-xs text-gray-400">
                                                        Submitted {ticket.createdAt ? ((ticket.createdAt as any).toDate ? (ticket.createdAt as any).toDate().toLocaleDateString() : new Date(ticket.createdAt as any).toLocaleDateString()) : 'Recently'}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className={`tag ${ticket.priority === 'urgent' || ticket.priority === 'high' ? 'tag--error' : 'tag--neutral'}`}>
                                                        {ticket.priority} priority
                                                    </span>
                                                    <span className={`tag ${ticket.status === 'completed' ? 'tag--success' : 'tag--info'}`}>
                                                        {ticket.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-gray-300 text-sm mb-3">{ticket.description}</p>
                                            {ticket.adminNotes && (
                                                <div className="p-3 bg-gray-800 rounded border border-gray-700 text-xs text-gray-300">
                                                    <strong>Technician / Manager Update:</strong> {ticket.adminNotes}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-gray-900 rounded-xl border border-gray-800">
                                    <p className="text-gray-400">No maintenance tickets reported for this property.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'financials' && (
                        <div className="space-y-6">
                            <Card title="Property Rent Collection History">
                                {paymentsList.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="table w-full">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Description</th>
                                                    <th>Payment Method</th>
                                                    <th>Status</th>
                                                    <th>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paymentsList.map((p) => (
                                                    <tr key={p.id}>
                                                        <td>{p.paidAt ? ((p.paidAt as any).toDate ? (p.paidAt as any).toDate().toLocaleDateString() : new Date(p.paidAt as any).toLocaleDateString()) : 'Pending'}</td>
                                                        <td>{p.description || 'Monthly Rent Payment'}</td>
                                                        <td className="capitalize">{p.paymentMethod || 'Not recorded'}</td>
                                                        <td>
                                                            <span className={`tag ${p.status === 'paid' || p.status === 'succeeded' ? 'tag--success' : 'tag--warning'}`}>
                                                                {p.status}
                                                            </span>
                                                        </td>
                                                        <td className="font-bold text-white">${p.amount.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-gray-400 italic text-center py-6">No payment records logged for this property yet.</p>
                                )}
                            </Card>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .property-detail-page {
                    padding: 2rem;
                    max-width: var(--max-width);
                    margin: 0 auto;
                }

                .property-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    flex-wrap: wrap;
                    gap: 2rem;
                    margin-bottom: 2rem;
                    padding-bottom: 2rem;
                    border-bottom: 1px solid var(--color-border);
                }

                .status-tag {
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--radius-full);
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                }

                .status--occupied {
                    background: var(--tag-success-bg);
                    color: var(--tag-success-text);
                }

                .status--vacant {
                    background: var(--tag-warning-bg);
                    color: var(--tag-warning-text);
                }

                .property-header__stats {
                    display: flex;
                    gap: 1.5rem;
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    padding: 1rem 1.5rem;
                    border-radius: var(--radius-lg);
                }

                .header-stat {
                    display: flex;
                    flex-direction: column;
                }

                .stat-lbl {
                    font-size: 0.75rem;
                    color: var(--color-muted);
                    text-transform: uppercase;
                }

                .stat-val {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: var(--color-text);
                }

                .property-gallery {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1rem;
                    height: 220px;
                    margin-bottom: 2rem;
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                }

                .gallery-item {
                    position: relative;
                    height: 100%;
                    background: var(--color-surface-elevated);
                }

                .detail-tabs {
                    display: flex;
                    border-bottom: 1px solid var(--color-border);
                    margin-bottom: 2rem;
                    gap: 1rem;
                    overflow-x: auto;
                }

                .tab-link {
                    background: transparent;
                    border: none;
                    border-bottom: 2px solid transparent;
                    color: var(--color-muted);
                    padding: 0.75rem 1rem;
                    font-size: 0.938rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    white-space: nowrap;
                }

                .tab-link:hover {
                    color: var(--color-text);
                }

                .tab-link.active {
                    color: var(--color-primary);
                    border-bottom-color: var(--color-primary);
                }

                .specs-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.25rem;
                }

                .spec-card {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .spec-label {
                    font-size: 0.75rem;
                    color: var(--color-muted);
                    text-transform: uppercase;
                }

                .spec-value {
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--color-text);
                }

                .amenity-chip {
                    padding: 0.35rem 0.85rem;
                    background: var(--color-surface-elevated);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-full);
                    font-size: 0.813rem;
                    color: var(--color-text);
                }

                @media (max-width: 768px) {
                    .property-gallery {
                        grid-template-columns: repeat(2, 1fr);
                        height: 160px;
                    }
                }
            `}</style>
        </LandlordLayout>
    );
};

LandlordPropertyDetailPage.requireAuth = true;
LandlordPropertyDetailPage.allowedRoles = ['landlord', 'admin', 'super-admin'];

export default LandlordPropertyDetailPage;
