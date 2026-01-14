import { firebaseAdmin } from './firebase-admin';
import { getFirestoreClient } from './firebase';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Types
import {
  NotificationType,
  Notification,
  NotificationPreferences
} from '@/types/notifications';

// Default notification preferences for new users
const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'userId' | 'createdAt' | 'updatedAt'> = {
  email: {
    enabled: true,
    statusChanges: true,
    notesAdded: true,
    requestConfirmation: true,
    technicianScheduled: true
  },
  push: {
    enabled: true,
    statusChanges: true,
    notesAdded: true,
    requestConfirmation: true,
    technicianScheduled: true
  },
  inApp: {
    enabled: true
  }
};

/**
 * Get user's notification preferences
 * Creates default preferences if none exist
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const db = getFirestoreClient();
  const prefsRef = doc(db, 'notificationPreferences', userId);
  const prefsSnap = await getDoc(prefsRef);

  if (prefsSnap.exists()) {
    return prefsSnap.data() as NotificationPreferences;
  }

  // Create default preferences
  const defaultPrefs: NotificationPreferences = {
    userId,
    ...DEFAULT_PREFERENCES,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(prefsRef, defaultPrefs);
  return defaultPrefs;
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
    const admin = firebaseAdmin;
    const db = getFirestoreClient();

    // Get user's FCM token
    const tokenDoc = await getDoc(doc(db, 'fcmTokens', userId));
    if (!tokenDoc.exists()) {
      console.log(`No FCM token found for user ${userId}`);
      return false;
    }

    const fcmToken = tokenDoc.data().token;

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

    await admin.messaging().send(message);
    console.log(`Push notification sent to user ${userId}`);
    return true;
  } catch (error: any) {
    console.error(`Failed to send push notification to user ${userId}:`, error);

    // If token is invalid, delete it from database
    if (error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered') {
      try {
        const db = getFirestoreClient();
        await setDoc(doc(db, 'fcmTokens', userId), { token: '', updatedAt: serverTimestamp() }, { merge: true });
      } catch (deleteError) {
        console.error('Failed to clear invalid FCM token:', deleteError);
      }
    }

    return false;
  }
}

/**
 * Send email notification via SendGrid
 */
export async function sendEmailNotification(
  toEmail: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured, skipping email notification');
    return false;
  }

  try {
    const msg = {
      to: toEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@nxtlevelrentals.com',
      subject,
      text: textContent || subject,
      html: htmlContent
    };

    await sgMail.send(msg);
    console.log(`Email sent to ${toEmail}`);
    return true;
  } catch (error: any) {
    console.error(`Failed to send email to ${toEmail}:`, error);

    if (error.response) {
      console.error('SendGrid error:', error.response.body);
    }

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
    const db = getFirestoreClient();

    const notification: Omit<Notification, 'id'> = {
      userId,
      type,
      title,
      message,
      maintenanceRequestId,
      read: false,
      createdAt: serverTimestamp(),
      metadata
    };

    const docRef = await addDoc(collection(db, 'notifications'), notification);
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
    const db = getFirestoreClient();
    const adminsQuery = query(
      collection(db, 'users'),
      where('role', 'in', ['admin', 'super-admin'])
    );

    const snapshot = await getDocs(adminsQuery);
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
    const db = getFirestoreClient();
    const notificationRef = doc(db, 'notifications', notificationId);
    await setDoc(notificationRef, { read: true }, { merge: true });
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
    const db = getFirestoreClient();
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error(`Failed to get unread count for user ${userId}:`, error);
    return 0;
  }
}
