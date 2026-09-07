import PortalPage from '@/components/Portal/PortalPage';
import type { NextPageWithAuth } from './_app';

const Portal: NextPageWithAuth = () => <PortalPage view="home" />;

Portal.requireAuth = true;
Portal.allowedRoles = ['tenant', 'admin', 'super-admin', 'landlord'];

export default Portal;
