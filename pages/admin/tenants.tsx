import Head from 'next/head';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import GhlTenantDirectory from '@/components/Admin/GhlTenantDirectory';
import { adminUtils } from '@/lib/firebase-utils';
import Link from 'next/link';
import type { NextPageWithAuth } from '../_app';

const TenantsPage: NextPageWithAuth = () => {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [represented, setRepresented] = useState<string[]>([]);
    const [loadError, setLoadError] = useState('');

    const fetchTenants = async () => {
        try {
            const data = await adminUtils.getAllTenants();
            setTenants(data);
        } catch (error) {
            console.error('Error fetching tenants:', error);
            setLoadError('Could not load app profiles.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

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
                </div>
                <GhlTenantDirectory onRepresented={setRepresented} />
                <h2>Other app profiles</h2>
                {loadError && <p role="alert">{loadError}</p>}

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
                                {tenants.filter(tenant => !tenant.ghlContactId && !represented.includes(tenant.id)).map((tenant) => (
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
                                            <span className="tag">App profile</span>
                                        </td>
                                        <td>
                                            <div className="owner-page__chips">
                                            <Link href={`/admin/tenants/${tenant.id}`} className="view-link">
                                                Profile
                                            </Link>
                                            <Link href={`/admin/ledger/${tenant.id}`} className="view-link">
                                                Ledger
                                            </Link>

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
        .owner-page {
          min-width: 0;
          grid-template-columns: minmax(0, 1fr);
        }

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
