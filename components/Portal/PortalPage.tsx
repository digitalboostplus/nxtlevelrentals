import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import SiteLayout from '@/components/Layout/SiteLayout';
import { useAuth } from '@/context/AuthContext';
import TenantPortal, { type PortalView } from '@/components/Portal/TenantPortal';

const TITLES: Record<PortalView, string> = {
  home: 'Resident Portal',
  payments: 'Payment history',
  maintenance: 'Maintenance',
  documents: 'Documents',
};

// One page shell for every tenant portal route. Landlords and staff who land here are
// sent to their own console; tenants get the requested view inside the portal chrome.
export default function PortalPage({ view }: { view: PortalView }) {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (role === 'landlord') {
        router.replace('/landlord');
      } else if (role === 'admin' || role === 'super-admin') {
        router.replace('/admin');
      }
    }
  }, [role, loading, router]);

  if (loading || role === 'landlord' || role === 'admin' || role === 'super-admin') {
    return (
      <SiteLayout footer="compact">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>{loading ? 'Loading your portal...' : 'Redirecting to your dashboard...'}</p>
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
              border: 4px solid var(--color-border);
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
    <SiteLayout footer="compact">
      <Head>
        <title>{TITLES[view]} - Next Level Rentals</title>
        <meta
          name="description"
          content="Access your Next Level Rentals resident portal to pay rent, submit maintenance, and view lease documents."
        />
      </Head>
      <TenantPortal view={view} />
    </SiteLayout>
  );
}
