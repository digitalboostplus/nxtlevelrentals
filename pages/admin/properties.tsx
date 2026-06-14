import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import SiteLayout from '@/components/Layout/SiteLayout';
import AddPropertyModal from '@/components/Admin/AddPropertyModal';
import { propertyUtils } from '@/lib/firebase-utils';
import type { Property } from '@/lib/firebase-utils';
import { useAuth } from '@/context/AuthContext';
import type { NextPageWithAuth } from '../_app';

// Properties are sourced from GoHighLevel and synced into Firestore, so the app
// is read-only for them. Flip to true (and set ALLOW_MANUAL_PROPERTY=true on the
// server) to temporarily re-enable in-app creation.
const ALLOW_MANUAL_PROPERTY = false;

const PropertiesPage: NextPageWithAuth = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchProperties = async () => {
    try {
      // Use getAllProperties for admin view (includes unavailable)
      const data = await propertyUtils.getAllProperties();
      setProperties(data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleAddProperty = () => {
    setIsAddModalOpen(true);
  };

  const handleSyncFromGHL = async () => {
    if (!user) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/sync-properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Sync failed');
      setSyncMessage(data.message);
      await fetchProperties();
    } catch (err: any) {
      setSyncMessage(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handlePropertyCreated = () => {
    setIsAddModalOpen(false);
    setLoading(true);
    fetchProperties();
  };

  const handleManageProperty = (property: Property) => {
    // Navigate to tenants page filtered by this property, or show property details
    // For now, show an alert with property info
    alert(`Managing: ${property.name}\nAddress: ${property.address}\nRent: $${property.rent}/mo\n\nProperty detail page coming soon!`);
  };

  return (
    <SiteLayout>
      <Head>
        <title>Properties - Landlord Portal</title>
      </Head>

      <div className="admin-container">
        <header className="admin-header">
          <div>
            <h1>Properties</h1>
            <p>Synced from GoHighLevel. Overview of all units and their current status.</p>
          </div>
          <div className="header-actions">
            <button className="primary-button" onClick={handleSyncFromGHL} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync from GHL'}
            </button>
            {ALLOW_MANUAL_PROPERTY && (
              <button className="secondary-button" onClick={handleAddProperty}>+ Add Property</button>
            )}
          </div>
        </header>

        {syncMessage && <div className="sync-banner">{syncMessage}</div>}

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
                  {property.source === 'ghl' && <span className="ghl-badge">Synced from GHL</span>}
                  <p className="address">{property.address}</p>
                  <div className="property-details">
                    <span>{property.bedrooms} Bed</span>
                    <span>{property.bathrooms} Bath</span>
                    <span>{property.squareFeet} SqFt</span>
                  </div>
                  <div className="property-footer">
                    <span className="rent">${property.rent}/mo</span>
                    <button className="secondary-button" onClick={() => handleManageProperty(property)}>Manage</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {ALLOW_MANUAL_PROPERTY && (
        <AddPropertyModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handlePropertyCreated}
        />
      )}

      <style jsx>{`
        .admin-container {
          padding: 2rem;
          max-width: var(--max-width);
          margin: 0 auto;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .sync-banner {
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-left: 4px solid var(--color-primary);
          border-radius: var(--radius-md);
          padding: 0.75rem 1rem;
          margin-bottom: 1.5rem;
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }

        .ghl-badge {
          display: inline-block;
          margin: 0.25rem 0;
          padding: 0.15rem 0.6rem;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          background: rgba(15, 118, 110, 0.12);
          color: var(--color-primary);
        }

        h1 { font-size: 2rem; color: var(--color-text-secondary); margin: 0; }
        p { color: var(--color-muted); margin: 0.5rem 0 0; }

        .property-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
        }

        .property-card {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
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
          background: var(--color-surface-elevated);
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
          color: var(--color-muted);
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

        .status--available { background: rgba(15, 118, 110, 0.9); color: white; }
        .status--occupied { background: rgba(3, 105, 161, 0.9); color: white; }

        .property-content {
          padding: 1.5rem;
        }

        h3 { margin: 0; font-size: 1.25rem; color: var(--color-text-secondary); }
        .address { font-size: 0.875rem; color: var(--color-muted); margin: 0.5rem 0 1rem; }

        .property-details {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: var(--color-muted);
          margin-bottom: 1.5rem;
        }

        .property-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--color-border);
          padding-top: 1rem;
        }

        .rent { font-weight: 700; color: var(--color-text-secondary); font-size: 1.1rem; }

        .loading-state {
          text-align: center;
          padding: 4rem;
          color: var(--color-muted);
        }
      `}</style>
    </SiteLayout>
  );
};

PropertiesPage.requireAuth = true;
PropertiesPage.allowedRoles = ['admin', 'super-admin'];

export default PropertiesPage;
