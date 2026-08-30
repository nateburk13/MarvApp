// This is the ONE service worker for Daily Ashton. It does two jobs:
//   1. Basic offline caching of the app shell.
//   2. Showing the daily push notification via Firebase Cloud Messaging.
//
// IMPORTANT: this file must be the only service worker registered for the
// app's scope. A second service worker (e.g. a separate
// firebase-messaging-sw.js) registered at the same scope will silently
// replace or race with this one, which is what caused subscriptions to go
// stale and notifications to double-fire in the past. Keep everything here.

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

// The GitHub Actions script sends a DATA-ONLY payload (no top-level
// "notification" field) specifically so that this is the single place
// a notification gets built and shown. Do NOT add a second
// self.addEventListener('push', ...) handler below — Firebase's
// onBackgroundMessage already listens for the push event internally,
// and having both would show the notification twice.
messaging.onBackgroundMessage((payload) => {
  const title = (payload.data && payload.data.title) || 'Marvin J. Ashton';
  const body = (payload.data && payload.data.body) || '';

  self.registration.showNotification(title, {
    body,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: 'daily-ashton-quote', // reusing the same tag means a second
                                // notification replaces rather than stacks
  });
});

// Tapping the notification opens (or focuses) the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});

// --- Minimal offline caching of the app shell ---
const CACHE_NAME = 'daily-ashton-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './quotes.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});