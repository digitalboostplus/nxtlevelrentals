import Head from 'next/head';
import SiteLayout from '@/components/Layout/SiteLayout';
import { useAuth } from '@/context/AuthContext';
import TenantPortal from '@/components/Portal/TenantPortal';
import LandlordPortal from '@/components/Portal/LandlordPortal';
import type { NextPageWithAuth } from './_app';

const PortalPage: NextPageWithAuth = () => {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <SiteLayout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your portal...</p>
          <style jsx>{`
                    .loading-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 50vh;
                        color: var(--color-muted);
                    }
                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid rgba(108, 92, 231, 0.1);
                        border-top-color: var(--color-primary);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 1rem;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <Head>
        <title>
          {role === 'landlord' ? 'Landlord Portal' : 'Tenant Portal'} - Next Level Rentals
        </title>
        <meta
          name="description"
          content="Access your Next Level Rentals portal."
        />
      </Head>

      {role === 'landlord' ? <LandlordPortal /> : <TenantPortal />}

    </SiteLayout>
  );
};

PortalPage.requireAuth = true;
// Allow 'landlord' in addition to tenant/admin
PortalPage.allowedRoles = ['tenant', 'admin', 'super-admin', 'landlord'];

export default PortalPage;
