// Firebase Cloud Messaging Service Worker
// This service worker handles background push notifications

// Import Firebase scripts from CDN
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
// Note: These values are public and safe to include in client-side code
const firebaseConfig = {
  apiKey: "AIzaSyCf2ZEMjwVbzkZzVAWlX8Bxf5k66Uc3VMs",
  authDomain: "rental-app-3ec4a.firebaseapp.com",
  projectId: "rental-app-3ec4a",
  storageBucket: "rental-app-3ec4a.firebasestorage.app",
  messagingSenderId: "118318302192",
  appId: "1:118318302192:web:aa9b75535dcb24c61b5335"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging object
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // Extract notification data
  const notificationTitle = payload.notification?.title || 'Next Level Rentals';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      ...payload.data,
      url: payload.fcmOptions?.link || payload.data?.link || '/notifications'
    },
    tag: payload.data?.maintenanceRequestId || 'general',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/favicon.ico'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/favicon.ico'
      }
    ]
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  // Get the URL to open from notification data
  const urlToOpen = event.notification.data?.url || '/notifications';

  // Handle action buttons
  if (event.action === 'dismiss') {
    // User clicked dismiss, just close the notification
    return;
  }

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window open with the app
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          // If found, focus it and navigate to the URL
          return client.focus().then(() => {
            if ('navigate' in client) {
              return client.navigate(urlToOpen);
            }
          });
        }
      }

      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle push events (in case onBackgroundMessage doesn't fire)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push received:', event);

  if (event.data) {
    try {
      const payload = event.data.json();

      const notificationTitle = payload.notification?.title || 'Next Level Rentals';
      const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: payload.data || {},
        tag: payload.data?.maintenanceRequestId || 'general'
      };

      event.waitUntil(
        self.registration.showNotification(notificationTitle, notificationOptions)
      );
    } catch (error) {
      console.error('[firebase-messaging-sw.js] Error parsing push data:', error);
    }
  }
});

console.log('[firebase-messaging-sw.js] Service Worker loaded and ready');
