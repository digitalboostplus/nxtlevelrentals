import Head from 'next/head';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import { adminUtils } from '@/lib/firebase-utils';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import type { NextPageWithAuth } from '../_app';

const TenantsPage: NextPageWithAuth = () => {
    const { user } = useAuth();
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState<string | null>(null); // 'all' or a tenant id
    const [syncMessage, setSyncMessage] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);

    const fetchTenants = async () => {
        try {
            const data = await adminUtils.getAllTenants();
            setTenants(data);
        } catch (error) {
            console.error('Error fetching tenants:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    // Import active tenants (contacts tagged "active") from GoHighLevel as new
    // tenant records. De-duplicates by email; best-effort links to a property.
    const handleImport = async () => {
        if (!user) return;
        setImporting(true);
        setSyncMessage(null);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/import-tenants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ tag: 'active' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Import failed');
            setSyncMessage(data.message || 'Import complete');
            await fetchTenants();
        } catch (err: any) {
            setSyncMessage(err.message || 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    // Pull tenant data from GoHighLevel. Pass a uid to sync one, omit for all.
    const handleSync = async (uid?: string) => {
        if (!user) return;
        setSyncing(uid || 'all');
        setSyncMessage(null);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/sync-ghl', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(uid ? { uid } : { all: true }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Sync failed');
            setSyncMessage(data.message || 'Sync complete');
            await fetchTenants();
        } catch (err: any) {
            setSyncMessage(err.message || 'Sync failed');
        } finally {
            setSyncing(null);
        }
    };

    return (
        <AdminLayout title="Tenants">
            <Head>
                <title>Tenants - Admin Portal</title>
            </Head>

            <div className="owner-page">
                <div className="owner-page__head">
                    <div>
                        <p className="section-eyebrow">Admin · Tenants</p>
                        <h1>Tenants</h1>
                        <p className="owner-page__sub">Manage your residents and view their payment history.</p>
                    </div>
                    <div className="owner-page__actions">
                        <button
                            type="button"
                            className="outline-button"
                            onClick={handleImport}
                            disabled={importing || syncing !== null}
                        >
                            {importing ? 'Importing…' : 'Import active from GHL'}
                        </button>
                        <button
                            type="button"
                            className="primary-button"
                            onClick={() => handleSync()}
                            disabled={importing || syncing !== null}
                        >
                            {syncing === 'all' ? 'Syncing…' : 'Sync all from GHL'}
                        </button>
                    </div>
                </div>
                {syncMessage && <p className="owner-note" role="status">{syncMessage}</p>}

                {loading ? (
                    <div className="loading-state">Loading tenants...</div>
                ) : (
                    <div className="table-wrapper" role="region" aria-label="Tenant list">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Unit</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.map((tenant) => (
                                    <tr key={tenant.id}>
                                        <td>
                                            <div className="tenant-info">
                                                <Link href={`/admin/tenants/${tenant.id}`} className="tenant-name font-bold hover:underline">
                                                    {tenant.displayName}
                                                </Link>
                                            </div>
                                        </td>
                                        <td>{tenant.unit || 'Not assigned'}</td>
                                        <td>{tenant.email}</td>
                                        <td>
                                            <span className="tag tag--success">Active</span>
                                        </td>
                                        <td>
                                            <div className="owner-page__chips">
                                            <Link href={`/admin/tenants/${tenant.id}`} className="view-link">
                                                Profile
                                            </Link>
                                            <Link href={`/admin/ledger/${tenant.id}`} className="view-link">
                                                Ledger
                                            </Link>
                                            <button
                                                className="sync-link"
                                                onClick={() => handleSync(tenant.id)}
                                                disabled={syncing !== null}
                                            >
                                                {syncing === tenant.id ? 'Syncing…' : 'Sync GHL'}
                                            </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style jsx>{`

        .tenant-name {
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .view-link {
          color: var(--color-primary);
          font-weight: 500;
          text-decoration: none;
        }

        .view-link:hover {
          text-decoration: underline;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .sync-message {
          color: var(--color-muted);
          font-size: 0.875rem;
        }

        .sync-button {
          background-color: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.625rem 1.25rem;
          font-weight: 600;
          cursor: pointer;
        }

        .sync-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .sync-button--secondary {
          background-color: transparent;
          color: var(--color-primary);
          border: 1px solid var(--color-primary);
        }

        .sync-link {
          margin-left: 1rem;
          background: none;
          border: none;
          color: var(--color-primary);
          font-weight: 500;
          cursor: pointer;
          padding: 0;
          font-size: inherit;
        }

        .sync-link:hover:not(:disabled) {
          text-decoration: underline;
        }

        .sync-link:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .loading-state {
          text-align: center;
          padding: 4rem;
          color: var(--color-muted);
        }
      `}</style>
        </AdminLayout>
    );
};

TenantsPage.requireAuth = true;
TenantsPage.allowedRoles = ['admin', 'super-admin'];

export default TenantsPage;
