import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/Admin/AdminLayout';
import AddPropertyModal from '@/components/Admin/AddPropertyModal';
import { propertyUtils } from '@/lib/firebase-utils';
import type { Property } from '@/lib/firebase-utils';
import { useAuth } from '@/context/AuthContext';
import type { NextPageWithAuth } from '../_app';

const ALLOW_MANUAL_PROPERTY = true;

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
    if (property.id) {
      router.push(`/admin/properties/${property.id}`);
    }
  };

  return (
    <AdminLayout title="Properties">
      <Head>
        <title>Properties - Admin Portal</title>
      </Head>

      <div className="owner-page">
        <div className="owner-page__head">
          <div>
            <p className="section-eyebrow">Admin · Properties</p>
            <h1>Properties & Units</h1>
            <p className="owner-page__sub">Portfolio overview, unit status, and GoHighLevel sync.</p>
          </div>
          <div className="owner-page__actions">
            <button type="button" className="outline-button" onClick={handleSyncFromGHL} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync from GHL'}
            </button>
            {ALLOW_MANUAL_PROPERTY && (
              <button type="button" className="primary-button" onClick={handleAddProperty}>Add property</button>
            )}
          </div>
        </div>


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
                    {property.archived ? 'Archived' : property.available ? 'Available' : property.status || 'Unavailable'}
                  </span>
                </div>
                <div className="property-content">
                  <h3>{property.name}</h3>
                  {property.source === 'ghl' && <span className="ghl-badge">Synced from GHL</span>}
                  <p className="address">{property.address}</p>
                  <div className="property-details">
                    {property.bedrooms ? <span>{property.bedrooms} bed</span> : null}
                    {property.bathrooms ? <span>{property.bathrooms} bath</span> : null}
                    {property.squareFeet ? <span>{property.squareFeet.toLocaleString()} sq ft</span> : null}
                    {!property.bedrooms && !property.bathrooms && !property.squareFeet ? <span>Details not recorded</span> : null}
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
          background: var(--color-accent-subtle);
          color: var(--color-primary);
        }


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

        .status--available { background: var(--color-primary); color: white; }
        .status--occupied { background: var(--color-accent); color: white; }

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
    </AdminLayout>
  );
};

PropertiesPage.requireAuth = true;
PropertiesPage.allowedRoles = ['admin', 'super-admin'];

export default PropertiesPage;
