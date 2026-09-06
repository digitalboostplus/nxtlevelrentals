import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import LoadingState from '@/components/common/LoadingState';
import Card from '@/components/common/Card';
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
            <AdminLayout title="Property Control Center">
                <div className="p-8">
                    <LoadingState message="Loading property details..." />
                </div>
            </AdminLayout>
        );
    }

    if (!property) {
        return (
            <AdminLayout title="Property Not Found">
                <div className="p-8 text-center">
                    <h2>Property Not Found</h2>
                    <p className="text-gray-500 mb-4">The property ID does not exist in Firestore.</p>
                    <Link href="/admin/properties" className="primary-button">
                        Back to Properties
                    </Link>
                </div>
            </AdminLayout>
        );
    }

    const totalCollected = paymentsList
        .filter((p) => p.status === 'paid' || p.status === 'succeeded')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

    const openTickets = maintenanceList.filter((m) => m.status !== 'completed' && m.status !== 'cancelled');

    return (
        <AdminLayout title={property.name}>
            <Head>
                <title>{property.name} - Admin Property Control</title>
            </Head>

            <div className="admin-property-page">
                {/* Header */}
                <div className="property-header">
                    <div className="property-header__info">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`tag ${property.status === 'occupied' ? 'tag--success' : 'tag--warning'}`}>
                                {property.status === 'occupied' ? 'Occupied' : 'Vacant'}
                            </span>
                            <span className="text-xs text-gray-500">Source: {property.source || 'Direct'}</span>
                            {property.ghlObjectId && (
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-900/40 text-blue-400 border border-blue-800">
                                    GHL Linked
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl font-extrabold text-white">{property.name}</h1>
                        <p className="text-gray-400 text-sm mt-1">{formatAddress(property.address)}</p>
                    </div>

                    <div className="property-header__actions">
                        <Link href={`/admin/leases/new?propertyId=${property.id}`} className="primary-button">
                            + Create Lease
                        </Link>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="stat-box">
                        <span className="stat-box__lbl">Monthly Rent</span>
                        <span className="stat-box__val">${(property.defaultRentAmount || property.rent || 0).toLocaleString()}</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-box__lbl">Total Collected</span>
                        <span className="stat-box__val text-green-400">${totalCollected.toLocaleString()}</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-box__lbl">Open Work Orders</span>
                        <span className="stat-box__val text-amber-400">{openTickets.length}</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-box__lbl">Units</span>
                        <span className="stat-box__val">{property.units?.length || 1} Unit(s)</span>
                    </div>
                </div>

                {/* Gallery */}
                {property.images && property.images.length > 0 && (
                    <div className="photo-strip mb-8">
                        {property.images.slice(0, 4).map((url, i) => (
                            <div key={i} className="photo-item">
                                <Image src={url} alt={`Photo ${i + 1}`} fill style={{ objectFit: 'cover' }} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Tabs */}
                <div className="tabs-nav mb-6">
                    <button
                        className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview & Specs
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'units' ? 'active' : ''}`}
                        onClick={() => setActiveTab('units')}
                    >
                        Units ({property.units?.length || 1})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'lease' ? 'active' : ''}`}
                        onClick={() => setActiveTab('lease')}
                    >
                        Lease & Tenant
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`}
                        onClick={() => setActiveTab('maintenance')}
                    >
                        Maintenance ({maintenanceList.length})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'financials' ? 'active' : ''}`}
                        onClick={() => setActiveTab('financials')}
                    >
                        Payment Ledger
                    </button>
                </div>

                {/* Tab Views */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                            <Card title="Unit Specifications">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase block">Bedrooms</span>
                                        <span className="text-base font-bold text-white">{property.bedrooms || 1} Bed</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase block">Bathrooms</span>
                                        <span className="text-base font-bold text-white">{property.bathrooms || 1} Bath</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase block">Square Feet</span>
                                        <span className="text-base font-bold text-white">{property.squareFeet ? property.squareFeet.toLocaleString() : 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase block">Status</span>
                                        <span className="text-base font-bold text-green-400 capitalize">{property.status}</span>
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
                                <Card title="Amenities & Inclusions">
                                    <div className="flex flex-wrap gap-2">
                                        {property.amenities.map((item, idx) => (
                                            <span key={idx} className="tag tag--neutral">
                                                ✓ {item}
                                            </span>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>

                        <div className="space-y-6">
                            <Card title="Ownership & Landlord Link">
                                <div className="p-4 bg-gray-900 rounded-lg border border-gray-800 space-y-3">
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase block">Assigned Landlord</span>
                                        <span className="text-sm font-semibold text-white">{property.landlordName || 'Unassigned / Direct'}</span>
                                    </div>
                                    {property.landlordId && (
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase block">Landlord ID</span>
                                            <span className="text-xs text-gray-400 font-mono">{property.landlordId}</span>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            <Card title="Management Operations">
                                <div className="flex flex-col gap-2">
                                    <button
                                        className="outline-button w-full text-center"
                                        onClick={() => router.push(`/admin/properties/${property.id}/edit`)}
                                    >
                                        Edit Property Details
                                    </button>
                                    <Link href="/admin/rent-payments" className="secondary-button w-full text-center">
                                        View Rent Roll
                                    </Link>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'units' && (
                    <Card title="Building Units Inventory">
                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead>
                                    <tr>
                                        <th>Unit #</th>
                                        <th>Beds / Baths</th>
                                        <th>Square Feet</th>
                                        <th>Target Rent</th>
                                        <th>Status</th>
                                        <th>Current Resident</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {property.units && property.units.length > 0 ? (
                                        property.units.map((unit) => (
                                            <tr key={unit.id}>
                                                <td className="font-bold text-white">Unit {unit.unitNumber}</td>
                                                <td>{unit.bedrooms}b / {unit.bathrooms}ba</td>
                                                <td>{unit.squareFeet} sqft</td>
                                                <td className="font-semibold text-white">${unit.rent}/mo</td>
                                                <td>
                                                    <span className={`tag ${unit.status === 'occupied' ? 'tag--success' : 'tag--warning'}`}>
                                                        {unit.status}
                                                    </span>
                                                </td>
                                                <td>{unit.currentTenantName || 'Vacant'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td className="font-bold text-white">Unit Main / Single Family</td>
                                            <td>{property.bedrooms || 1}b / {property.bathrooms || 1}ba</td>
                                            <td>{property.squareFeet || 0} sqft</td>
                                            <td className="font-semibold text-white">${(property.defaultRentAmount || property.rent || 0).toLocaleString()}/mo</td>
                                            <td>
                                                <span className={`tag ${property.status === 'occupied' ? 'tag--success' : 'tag--warning'}`}>
                                                    {property.status}
                                                </span>
                                            </td>
                                            <td>{activeLease?.tenantName || 'See Leases tab'}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {activeTab === 'lease' && (
                    <div>
                        {activeLease ? (
                            <Card title="Active Lease Details">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase block">Resident Name</span>
                                        <span className="text-base font-bold text-white mt-1 block">
                                            {activeLease.tenantName || 'Resident (Assigned)'}
                                        </span>
                                        <Link href={`/admin/tenants/${activeLease.tenantId}`} className="text-xs text-primary hover:underline mt-1 inline-block">
                                            View Tenant 360 Profile →
                                        </Link>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase block">Contract Rent</span>
                                        <span className="text-2xl font-extrabold text-green-400 mt-1 block">
                                            ${activeLease.monthlyRent.toLocaleString()}/mo
                                        </span>
                                        <span className="text-xs text-gray-500">Due on day {activeLease.paymentDueDay || 1} of month</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase block">Lease Term</span>
                                        <span className="text-sm text-gray-200 mt-1 block">
                                            {new Date(activeLease.startDate as string).toLocaleDateString()} — {new Date(activeLease.endDate as string).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-gray-800 flex gap-4">
                                    <Link href={`/admin/ledger/${activeLease.tenantId}`} className="secondary-button">
                                        View Tenant Financial Ledger
                                    </Link>
                                </div>
                            </Card>
                        ) : (
                            <div className="p-8 text-center bg-gray-900 rounded-xl border border-gray-800">
                                <p className="text-gray-400 mb-4">No active lease associated with this property.</p>
                                <Link href={`/admin/leases/new?propertyId=${property.id}`} className="primary-button">
                                    + Create New Lease Agreement
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'maintenance' && (
                    <div>
                        {maintenanceList.length > 0 ? (
                            <div className="space-y-4">
                                {maintenanceList.map((ticket) => (
                                    <div key={ticket.id} className="p-5 bg-gray-900 rounded-xl border border-gray-800 flex justify-between items-start flex-wrap gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`tag ${ticket.priority === 'urgent' || ticket.priority === 'high' ? 'tag--error' : 'tag--neutral'}`}>
                                                    {ticket.priority} priority
                                                </span>
                                                <span className={`tag ${ticket.status === 'completed' ? 'tag--success' : 'tag--info'}`}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                            <h4 className="text-lg font-bold text-white">{ticket.title}</h4>
                                            <p className="text-sm text-gray-300 mt-1">{ticket.description}</p>
                                            {ticket.adminNotes && (
                                                <p className="text-xs text-gray-400 mt-2 p-2 bg-gray-800 rounded">
                                                    Note: {ticket.adminNotes}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            className="outline-button text-xs py-1.5 px-3"
                                            onClick={() => setSelectedMaintenance(ticket)}
                                        >
                                            Update Status / Notes
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center py-8 text-gray-500">No maintenance tickets for this property.</p>
                        )}
                    </div>
                )}

                {activeTab === 'financials' && (
                    <Card title="Property Payment Records">
                        {paymentsList.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="table w-full">
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
                                                <td>{p.paidAt ? ((p.paidAt as any).toDate ? (p.paidAt as any).toDate().toLocaleDateString() : new Date(p.paidAt as any).toLocaleDateString()) : 'Pending'}</td>
                                                <td>{p.description || 'Monthly Rent'}</td>
                                                <td className="capitalize">{p.paymentMethod || 'Online'}</td>
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
                            <p className="text-center py-6 text-gray-500">No payment history recorded for this property.</p>
                        )}
                    </Card>
                )}

                {/* Maintenance Modal */}
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
                .admin-property-page {
                    padding: 2rem;
                    max-width: var(--max-width);
                    margin: 0 auto;
                }

                .property-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    flex-wrap: wrap;
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid var(--color-border);
                }

                .stat-box {
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    padding: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .stat-box__lbl {
                    font-size: 0.75rem;
                    color: var(--color-muted);
                    text-transform: uppercase;
                    font-weight: 600;
                }

                .stat-box__val {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--color-text);
                }

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

                .tabs-nav {
                    display: flex;
                    gap: 0.75rem;
                    border-bottom: 1px solid var(--color-border);
                    overflow-x: auto;
                }

                .tab-btn {
                    background: transparent;
                    border: none;
                    border-bottom: 2px solid transparent;
                    color: var(--color-muted);
                    padding: 0.75rem 1rem;
                    font-weight: 600;
                    font-size: 0.938rem;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    white-space: nowrap;
                }

                .tab-btn:hover {
                    color: var(--color-text);
                }

                .tab-btn.active {
                    color: var(--color-primary);
                    border-bottom-color: var(--color-primary);
                }
            `}</style>
        </AdminLayout>
    );
};

AdminPropertyDetailPage.requireAuth = true;
AdminPropertyDetailPage.allowedRoles = ['admin', 'super-admin'];

export default AdminPropertyDetailPage;
