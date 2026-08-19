// Firebase Cloud Messaging background handler.
// Runs when a push arrives while the app isn't in the foreground.

importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAdedktBmRawkD6RlL1RLRKup9laCJ8hzs",
  authDomain: "marvapp-76545.firebaseapp.com",
  projectId: "marvapp-76545",
  storageBucket: "marvapp-76545.firebasestorage.app",
  messagingSenderId: "559243595666",
  appId: "1:559243595666:web:0a909be225ce96f4b13b4b"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Marvin J. Ashton';
  const body = payload.notification?.body || '';
  self.registration.showNotification(title, {
    body,
    icon: 'icon-192.png',
    badge: 'icon-192.png'
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('./index.html');
    })
  );
});
