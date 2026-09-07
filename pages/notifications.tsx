import Head from 'next/head';
import SiteLayout from '@/components/Layout/SiteLayout';
import AdminLayout from '@/components/Admin/AdminLayout';
import NotificationCenter from '@/components/Notifications/NotificationCenter';
import { useAuth } from '@/context/AuthContext';
import type { NextPageWithAuth } from './_app';

const NotificationsPage: NextPageWithAuth = () => {
  const { role } = useAuth();
  const Shell = role === 'admin' || role === 'super-admin' ? AdminLayout : SiteLayout;
  return (
    <Shell title="Notifications">
      <Head>
        <title>Notifications - Next Level Rentals</title>
        <meta
          name="description"
          content="View all your maintenance request notifications and updates."
        />
      </Head>
      <NotificationCenter />
    </Shell>
  );
};

NotificationsPage.requireAuth = true;
NotificationsPage.allowedRoles = ['tenant', 'admin', 'super-admin'];

export default NotificationsPage;
