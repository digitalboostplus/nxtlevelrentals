import Head from 'next/head';
import SiteLayout from '@/components/Layout/SiteLayout';
import NotificationCenter from '@/components/Notifications/NotificationCenter';
import type { NextPageWithAuth } from './_app';

const NotificationsPage: NextPageWithAuth = () => {
  return (
    <SiteLayout>
      <Head>
        <title>Notifications - Next Level Rentals</title>
        <meta
          name="description"
          content="View all your maintenance request notifications and updates."
        />
      </Head>
      <NotificationCenter />
    </SiteLayout>
  );
};

NotificationsPage.requireAuth = true;
NotificationsPage.allowedRoles = ['tenant', 'admin', 'super-admin'];

export default NotificationsPage;
