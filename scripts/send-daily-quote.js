// Sends today's quote as a push notification via Firebase Cloud Messaging,
// to every device that's currently toggled "on" in Firestore.
//
// Tokens are no longer copy/pasted into a GitHub secret — the app itself
// writes each device's token straight into the "subscribers" Firestore
// collection when someone flips the in-app toggle. This script just reads
// whichever subscribers currently have enabled == true.

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function dayIndex(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / 86400000);
}

function todaysQuote(quotes) {
  const idx = dayIndex(new Date()) % quotes.length;
  return quotes[idx];
}

// GitHub Actions cron is best-effort and can start late, so the workflow
// starts ~40 min early and we wait here until the exact send time.
// Send time: 15:00 UTC = 8:00 AM Arizona (no DST). If the run starts after
// this time (or more than 90 min before it), we send immediately.
const SEND_HOUR_UTC = 15;
const SEND_MINUTE_UTC = 0;

async function waitUntilSendTime() {
  const now = new Date();
  const target = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    SEND_HOUR_UTC, SEND_MINUTE_UTC, 0
  ));
  const ms = target - now;
  if (ms > 0 && ms < 90 * 60 * 1000) {
    console.log(`Started early; waiting ${Math.round(ms / 1000)}s until ${target.toISOString()}`);
    await new Promise((resolve) => setTimeout(resolve, ms));
  } else {
    console.log('Past send time (or manual run); sending immediately.');
  }
}

async function getEnabledTokens() {
  const snapshot = await db.collection('subscribers').where('enabled', '==', true).get();
  const tokens = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.token) tokens.push(data.token);
  });
  return tokens;
}

async function main() {
  const quotesPath = path.join(__dirname, '..', 'quotes.json');
  const quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
  if (!Array.isArray(quotes) || quotes.length === 0) {
    throw new Error('quotes.json is empty or invalid');
  }
  const quote = todaysQuote(quotes);

  // Wait first, then read tokens, so anyone who toggled on/off while we
  // were waiting is reflected.
  await waitUntilSendTime();

  const tokens = await getEnabledTokens();
  if (tokens.length === 0) {
    console.log('No devices are currently toggled on for reminders. Nothing to send.');
    return;
  }

  console.log(`Sending to ${tokens.length} device(s). Quote: "${quote.text}"`);

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    // Data-only payload (no top-level "notification" field). Sending a
    // "notification" payload causes some browsers to auto-display it
    // AND have the service worker's onBackgroundMessage handler display
    // it again, resulting in duplicate notifications. Data-only means
    // sw.js is fully responsible for building and showing the
    // notification exactly once.
    data: {
      title: 'Marvin J. Ashton',
      body: quote.text
    },
    webpush: {
      // High urgency avoids iOS/FCM batching delays; TTL of 1 hour means a
      // push that can't be delivered (phone off) expires instead of
      // arriving stale in the afternoon.
      headers: { Urgency: 'high', TTL: '3600' },
      fcmOptions: {
        link: '/'
      }
    }
  });

  console.log(`Success: ${response.successCount}, Failure: ${response.failureCount}`);

  response.responses.forEach((result, i) => {
    if (!result.success) {
      console.warn(`Token #${i + 1} failed: ${result.error?.message || 'unknown error'}`);
      console.warn('If this says the token is invalid/unregistered, that device likely re-installed or cleared Safari data and needs to toggle the reminder off and back on.');
    }
  });
}

main().catch((err) => {
  console.error('Failed to send notifications:', err);
  process.exit(1);
});