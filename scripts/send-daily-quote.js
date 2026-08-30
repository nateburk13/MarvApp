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