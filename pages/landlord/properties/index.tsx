import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import LandlordLayout from '@/components/Landlord/LandlordLayout';
import LoadingState from '@/components/common/LoadingState';
import { useLandlordData } from '@/hooks/useLandlordData';
import type { Property } from '@/types/schema';
import type { NextPageWithAuth } from '../../_app';

function formatAddress(address: Property['address']) {
    if (!address) return 'No address provided';
    if (typeof address === 'string') return address;
    return `${address.street || ''}${address.city ? `, ${address.city}` : ''}${address.state ? ` ${address.state}` : ''}`;
}

const LandlordPropertiesPage: NextPageWithAuth = () => {
    const { properties, loading, error } = useLandlordData();
    const [filterStatus, setFilterStatus] = useState<'all' | 'occupied' | 'vacant'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = properties.filter((p) => {
        const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
        const addr = formatAddress(p.address).toLowerCase();
        const name = (p.name || '').toLowerCase();
        const matchesSearch = name.includes(searchQuery.toLowerCase()) || addr.includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const occupiedCount = properties.filter(p => p.status === 'occupied').length;
    const vacantCount = properties.filter(p => p.status === 'vacant').length;

    return (
        <LandlordLayout title="My Properties">
            <Head>
                <title>My Properties - Owner Portal</title>
            </Head>

            <div className="properties-container">
                <div className="page-header">
                    <div>
                        <h1>My Properties</h1>
                        <p>Manage and monitor all properties and units under management.</p>
                    </div>
                    <div className="portfolio-stats-chips">
                        <span className="chip chip--neutral">Total: {properties.length}</span>
                        <span className="chip chip--success">Occupied: {occupiedCount}</span>
                        <span className="chip chip--warning">Vacant: {vacantCount}</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="filters-bar">
                    <div className="search-input-wrapper">
                        <input
                            type="text"
                            placeholder="Search by property name or address..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <div className="status-tabs">
                        <button
                            type="button"
                            className={`tab-btn ${filterStatus === 'all' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('all')}
                        >
                            All ({properties.length})
                        </button>
                        <button
                            type="button"
                            className={`tab-btn ${filterStatus === 'occupied' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('occupied')}
                        >
                            Occupied ({occupiedCount})
                        </button>
                        <button
                            type="button"
                            className={`tab-btn ${filterStatus === 'vacant' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('vacant')}
                        >
                            Vacant ({vacantCount})
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="p-8">
                        <LoadingState message="Loading your properties..." />
                    </div>
                ) : error ? (
                    <div className="error-box">{error}</div>
                ) : filtered.length === 0 ? (
                    <div className="empty-box">
                        <p>No properties match your current filters.</p>
                    </div>
                ) : (
                    <div className="properties-grid">
                        {filtered.map((property) => (
                            <div key={property.id} className="property-card">
                                <div className="property-card__image-wrap">
                                    {property.images?.[0] ? (
                                        <Image
                                            src={property.images[0]}
                                            alt={property.name}
                                            fill
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            style={{ objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div className="placeholder-image">
                                            <span>🏢 {property.name}</span>
                                        </div>
                                    )}
                                    <span className={`status-badge ${property.status === 'occupied' ? 'badge--occupied' : 'badge--vacant'}`}>
                                        {property.status === 'occupied' ? 'Occupied' : 'Vacant'}
                                    </span>
                                </div>
                                <div className="property-card__body">
                                    <h3 className="property-title">{property.name}</h3>
                                    <p className="property-address">{formatAddress(property.address)}</p>

                                    <div className="property-specs">
                                        {property.bedrooms ? <span>🛏️ {property.bedrooms} Beds</span> : null}
                                        {property.bathrooms ? <span>🚿 {property.bathrooms} Baths</span> : null}
                                        {property.squareFeet ? <span>📐 {property.squareFeet.toLocaleString()} sqft</span> : null}
                                    </div>

                                    <div className="property-card__footer">
                                        <div>
                                            <span className="rent-label">Monthly Rent</span>
                                            <span className="rent-value">${(property.defaultRentAmount || property.rent || 0).toLocaleString()}/mo</span>
                                        </div>
                                        <Link href={`/landlord/properties/${property.id}`} className="primary-button text-sm py-2 px-4">
                                            Manage Property →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx>{`
                .properties-container {
                    padding: 2rem;
                    max-width: var(--max-width);
                    margin: 0 auto;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    flex-wrap: wrap;
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                h1 {
                    font-size: 2rem;
                    font-weight: 800;
                    color: var(--color-text);
                    margin: 0 0 0.25rem;
                }

                p {
                    color: var(--color-muted);
                    margin: 0;
                }

                .portfolio-stats-chips {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .chip {
                    padding: 0.35rem 0.85rem;
                    border-radius: var(--radius-full);
                    font-size: 0.813rem;
                    font-weight: 600;
                }

                .chip--neutral {
                    background: var(--tag-neutral-bg);
                    color: var(--tag-neutral-text);
                }

                .chip--success {
                    background: var(--tag-success-bg);
                    color: var(--tag-success-text);
                }

                .chip--warning {
                    background: var(--tag-warning-bg);
                    color: var(--tag-warning-text);
                }

                .filters-bar {
                    display: flex;
                    justify-content: space-between;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    flex-wrap: wrap;
                }

                .search-input-wrapper {
                    flex: 1;
                    min-width: 260px;
                }

                .search-input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    color: var(--color-text);
                    font-size: 0.938rem;
                }

                .search-input:focus {
                    outline: none;
                    border-color: var(--color-primary);
                }

                .status-tabs {
                    display: flex;
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    padding: 0.25rem;
                    gap: 0.25rem;
                }

                .tab-btn {
                    background: transparent;
                    border: none;
                    color: var(--color-muted);
                    padding: 0.5rem 1rem;
                    border-radius: var(--radius-sm);
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }

                .tab-btn:hover {
                    color: var(--color-text);
                }

                .tab-btn.active {
                    background: var(--color-primary);
                    color: white;
                }

                .properties-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 2rem;
                }

                .property-card {
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
                    display: flex;
                    flex-direction: column;
                }

                .property-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-md);
                }

                .property-card__image-wrap {
                    height: 200px;
                    position: relative;
                    background: var(--color-surface-elevated);
                }

                .placeholder-image {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--color-muted);
                    font-size: 1.1rem;
                    font-weight: 600;
                }

                .status-badge {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    padding: 0.35rem 0.75rem;
                    border-radius: var(--radius-full);
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .badge--occupied {
                    background: rgba(34, 197, 94, 0.9);
                    color: white;
                }

                .badge--vacant {
                    background: rgba(247, 183, 51, 0.9);
                    color: #111827;
                }

                .property-card__body {
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                }

                .property-title {
                    margin: 0 0 0.35rem;
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--color-text);
                }

                .property-address {
                    font-size: 0.875rem;
                    color: var(--color-muted);
                    margin: 0 0 1rem;
                    line-height: 1.4;
                }

                .property-specs {
                    display: flex;
                    gap: 1rem;
                    font-size: 0.813rem;
                    color: var(--color-muted);
                    padding-bottom: 1.25rem;
                    margin-bottom: auto;
                    border-bottom: 1px solid var(--color-border);
                }

                .property-card__footer {
                    padding-top: 1.25rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .rent-label {
                    display: block;
                    font-size: 0.75rem;
                    color: var(--color-muted);
                    text-transform: uppercase;
                }

                .rent-value {
                    font-size: 1.125rem;
                    font-weight: 800;
                    color: var(--color-text);
                }

                .empty-box, .error-box {
                    text-align: center;
                    padding: 4rem 2rem;
                    background: var(--color-surface);
                    border: 1px dashed var(--color-border);
                    border-radius: var(--radius-lg);
                    color: var(--color-muted);
                }
            `}</style>
        </LandlordLayout>
    );
};

LandlordPropertiesPage.requireAuth = true;
LandlordPropertiesPage.allowedRoles = ['landlord', 'admin', 'super-admin'];

export default LandlordPropertiesPage;
