import Head from 'next/head';
import { useEffect, useState } from 'react';
import SiteLayout from '@/components/Layout/SiteLayout';
import { adminUtils } from '@/lib/firebase-utils';
import Link from 'next/link';
import type { NextPageWithAuth } from '../_app';

const TenantsPage: NextPageWithAuth = () => {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
        fetchTenants();
    }, []);

    return (
        <SiteLayout>
            <Head>
                <title>Tenants - Landlord Portal</title>
            </Head>

            <div className="admin-container">
                <header className="admin-header">
                    <div>
                        <h1>Tenants</h1>
                        <p>Manage your residents and view their payment history.</p>
                    </div>
                </header>

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
                                                <span className="tenant-name">{tenant.displayName}</span>
                                            </div>
                                        </td>
                                        <td>{tenant.unit || 'Not assigned'}</td>
                                        <td>{tenant.email}</td>
                                        <td>
                                            <span className="tag tag--success">Active</span>
                                        </td>
                                        <td>
                                            <Link href={`/admin/ledger/${tenant.id}`} className="view-link">
                                                View Ledger
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

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

        h1 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-text-secondary);
          margin: 0;
        }

        p {
          color: var(--color-muted);
          margin: 0.5rem 0 0;
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

        .loading-state {
          text-align: center;
          padding: 4rem;
          color: var(--color-muted);
        }
      `}</style>
        </SiteLayout>
    );
};

TenantsPage.requireAuth = true;
TenantsPage.allowedRoles = ['admin', 'super-admin'];

export default TenantsPage;
