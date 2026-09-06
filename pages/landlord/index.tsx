import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import LandlordLayout from '@/components/Landlord/LandlordLayout';
import LandlordDashboardHighlights from '@/components/Landlord/LandlordDashboardHighlights';
import PropertyStatusGrid from '@/components/Landlord/PropertyStatusGrid';
import MaintenanceRequests from '@/components/Portal/MaintenanceRequests';
import PaymentHistory from '@/components/Portal/PaymentHistory';
import LoadingState from '@/components/common/LoadingState';
import { useAuth } from '@/context/AuthContext';
import { useLandlordData } from '@/hooks/useLandlordData';
import type { NextPageWithAuth } from '../_app';

const LandlordPortalPage: NextPageWithAuth = () => {
    const { profile } = useAuth();
    const {
        properties,
        maintenanceRequests,
        payments,
        summary,
        loading,
        error
    } = useLandlordData();

    const [maintenanceFilter, setMaintenanceFilter] = useState<'Open' | 'In Progress' | 'Resolved' | 'All'>('All');

    return (
        <LandlordLayout title="Overview">
            <Head>
                <title>Owner Cockpit - Next Level Rentals</title>
                <meta
                    name="description"
                    content="Manage your properties, track financial performance, and oversee maintenance requests with the landlord console."
                />
            </Head>

            <div className="owner-page">
                {/* Hero Banner */}
                <div className="owner-hero">
                    <div className="owner-hero__content">
                        <span className="owner-eyebrow">Property Owner Portal</span>
                        <h1>Welcome back, {profile?.displayName || 'Partner'}</h1>
                        <p>Real-time overview of your real estate portfolio, occupancy, and cashflow.</p>
                    </div>
                    <div className="owner-hero__actions">
                        <Link href="/landlord/expenses" className="secondary-button">
                            + Log Expense
                        </Link>
                        <Link href="/landlord/financials" className="primary-button">
                            View Statements
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="p-8">
                        <LoadingState message="Loading your portfolio data..." />
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-red-500">
                        <p>{error}</p>
                    </div>
                ) : (
                    <>
                        {summary && <LandlordDashboardHighlights summary={summary} />}

                        <PropertyStatusGrid properties={properties} />

                        {maintenanceRequests.length > 0 && (
                            <section className="section">
                                <div className="section__inner">
                                    <div className="card__header mb-4">
                                        <div>
                                            <h2 className="card__title">Open Maintenance Tickets</h2>
                                            <p className="text-sm text-gray-500">Repairs and work orders underway on your units</p>
                                        </div>
                                        <Link href="/landlord/maintenance" className="ghost-button">
                                            View All Tickets
                                        </Link>
                                    </div>
                                    <MaintenanceRequests
                                        requests={maintenanceRequests}
                                        activeStatus={maintenanceFilter}
                                        onStatusChange={setMaintenanceFilter}
                                    />
                                </div>
                            </section>
                        )}

                        <section className="section">
                            <div className="section__inner">
                                <div className="card__header" style={{ marginBottom: '1.5rem' }}>
                                    <div>
                                        <h2 className="card__title">Recent Rent Payments</h2>
                                        <p className="text-sm text-gray-500">Latest funds collected across your properties</p>
                                    </div>
                                    <Link href="/landlord/financials" className="ghost-button">
                                        Full Ledger
                                    </Link>
                                </div>
                                <PaymentHistory payments={payments as any} />
                            </div>
                        </section>
                    </>
                )}
            </div>

            <style jsx>{`
                .owner-page {
                    padding-bottom: 3rem;
                }

                .owner-hero {
                    background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-elevated) 100%);
                    border-bottom: 1px solid var(--color-border);
                    padding: 2.5rem 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1.5rem;
                }

                .owner-eyebrow {
                    font-size: 0.813rem;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: var(--color-primary);
                    font-weight: 700;
                }

                .owner-hero__content h1 {
                    margin: 0.25rem 0 0.5rem;
                    font-size: 2rem;
                    font-weight: 800;
                    color: var(--color-text);
                }

                .owner-hero__content p {
                    color: var(--color-muted);
                    font-size: 1rem;
                    margin: 0;
                }

                .owner-hero__actions {
                    display: flex;
                    gap: 1rem;
                }
            `}</style>
        </LandlordLayout>
    );
};

LandlordPortalPage.requireAuth = true;
LandlordPortalPage.allowedRoles = ['landlord', 'admin', 'super-admin'];

export default LandlordPortalPage;

