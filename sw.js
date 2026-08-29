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
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyByENHdwEs3ggfkRXQe-kH1XyYP7tjabP8",
  authDomain: "marvappv2.firebaseapp.com",
  projectId: "marvappv2",
  storageBucket: "marvappv2.firebasestorage.app",
  messagingSenderId: "406149808601",
  appId: "1:406149808601:web:2dbbd9a2afdbe8e9c8d9c8"
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