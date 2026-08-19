# Daily Ashton

A tiny installable web app for iPhone that shows a daily quote from Elder Marvin J. Ashton. Tap the card for another random quote, share it, or turn on a daily reminder notification.

## Files

| File | Purpose |
|---|---|
| `index.html` | The app's layout and logic |
| `quotes.json` | The quotes themselves — edit this to add, remove, or change quotes |
| `manifest.json` | Lets iOS treat it as an installable app ("Add to Home Screen") |
| `sw.js` | Service worker — enables offline caching |
| `firebase-messaging-sw.js` | Second service worker — handles Firebase push notifications in the background |
| `icon-192.png` / `icon-512.png` | Home screen app icons |
| `scripts/send-daily-quote.js` | Node script that picks today's quote and sends it via Firebase |
| `.github/workflows/daily-quote.yml` | GitHub Actions workflow that runs the script daily |
| `package.json` | Lists the `firebase-admin` dependency the script needs |

All files must stay in the same folder — the app links to them with relative paths.

## Adding or editing quotes

Open `quotes.json`. It's a list of entries, each with a `text` and a `source`:

```json
{ "text": "Leave people better than you found them.", "source": "Be of Good Cheer, 1987" }
```

To add a quote, copy an existing line, edit the wording, and make sure there's a comma after every entry except the last one. Save the file, commit, and push — no other file needs to change.

A couple of things to know:
- **Quote of the day** is picked by the day of the year, cycling through the list — adding or removing quotes will shift which quote falls on which future date. That's expected.
- **If `quotes.json` fails to load** (e.g. a typo breaks the JSON), the app falls back to showing a single built-in quote and a small toast message, rather than a blank screen. If you see that toast, double-check `quotes.json` for a missing comma or bracket — a free tool like [jsonlint.com](https://jsonlint.com) can point out the exact error.

## Running it locally

Service workers (and therefore notifications and installability) don't work when you just double-click `index.html`. Serve it over `http://localhost` instead:

- **VS Code**: install the *Live Server* extension, right-click `index.html`, choose **Open with Live Server**.
- **Or from a terminal**: `python3 -m http.server 8000`, then visit `http://localhost:8000`.

## Deploying so it's reachable on your phone

iOS requires an `https://` URL to install a web app — `localhost` won't work from your phone. Easiest free option:

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**, set source to **Deploy from a branch**, pick your branch and the root folder, and save.
3. GitHub gives you a URL like `https://yourusername.github.io/your-repo-name/`.

## Installing on iPhone

1. Open the deployed URL in **Safari** (must be Safari, not Chrome).
2. Tap the **Share** icon → **Add to Home Screen**.
3. Open the app from the new home screen icon, then tap **Enable Reminder** to allow notifications.

## Notes & limitations

- **Photo**: the portrait is a placeholder gold monogram, not a real photo of Elder Ashton. Swap the `<svg>` inside `.portrait` in `index.html` for `<img src="ashton.jpg">` if you add an authorized photo.
- **Quotes**: stored in `quotes.json`, 25 to start. They cycle deterministically by date (same quote all day, changes daily), plus a random quote on tap. See "Adding or editing quotes" above.

## Daily push notifications (Firebase)

Notifications are sent through Firebase Cloud Messaging, triggered once a day by a GitHub Actions workflow — no server to run yourself. This works for **any number of phones** — each one just needs its token added to the list.

**One-time setup (repeat "Get your device token" for every phone you want notified):**
1. On each phone, open the app from the home screen (must be installed via Add to Home Screen first) and tap **Enable Reminder**. Allow the notification permission prompt.
2. The app shows a long device token on screen. Copy it.
3. In your GitHub repo, go to **Settings → Secrets and variables → Actions → New repository secret**, name it `FCM_TOKENS`, and paste the token as the value.
4. **For additional phones**, edit that same `FCM_TOKENS` secret and add each new token on its own line (or separated by commas) — don't create a separate secret per phone.
5. Add a second secret named `FIREBASE_SERVICE_ACCOUNT`, and paste the *entire contents* of the service account JSON file you downloaded from Firebase (Project Settings → Service Accounts → Generate new private key). This one is shared across all devices — only needed once.
6. That's it — the workflow in `.github/workflows/daily-quote.yml` runs automatically every day and sends that day's quote to every token in `FCM_TOKENS`.

**Testing it without waiting for the schedule:** go to the repo's **Actions** tab → **Send daily quote notification** → **Run workflow** to trigger it manually.

**Changing the send time:** edit the `cron` line in `.github/workflows/daily-quote.yml`. Times are in UTC — for example `0 14 * * *` is 14:00 UTC, roughly 8:00 AM Mountain Time (adjust for your timezone and daylight saving).

**If a token stops working**: FCM tokens can occasionally expire or get invalidated (e.g. a phone is reinstalled or Safari data is cleared). The workflow logs which specific token failed and why — check the Actions tab's run log. Have that phone reopen the app, tap **Enable Reminder** again, and swap in the new token for the old one in the `FCM_TOKENS` secret. A failed token for one phone won't stop the quote from sending to the others.