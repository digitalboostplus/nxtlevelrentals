import Head from 'next/head';
import SiteLayout from '@/components/Layout/SiteLayout';
import PortalHero from '@/components/Portal/PortalHero';
import LandlordDashboardHighlights from '@/components/Landlord/LandlordDashboardHighlights';
import PropertyStatusGrid from '@/components/Landlord/PropertyStatusGrid';
import MaintenanceRequests from '@/components/Portal/MaintenanceRequests';
import PaymentHistory from '@/components/Portal/PaymentHistory';
import { useAuth } from '@/context/AuthContext';
import { useLandlordData } from '@/hooks/useLandlordData';
import type { NextPageWithAuth } from '../_app';
import { useState } from 'react';

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

    if (loading) {
        return (
            <SiteLayout>
                <div className="section section--full-height">
                    <div className="section__inner text-center">
                        <p className="loading-text">Loading Landlord Portal...</p>
                    </div>
                </div>
            </SiteLayout>
        );
    }

    if (error) {
        return (
            <SiteLayout>
                <div className="section section--full-height">
                    <div className="section__inner text-center">
                        <p className="error-text">{error}</p>
                    </div>
                </div>
            </SiteLayout>
        );
    }

    return (
        <SiteLayout>
            <Head>
                <title>Landlord Portal - Next Level Rentals</title>
                <meta
                    name="description"
                    content="Manage your properties, track financial performance, and oversee maintenance requests with the landlord console."
                />
            </Head>

            <PortalHero
                residentName={profile?.displayName || 'Landlord'}
                propertyName="Property Owner Dashboard"
                unit={`Portfolio: ${properties.length} units`}
                nextDueDate="" // Empty string as it's not applicable for landlords
            />

            {summary && <LandlordDashboardHighlights summary={summary} />}

            <PropertyStatusGrid properties={properties} />

            {maintenanceRequests.length > 0 && (
                <MaintenanceRequests
                    requests={maintenanceRequests}
                    activeStatus={maintenanceFilter}
                    onStatusChange={setMaintenanceFilter}
                />
            )}

            <section className="section">
                <div className="section__inner">
                    <div className="card__header" style={{ marginBottom: '2rem' }}>
                        <h2 className="card__title">Recent Rent Payments</h2>
                    </div>
                    {/* PaymentHistory expects Payment[] from types/schema which we aligned */}
                    <PaymentHistory payments={payments as any} />
                </div>
            </section>

        </SiteLayout>
    );
};

LandlordPortalPage.requireAuth = true;
LandlordPortalPage.allowedRoles = ['landlord', 'admin', 'super-admin'];

export default LandlordPortalPage;
