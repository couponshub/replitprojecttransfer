// public/firebase-messaging-sw.js
// Firebase Cloud Messaging Service Worker for background notifications

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAQz24IjokglVy4vd8zJX1df7xSnKnx6k0",
  authDomain: "couponshub-a613d.firebaseapp.com",
  projectId: "couponshub-a613d",
  storageBucket: "couponshub-a613d.firebasestorage.app",
  messagingSenderId: "1093165632446",
  appId: "1:1093165632446:web:49f7f2aa8261f8a48ec7ef"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message', payload);
  const title = payload.notification?.title || payload.data?.title || 'CouponsHub X';
  const options = {
    body: payload.notification?.body || payload.data?.message || 'You have a new update!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data,
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.order_id || event.notification.data?.orderId
    ? '/my-orders'
    : '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
