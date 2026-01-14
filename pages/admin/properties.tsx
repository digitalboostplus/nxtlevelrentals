import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import SiteLayout from '@/components/Layout/SiteLayout';
import { propertyUtils } from '@/lib/firebase-utils';
import type { Property } from '@/lib/firebase-utils';
import type { NextPageWithAuth } from '../_app';

const PropertiesPage: NextPageWithAuth = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const data = await propertyUtils.getProperties();
        setProperties(data);
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  return (
    <SiteLayout>
      <Head>
        <title>Properties - Landlord Portal</title>
      </Head>

      <div className="admin-container">
        <header className="admin-header">
          <div>
            <h1>Properties</h1>
            <p>Overview of all physical units and their current status.</p>
          </div>
          <button className="primary-button">+ Add Property</button>
        </header>

        {loading ? (
          <div className="loading-state">Loading properties...</div>
        ) : (
          <div className="property-grid">
            {properties.map((property) => (
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
                    {property.available ? 'Available' : 'Occupied'}
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
                    <button className="secondary-button">Manage</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        h1 { font-size: 2rem; color: #1e293b; margin: 0; }
        p { color: #64748b; margin: 0.5rem 0 0; }

        .property-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
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

        .property-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
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

        .loading-state {
          text-align: center;
          padding: 4rem;
          color: #64748b;
        }

        .primary-button {
          background: var(--color-primary);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
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
    </SiteLayout>
  );
};

PropertiesPage.requireAuth = true;
PropertiesPage.allowedRoles = ['admin', 'super-admin'];

export default PropertiesPage;
