import {
  sendMultiChannelNotification,
  getAdminUsers
} from './notifications';
import type { NotificationType } from '@/types/notifications';
import {
  requestConfirmationEmail,
  statusChangeEmail,
  notesAddedEmail,
  technicianScheduledEmail,
  newRequestAdminEmail
} from './email-templates';
import type { MaintenanceRequest, MaintenanceStatus } from '@/types/maintenance';
import { getFirestoreClient } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

const PORTAL_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nxtlevelrentals.com';

/**
 * Get user details from Firestore
 */
async function getUserDetails(userId: string): Promise<{ email: string; displayName: string } | null> {
  try {
    const db = getFirestoreClient();
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      console.error(`User ${userId} not found`);
      return null;
    }

    const userData = userDoc.data();
    return {
      email: userData.email || '',
      displayName: userData.displayName || 'Tenant'
    };
  } catch (error) {
    console.error(`Failed to fetch user details for ${userId}:`, error);
    return null;
  }
}

/**
 * Get property details from Firestore
 */
async function getPropertyDetails(propertyId: string): Promise<{ name: string } | null> {
  try {
    const db = getFirestoreClient();
    const propertyDoc = await getDoc(doc(db, 'properties', propertyId));

    if (!propertyDoc.exists()) {
      return null;
    }

    return {
      name: propertyDoc.data().name || 'Unknown Property'
    };
  } catch (error) {
    console.error(`Failed to fetch property details for ${propertyId}:`, error);
    return null;
  }
}

/**
 * Triggered when a new maintenance request is created
 * Sends confirmation to tenant and alerts to all admins
 */
export async function onMaintenanceCreated(
  request: MaintenanceRequest,
  tenantId: string
): Promise<void> {
  try {
    console.log(`Triggering notifications for new maintenance request: ${request.id}`);

    // Get tenant details
    const tenant = await getUserDetails(tenantId);
    if (!tenant) {
      console.error('Cannot send notification: tenant details not found');
      return;
    }

    const portalUrl = `${PORTAL_BASE_URL}/portal#maintenance-${request.id}`;

    // Send confirmation to tenant
    const confirmationEmailData = requestConfirmationEmail({
      tenantName: tenant.displayName,
      requestId: request.id,
      title: request.title,
      description: request.description,
      priority: request.priority,
      category: request.category,
      portalUrl
    });

    await sendMultiChannelNotification(
      tenantId,
      tenant.email,
      {
        type: 'maintenance_created',
        title: 'Maintenance Request Received',
        message: `Your request "${request.title}" has been received and will be addressed soon.`,
        maintenanceRequestId: request.id,
        emailSubject: 'Maintenance Request Received',
        emailHtml: confirmationEmailData.html,
        emailText: confirmationEmailData.text,
        metadata: {
          scheduledDate: request.scheduledDate ? new Date(request.scheduledDate).toISOString() : undefined
        }
      },
      'requestConfirmation'
    );

    // Alert all admins about the new request
    const admins = await getAdminUsers();
    const property = await getPropertyDetails(request.propertyId);
    const adminPortalUrl = `${PORTAL_BASE_URL}/admin/maintenance`;

    for (const admin of admins) {
      const adminEmailData = newRequestAdminEmail({
        tenantName: tenant.displayName,
        tenantEmail: tenant.email,
        requestId: request.id,
        title: request.title,
        description: request.description,
        priority: request.priority,
        category: request.category,
        propertyName: property?.name,
        unit: request.unitId,
        adminPortalUrl
      });

      await sendMultiChannelNotification(
        admin.id,
        admin.email,
        {
          type: 'maintenance_created',
          title: 'New Maintenance Request',
          message: `${tenant.displayName} submitted a ${request.priority} priority request: ${request.title}`,
          maintenanceRequestId: request.id,
          emailSubject: `New ${request.priority} Priority Request: ${request.title}`,
          emailHtml: adminEmailData.html,
          emailText: adminEmailData.text,
          pushData: {
            priority: request.priority
          },
          metadata: {
            scheduledDate: request.scheduledDate ? new Date(request.scheduledDate).toISOString() : undefined
          }
        },
        'requestConfirmation'
      );
    }

    console.log(`Successfully sent notifications for maintenance request ${request.id}`);
  } catch (error) {
    console.error(`Failed to trigger notifications for maintenance created:`, error);
  }
}

/**
 * Triggered when maintenance request status changes
 * Sends notification to tenant
 */
export async function onStatusChanged(
  request: MaintenanceRequest,
  oldStatus: MaintenanceStatus,
  newStatus: MaintenanceStatus,
  adminName?: string
): Promise<void> {
  try {
    console.log(`Triggering status change notification for request ${request.id}: ${oldStatus} -> ${newStatus}`);

    // Get tenant details
    const tenant = await getUserDetails(request.tenantId);
    if (!tenant) {
      console.error('Cannot send notification: tenant details not found');
      return;
    }

    const portalUrl = `${PORTAL_BASE_URL}/portal#maintenance-${request.id}`;

    // Prepare email
    const emailData = statusChangeEmail({
      tenantName: tenant.displayName,
      requestId: request.id,
      title: request.title,
      oldStatus,
      newStatus,
      adminName,
      portalUrl
    });

    // Send notification
    await sendMultiChannelNotification(
      request.tenantId,
      tenant.email,
      {
        type: 'status_change',
        title: 'Request Status Updated',
        message: `Your request "${request.title}" status changed to ${newStatus.replace('_', ' ')}`,
        maintenanceRequestId: request.id,
        emailSubject: `Request Status Updated: ${request.title}`,
        emailHtml: emailData.html,
        emailText: emailData.text,
        metadata: {
          oldStatus,
          newStatus,
          adminName
        }
      },
      'statusChanges'
    );

    console.log(`Successfully sent status change notification for request ${request.id}`);
  } catch (error) {
    console.error(`Failed to trigger status change notification:`, error);
  }
}

/**
 * Triggered when admin adds notes to a maintenance request
 * Sends notification to tenant
 */
export async function onNotesAdded(
  request: MaintenanceRequest,
  adminName: string,
  notes: string
): Promise<void> {
  try {
    console.log(`Triggering notes added notification for request ${request.id}`);

    // Get tenant details
    const tenant = await getUserDetails(request.tenantId);
    if (!tenant) {
      console.error('Cannot send notification: tenant details not found');
      return;
    }

    const portalUrl = `${PORTAL_BASE_URL}/portal#maintenance-${request.id}`;

    // Prepare email
    const emailData = notesAddedEmail({
      tenantName: tenant.displayName,
      requestId: request.id,
      title: request.title,
      adminName,
      notes,
      portalUrl
    });

    // Send notification
    await sendMultiChannelNotification(
      request.tenantId,
      tenant.email,
      {
        type: 'notes_added',
        title: 'New Update on Your Request',
        message: `${adminName} added an update to your request "${request.title}"`,
        maintenanceRequestId: request.id,
        emailSubject: `Update on Request: ${request.title}`,
        emailHtml: emailData.html,
        emailText: emailData.text,
        metadata: {
          adminName
        }
      },
      'notesAdded'
    );

    console.log(`Successfully sent notes added notification for request ${request.id}`);
  } catch (error) {
    console.error(`Failed to trigger notes added notification:`, error);
  }
}

/**
 * Triggered when a technician is scheduled for a maintenance request
 * Sends notification to tenant
 */
export async function onTechnicianScheduled(
  request: MaintenanceRequest,
  scheduledDate: string,
  scheduledTime?: string,
  technicianName?: string
): Promise<void> {
  try {
    console.log(`Triggering technician scheduled notification for request ${request.id}`);

    // Get tenant details
    const tenant = await getUserDetails(request.tenantId);
    if (!tenant) {
      console.error('Cannot send notification: tenant details not found');
      return;
    }

    const portalUrl = `${PORTAL_BASE_URL}/portal#maintenance-${request.id}`;

    // Prepare email
    const emailData = technicianScheduledEmail({
      tenantName: tenant.displayName,
      requestId: request.id,
      title: request.title,
      scheduledDate,
      scheduledTime,
      technicianName,
      portalUrl
    });

    // Send notification
    await sendMultiChannelNotification(
      request.tenantId,
      tenant.email,
      {
        type: 'scheduled',
        title: 'Technician Scheduled',
        message: `Technician scheduled for ${scheduledDate}${scheduledTime ? ` at ${scheduledTime}` : ''} - ${request.title}`,
        maintenanceRequestId: request.id,
        emailSubject: `Technician Scheduled: ${request.title}`,
        emailHtml: emailData.html,
        emailText: emailData.text,
        metadata: {
          scheduledDate,
          adminName: technicianName
        }
      },
      'technicianScheduled'
    );

    console.log(`Successfully sent technician scheduled notification for request ${request.id}`);
  } catch (error) {
    console.error(`Failed to trigger technician scheduled notification:`, error);
  }
}
