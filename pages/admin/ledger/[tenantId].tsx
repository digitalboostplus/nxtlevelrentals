import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import PageHeader from '@/components/common/PageHeader';
import LoadingState from '@/components/common/LoadingState';
import Card from '@/components/common/Card';
import LedgerTable from '@/components/Admin/LedgerTable';
import PaymentPlanCard from '@/components/Admin/PaymentPlanCard';
import { paymentUtils, adminUtils, userUtils } from '@/lib/firebase-utils';
import type { LedgerEntry, PaymentPlan, LeaseDocument } from '@/lib/firebase-utils';
import type { NextPageWithAuth } from '../../_app';

const TenantLedgerPage: NextPageWithAuth = () => {
    const router = useRouter();
    const { tenantId } = router.query;
    const [tenant, setTenant] = useState<any>(null);
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [plans, setPlans] = useState<PaymentPlan[]>([]);
    const [docs, setDocs] = useState<LeaseDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenantId) return;

        const fetchData = async () => {
            try {
                const id = tenantId as string;
                const [tenantData, ledgerData, planData, docData] = await Promise.all([
                    userUtils.getUserRole(id),
                    paymentUtils.getLedgerByTenant(id),
                    paymentUtils.getPaymentPlansByTenant(id),
                    adminUtils.getLeaseDocuments(id)
                ]);

                setTenant(tenantData);
                setLedger(ledgerData);
                setPlans(planData);
                setDocs(docData);
            } catch (error) {
                console.error('Error fetching tenant ledger:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [tenantId]);

    return (
        <AdminLayout title="Tenant Ledger">
            <Head>
                <title>Tenant Ledger - {tenant?.displayName || 'Loading'}</title>
            </Head>

            <div className="page-container">
            {loading ? (
                <div className="content-section">
                    <LoadingState message="Loading tenant ledger..." />
                </div>
            ) : (
                <>
                    <PageHeader
                        title={tenant?.displayName || 'Tenant Ledger'}
                        subtitle="Financial History & Payment Records"
                        breadcrumbs={[
                            { label: 'Admin', href: '/admin' },
                            { label: 'Tenants', href: '/admin/tenants' },
                            { label: tenant?.displayName || 'Loading' },
                        ]}
                    />

                    <div className="ledger-page">
                        <div className="ledger-grid">
                            <div className="main-content">
                                <Card title="Financial Ledger">
                                    <LedgerTable entries={ledger} />
                                </Card>
                            </div>

                            <aside className="sidebar">
                                <Card title="Payment Plans">
                                    {plans.length > 0 ? (
                                        <div className="plans-list">
                                            {plans.map(plan => <PaymentPlanCard key={plan.id} plan={plan} />)}
                                        </div>
                                    ) : (
                                        <p className="empty-msg">No active payment plans.</p>
                                    )}
                                </Card>

                                <Card title="Lease Documents" className="documents-card">
                                    {docs.length > 0 ? (
                                        <ul className="doc-list">
                                            {docs.map(doc => (
                                                <li key={doc.id}>
                                                    <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                                                        📄 {doc.fileName}
                                                    </a>
                                                    <span className="doc-type">{doc.documentType}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="empty-msg">No documents found.</p>
                                    )}
                                </Card>
                            </aside>
                        </div>
                    </div>
                </>
            )}

            <style jsx>{`
        .content-section {
          padding: 2rem;
          min-height: 300px;
        }

        .ledger-page {
          padding: 0 2rem 2rem;
        }

        .ledger-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 2rem;
          align-items: start;
        }

        .main-content {
          min-width: 0;
        }

        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .sidebar :global(.documents-card) {
          margin-top: 0;
        }

        .plans-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .empty-msg {
          color: var(--color-text-secondary);
          font-style: italic;
          background: var(--color-background);
          padding: 1.5rem;
          border-radius: var(--radius-md);
          text-align: center;
          font-size: 0.938rem;
        }

        .doc-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .doc-list li {
          padding: 1rem 0;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .doc-list li:first-child {
          padding-top: 0;
        }

        .doc-list li:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .doc-list a {
          color: var(--color-primary);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.938rem;
          transition: color var(--transition-fast);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .doc-list a:hover {
          color: var(--color-primary-dark);
          text-decoration: underline;
        }

        .doc-type {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        @media (max-width: 1024px) {
          .ledger-grid {
            grid-template-columns: 1fr;
          }

          .sidebar {
            order: -1;
          }
        }

        @media (max-width: 768px) {
          .ledger-page {
            padding: 0 1rem 1rem;
          }

          .content-section {
            padding: 1rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .doc-list a {
            transition-duration: 0.01ms !important;
          }
        }

        .page-container {
          animation: pageEnter 0.3s ease-out;
        }

        @keyframes pageEnter {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .page-container {
            animation: none;
          }
        }
      `}</style>
      </div>
        </AdminLayout>
    );
};

TenantLedgerPage.requireAuth = true;
TenantLedgerPage.allowedRoles = ['admin', 'super-admin'];

export default TenantLedgerPage;
