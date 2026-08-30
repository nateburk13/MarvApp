// Sends today's quote as a push notification via Firebase Cloud Messaging,
// to every device token listed in the FCM_TOKENS secret.

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const rawTokens = process.env.FCM_TOKENS || '';

// Accept tokens separated by commas, newlines, or a mix of both.
const tokens = rawTokens
  .split(/[\n,]/)
  .map(t => t.trim())
  .filter(Boolean);

if (tokens.length === 0) {
  console.error('FCM_TOKENS secret is empty. Nothing to send to.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

function dayIndex(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / 86400000);
}

function todaysQuote(quotes) {
  const idx = dayIndex(new Date()) % quotes.length;
  return quotes[idx];
}

async function main() {
  const quotesPath = path.join(__dirname, '..', 'quotes.json');
  const quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
  if (!Array.isArray(quotes) || quotes.length === 0) {
    throw new Error('quotes.json is empty or invalid');
  }
  const quote = todaysQuote(quotes);

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
      console.warn('If this says the token is invalid/unregistered, that device likely needs to re-enable notifications and you should replace its entry in FCM_TOKENS.');
    }
  });
}

main().catch((err) => {
  console.error('Failed to send notifications:', err);
  process.exit(1);
});