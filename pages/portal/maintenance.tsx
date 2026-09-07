import PortalPage from '@/components/Portal/PortalPage';
import type { NextPageWithAuth } from '../_app';

const PortalMaintenance: NextPageWithAuth = () => <PortalPage view="maintenance" />;

PortalMaintenance.requireAuth = true;
PortalMaintenance.allowedRoles = ['tenant', 'admin', 'super-admin', 'landlord'];

export default PortalMaintenance;
