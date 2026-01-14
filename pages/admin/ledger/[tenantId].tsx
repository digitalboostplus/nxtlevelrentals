import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import SiteLayout from '@/components/Layout/SiteLayout';
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

    if (loading) return <SiteLayout><div className="loading">Loading ledger...</div></SiteLayout>;

    return (
        <SiteLayout>
            <Head>
                <title>Tenant Ledger - {tenant?.displayName || 'Loading'}</title>
            </Head>

            <div className="ledger-page">
                <header className="page-header">
                    <button onClick={() => router.back()} className="back-button">← Back to Tenants</button>
                    <h1>{tenant?.displayName}</h1>
                    <p>Resident Ledger & Financial History</p>
                </header>

                <div className="ledger-grid">
                    <section className="ledger-section main-ledger">
                        <h2>Financial Ledger</h2>
                        <LedgerTable entries={ledger} />
                    </section>

                    <aside className="ledger-sidebar">
                        <section className="ledger-section">
                            <h2>Payment Plans</h2>
                            {plans.length > 0 ? (
                                plans.map(plan => <PaymentPlanCard key={plan.id} plan={plan} />)
                            ) : (
                                <p className="empty-msg">No active payment plans.</p>
                            )}
                        </section>

                        <section className="ledger-section">
                            <h2>Lease Documents</h2>
                            {docs.length > 0 ? (
                                <ul className="doc-list">
                                    {docs.map(doc => (
                                        <li key={doc.id}>
                                            <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                                                {doc.fileName}
                                            </a>
                                            <span>{doc.documentType}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="empty-msg">No documents found.</p>
                            )}
                        </section>
                    </aside>
                </div>
            </div>

            <style jsx>{`
        .ledger-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .back-button {
          background: none;
          border: none;
          color: var(--color-primary);
          padding: 0;
          margin-bottom: 1rem;
          cursor: pointer;
          font-weight: 500;
        }

        h1 { margin: 0; font-size: 2.25rem; color: #1e293b; }
        h2 { font-size: 1.25rem; color: #1e293b; margin-bottom: 1rem; }

        .ledger-grid {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 2rem;
        }

        .ledger-section {
          margin-bottom: 2rem;
        }

        .empty-msg {
          color: #64748b;
          font-style: italic;
          background: #f8fafc;
          padding: 1rem;
          border-radius: var(--radius-md);
          text-align: center;
        }

        .doc-list {
          list-style: none;
          padding: 0;
          margin: 0;
          background: white;
          border-radius: var(--radius-md);
          border: 1px solid #e2e8f0;
        }

        .doc-list li {
          padding: 1rem;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
        }

        .doc-list li:last-child { border-bottom: none; }

        .doc-list a {
          color: var(--color-primary);
          text-decoration: none;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .doc-list span {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
        }

        .loading {
          text-align: center;
          padding: 10rem;
          font-size: 1.2rem;
          color: #64748b;
        }

        @media (max-width: 1024px) {
          .ledger-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </SiteLayout>
    );
};

TenantLedgerPage.requireAuth = true;
TenantLedgerPage.allowedRoles = ['admin', 'super-admin'];

export default TenantLedgerPage;
