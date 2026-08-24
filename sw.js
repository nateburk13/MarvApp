// Single service worker: handles BOTH offline caching AND Firebase Cloud
// Messaging push notifications. These used to be two separate files
// (sw.js + firebase-messaging-sw.js) registered at the same scope, which
// caused them to silently replace one another on every app reopen and
// orphan the push subscription (showing up as "NotRegistered" on send).
// Keeping everything in one file avoids that scope conflict entirely.

const CACHE = 'daily-ashton-v3';
const ASSETS = ['./index.html', './manifest.json', './quotes.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(list => {
      if (list.length > 0) return list[0].focus();
      return self.clients.openWindow('./index.html');
    })
  );
});

// ---- Firebase Cloud Messaging (background push handling) ----
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