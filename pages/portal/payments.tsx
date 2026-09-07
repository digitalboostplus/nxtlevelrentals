import PortalPage from '@/components/Portal/PortalPage';
import type { NextPageWithAuth } from '../_app';

const PortalPayments: NextPageWithAuth = () => <PortalPage view="payments" />;

PortalPayments.requireAuth = true;
PortalPayments.allowedRoles = ['tenant', 'admin', 'super-admin', 'landlord'];

export default PortalPayments;
