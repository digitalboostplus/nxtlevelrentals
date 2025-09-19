// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDk-hHzNDVrUFg72Hu5e_yBEen5ZC1GFDM",
  authDomain: "nxtlevelrentals.firebaseapp.com",
  projectId: "nxtlevelrentals",
  storageBucket: "nxtlevelrentals.firebasestorage.app",
  messagingSenderId: "872992577854",
  appId: "1:872992577854:web:9b1c5c87751586f105f46f"
};

firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'NextLevel Rentals';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received.');
  
  event.notification.close();
  
  // Handle the notification click
  event.waitUntil(
    clients.openWindow('/portal')
  );
});
