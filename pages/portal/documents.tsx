import PortalPage from '@/components/Portal/PortalPage';
import type { NextPageWithAuth } from '../_app';

const PortalDocuments: NextPageWithAuth = () => <PortalPage view="documents" />;

PortalDocuments.requireAuth = true;
PortalDocuments.allowedRoles = ['tenant', 'admin', 'super-admin', 'landlord'];

export default PortalDocuments;
