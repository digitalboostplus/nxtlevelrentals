import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { propertyUtils } from '@/lib/firebase-utils';
import type { Property } from '@/lib/firebase-utils';
import PortfolioSummary from '@/components/Admin/PortfolioSummary';

export default function LandlordPortal() {
    const { user, profile } = useAuth();
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLandlordData = async () => {
            // Assuming landlordId is stored in profile or we use user.uid if profile.role is landlord?
            // In AuthContext, profile.landlordId is available.
            // But if the user IS the landlord, their UID might be the link, or they have a landlordId.
            // Let's assume user.uid is NOT the landlordId in the 'properties' collection logic unless they are linked.
            // Wait, 'properties' has 'landlordId'.

            // Check AuthContext.tsx:
            // landlordId?: string; // Reference to landlords/{id} for landlord users

            const targetLandlordId = profile?.landlordId || user?.uid; // Fallback to UID if no specific landlordId found (e.g. self-registered)

            if (!targetLandlordId) return;

            try {
                setLoading(true);
                // We need a way to get properties by landlord. propertyUtils.getPropertiesByLandlord exists!
                const data = await propertyUtils.getPropertiesByLandlord(targetLandlordId);
                setProperties(data);
            } catch (error) {
                console.error('Error fetching landlord properties:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLandlordData();
    }, [user, profile]);

    // Calculate simple stats
    const totalProperties = properties.length;
    const occupiedProperties = properties.filter(p => !p.available).length; // Available = true usually means for rent.
    // We can treat !available as 'Leased' for now, though it could be maintenance.
    // A better check would be if they have active tenants, but property data structure might simple.

    const totalRent = properties.reduce((sum, p) => sum + (p.rent || 0), 0);

    const metrics = [
        { id: 'total-props', label: 'Total Properties', value: totalProperties.toString(), trend: 'steady' as const, trendValue: '0' },
        { id: 'occupied', label: 'Occupied Units', value: occupiedProperties.toString(), trend: 'up' as const, trendValue: '100%' }, // Dummy trend
        { id: 'est-revenue', label: 'Potential Monthly Revenue', value: `$${totalRent.toLocaleString()}`, trend: 'steady' as const, trendValue: '0%' }
    ];

    return (
        <>
            <div className="landlord-hero">
                <div className="hero-content">
                    <span className="eyebrow">Landlord Portal</span>
                    <h1>Welcome, {profile?.displayName || 'Partner'}</h1>
                    <p>Manage your properties and view performance.</p>
                </div>
            </div>

            <PortfolioSummary metrics={metrics} />

            <div className="section-header">
                <h2>Your Properties</h2>
            </div>

            {loading ? (
                <div className="loading-state">Loading portfolio...</div>
            ) : (
                <div className="property-grid">
                    {properties.length === 0 ? (
                        <div className="empty-state">
                            <p>No properties found linked to this account.</p>
                        </div>
                    ) : properties.map((property) => (
                        <div key={property.id} className="property-card">
                            <div className="property-image">
                                {property.images?.[0] ? (
                                    <Image
                                        src={property.images[0]}
                                        alt={property.name}
                                        fill
                                        style={{ objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div className="image-placeholder">No Image</div>
                                )}
                                <span className={`status-tag ${property.available ? 'status--available' : 'status--occupied'}`}>
                                    {property.available ? 'Vacant' : 'Occupied'}
                                </span>
                            </div>
                            <div className="property-content">
                                <h3>{property.name}</h3>
                                <p className="address">{property.address}</p>
                                <div className="property-details">
                                    <span>{property.bedrooms} Bed</span>
                                    <span>{property.bathrooms} Bath</span>
                                    <span>{property.squareFeet} SqFt</span>
                                </div>
                                <div className="property-footer">
                                    <span className="rent">${property.rent}/mo</span>
                                    <button className="secondary-button" onClick={() => {
                                        // Future: Navigate to detail
                                        alert(`Property: ${property.name}\nWe are working on the property detail view.`);
                                    }}>View Details</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
        .landlord-hero {
            padding: 2rem 0;
        }
        .eyebrow {
            text-transform: uppercase;
            font-size: 0.85rem;
            color: var(--color-muted);
            letter-spacing: 0.05em;
            font-weight: 600;
        }
        .hero-content h1 {
            font-size: 2.5rem;
            margin: 0.5rem 0;
            color: #111827;
        }
        .hero-content p {
            color: var(--color-muted);
            font-size: 1.1rem;
        }
        
        .section-header {
            margin: 3rem 0 1.5rem;
        }
        
        .property-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .property-card {
          background: white;
          border-radius: var(--radius-lg);
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          transition: transform 0.2s;
        }

        .property-card:hover {
          transform: translateY(-4px);
        }

        .property-image {
          height: 200px;
          position: relative;
          background: #f1f5f9;
        }

        .image-placeholder {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
        }

        .status-tag {
          position: absolute;
          top: 1rem;
          right: 1rem;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          backdrop-filter: blur(4px);
        }

        .status--available { background: rgba(34, 197, 94, 0.9); color: white; }
        .status--occupied { background: rgba(59, 130, 246, 0.9); color: white; }

        .property-content {
          padding: 1.5rem;
        }

        h3 { margin: 0; font-size: 1.25rem; color: #1e293b; }
        .address { font-size: 0.875rem; color: #64748b; margin: 0.5rem 0 1rem; }

        .property-details {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: #475569;
          margin-bottom: 1.5rem;
        }

        .property-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #f1f5f9;
          padding-top: 1rem;
        }

        .rent { font-weight: 700; color: #1e293b; font-size: 1.1rem; }

        .loading-state, .empty-state {
          text-align: center;
          padding: 4rem;
          color: #64748b;
          border: 2px dashed #e2e8f0;
          border-radius: var(--radius-lg);
        }

        .secondary-button {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          cursor: pointer;
        }
      `}</style>
        </>
    );
}
