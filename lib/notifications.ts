import { adminAuth, adminDb } from './firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue } from 'firebase-admin/firestore';
import { isGHLConfigured, getGHLContactByEmail, sendGHLEmail } from './ghl';

// Types
import {
  NotificationType,
  Notification,
  NotificationPreferences
} from '@/types/notifications';

// Default notification preferences for new users
export { DEFAULT_PREFERENCES } from './notificationPreferences';
import { DEFAULT_PREFERENCES } from './notificationPreferences';

/**
 * Get user's notification preferences
 * Creates default preferences if none exist
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const db = adminDb;
  const prefsRef = db.doc(`notificationPreferences/${userId}`);
  const prefsSnap = await prefsRef.get();

  if (prefsSnap.exists) {
    const saved = prefsSnap.data()!;
    return { ...saved, userId, email: { ...DEFAULT_PREFERENCES.email, ...saved.email }, push: { ...DEFAULT_PREFERENCES.push, ...saved.push }, inApp: { ...DEFAULT_PREFERENCES.inApp, ...saved.inApp } } as NotificationPreferences;
  }

  return { userId, ...DEFAULT_PREFERENCES } as NotificationPreferences;
}

/**
 * Check if a specific notification should be sent based on user preferences
 */
export function shouldSendNotification(
  preferences: NotificationPreferences,
  channel: 'email' | 'push' | 'inApp',
  eventType: keyof NotificationPreferences['email']
): boolean {
  const channelPrefs = preferences[channel];

  if (!channelPrefs.enabled) return false;

  if (typeof (channelPrefs as any)[eventType] === 'boolean') {
    return (channelPrefs as any)[eventType] as boolean;
  }

  return true;
}

/**
 * Send push notification via Firebase Cloud Messaging
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {

    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) return false;
    const db = adminDb;

    // Get user's FCM token
    const tokenDoc = await db.doc(`fcmTokens/${userId}`).get();
    if (!tokenDoc.exists) {
      console.log(`No FCM token found for user ${userId}`);
      return false;
    }

    const fcmToken = tokenDoc.data()!.token;

    // Send notification via Firebase Admin
    const message = {
      token: fcmToken,
      notification: {
        title,
        body
      },
      data: data || {},
      webpush: {
        fcmOptions: {
          link: data?.link || '/notifications'
        }
      }
    };

    await getMessaging(adminAuth.app).send(message);
    console.log(`Push notification sent to user ${userId}`);
    return true;
  } catch (error: any) {
    console.error(`Failed to send push notification to user ${userId}:`, error);

    // If token is invalid, delete it from database
    if (error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered') {
      try {
        const db = adminDb;
        await db.doc(`fcmTokens/${userId}`).set({ token: '', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      } catch (deleteError) {
        console.error('Failed to clear invalid FCM token:', deleteError);
      }
    }

    return false;
  }
}

/**
 * Send an email notification via the GoHighLevel Conversations API.
 * Looks up the recipient's GHL contact by email, then sends through GHL.
 */
export async function sendEmailNotification(
  toEmail: string,
  subject: string,
  htmlContent: string,
  _textContent?: string
): Promise<boolean> {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) return false;
  if (!isGHLConfigured()) {
    console.warn('GHL not configured, skipping email notification');
    return false;
  }

  try {
    const contact = await getGHLContactByEmail(toEmail);
    if (!contact) {
      console.warn(`No GHL contact found for ${toEmail}, skipping email`);
      return false;
    }

    await sendGHLEmail(contact.id, subject, htmlContent);
    console.log(`Email sent to ${toEmail} via GHL`);
    return true;
  } catch (error: any) {
    console.error(`Failed to send email to ${toEmail} via GHL:`, error);
    return false;
  }
}

/**
 * Create an in-app notification in Firestore
 */
export async function createInAppNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  maintenanceRequestId: string,
  metadata?: Notification['metadata']
): Promise<string | null> {
  try {
    const db = adminDb;

    const notification: Omit<Notification, 'id'> = {
      userId,
      type,
      title,
      message,
      maintenanceRequestId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      ...(metadata ? { metadata } : {})
    };

    const docRef = await db.collection('notifications').add(notification);
    console.log(`In-app notification created for user ${userId}`);
    return docRef.id;
  } catch (error) {
    console.error(`Failed to create in-app notification for user ${userId}:`, error);
    return null;
  }
}

/**
 * Send notification across all enabled channels based on user preferences
 */
export async function sendMultiChannelNotification(
  userId: string,
  userEmail: string,
  notificationData: {
    type: NotificationType;
    title: string;
    message: string;
    maintenanceRequestId: string;
    emailSubject: string;
    emailHtml: string;
    emailText?: string;
    pushData?: Record<string, string>;
    metadata?: Notification['metadata'];
  },
  eventType: keyof NotificationPreferences['email']
): Promise<{
  push: boolean;
  email: boolean;
  inApp: boolean;
}> {
  const results = {
    push: false,
    email: false,
    inApp: false
  };

  try {
    // Get user preferences
    const preferences = await getNotificationPreferences(userId);

    // Send push notification
    if (shouldSendNotification(preferences, 'push', eventType)) {
      results.push = await sendPushNotification(
        userId,
        notificationData.title,
        notificationData.message,
        {
          ...notificationData.pushData,
          type: notificationData.type,
          maintenanceRequestId: notificationData.maintenanceRequestId,
          link: `/portal#maintenance-${notificationData.maintenanceRequestId}`
        }
      );
    }

    // Send email notification
    if (shouldSendNotification(preferences, 'email', eventType)) {
      results.email = await sendEmailNotification(
        userEmail,
        notificationData.emailSubject,
        notificationData.emailHtml,
        notificationData.emailText
      );
    }

    // Create in-app notification
    if (shouldSendNotification(preferences, 'inApp', eventType)) {
      const notificationId = await createInAppNotification(
        userId,
        notificationData.type,
        notificationData.title,
        notificationData.message,
        notificationData.maintenanceRequestId,
        notificationData.metadata
      );
      results.inApp = notificationId !== null;
    }
  } catch (error) {
    console.error(`Failed to send multi-channel notification to user ${userId}:`, error);
  }

  return results;
}

/**
 * Get all admins who should receive notifications
 */
export async function getAdminUsers(): Promise<Array<{ id: string; email: string; displayName?: string }>> {
  try {
    const db = adminDb;
    const snapshot = await db.collection('users').where('role', 'in', ['admin', 'super-admin']).get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      email: doc.data().email,
      displayName: doc.data().displayName
    }));
  } catch (error) {
    console.error('Failed to fetch admin users:', error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const db = adminDb;
    const notificationRef = db.doc(`notifications/${notificationId}`);
    await notificationRef.set({ read: true }, { merge: true });
    return true;
  } catch (error) {
    console.error(`Failed to mark notification ${notificationId} as read:`, error);
    return false;
  }
}

/**
 * Mark multiple notifications as read
 */
export async function markNotificationsAsRead(notificationIds: string[]): Promise<number> {
  let successCount = 0;

  for (const id of notificationIds) {
    const success = await markNotificationAsRead(id);
    if (success) successCount++;
  }

  return successCount;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const db = adminDb;
    const snapshot = await db.collection('notifications').where('userId', '==', userId).where('read', '==', false).get();
    return snapshot.size;
  } catch (error) {
    console.error(`Failed to get unread count for user ${userId}:`, error);
    return 0;
  }
}
