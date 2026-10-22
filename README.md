# Daily Ashton

A tiny installable web app for iPhone that shows a daily quote from Elder Marvin J. Ashton. Tap the card for another random quote, share it, or turn on a daily reminder notification.

## Files

| File | Purpose |
|---|---|
| `index.html` | The app's layout and logic |
| `quotes.json` | The quotes themselves — edit this to add, remove, or change quotes |
| `manifest.json` | Lets iOS treat it as an installable app ("Add to Home Screen") |
| `sw.js` | The app's single service worker — offline caching **and** showing the daily push notification |
| `icon-192.png` / `icon-512.png` | Home screen app icons |
| `scripts/send-daily-quote.js` | Node script that picks today's quote, waits for the exact send time, and sends it via Firebase to every subscribed device |
| `.github/workflows/daily-quote.yml` | GitHub Actions workflow that starts the script shortly before the send time each day |
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
3. Open the app from the new home screen icon and switch on the **Daily Reminder** toggle. Allow the notification permission prompt.

## Notes & limitations

- **Photo**: the portrait is a placeholder gold monogram, not a real photo of Elder Ashton. Swap the `<svg>` inside `.portrait` in `index.html` for `<img src="ashton.jpg">` if you add an authorized photo.
- **Quotes**: stored in `quotes.json`, 25 to start. They cycle deterministically by date (same quote all day, changes daily), plus a random quote on tap. See "Adding or editing quotes" above.

## Daily push notifications (Firebase)

Notifications are sent through Firebase Cloud Messaging, triggered once a day by a GitHub Actions workflow — no server to run yourself. It works for **any number of phones**, and there are no tokens to copy around.

**How it works:**
1. On each phone, open the installed app and switch on the **Daily Reminder** toggle. The app gets a push token and saves it to the `subscribers` collection in Firestore with `enabled: true`.
2. Switching the toggle off sets `enabled: false` for that device (the document is kept, not deleted).
3. Each day the GitHub Actions workflow runs `scripts/send-daily-quote.js`, which reads every subscriber with `enabled == true` and sends them that day's quote.

**One-time setup:**
1. Create the Firebase project, enable Cloud Messaging and Firestore, and put the web app config and VAPID key in `index.html` and `sw.js`.
2. In your GitHub repo, go to **Settings → Secrets and variables → Actions → New repository secret**, name it `FIREBASE_SERVICE_ACCOUNT`, and paste the *entire contents* of the service account JSON file (Firebase Project Settings → Service Accounts → Generate new private key). This is the only secret needed.

**Testing without waiting for the schedule:** go to the repo's **Actions** tab → **Send daily quote notification** → **Run workflow**. A manual run sends immediately.

**How the send time works:** GitHub's scheduled workflows are best-effort and often start 10–60 minutes late, so the workflow is deliberately scheduled early (`20 14 * * *`, i.e. 14:20 UTC) and the script then waits until the exact send time before sending. The target is **15:00 UTC = 8:00 AM Arizona time** (Arizona doesn't observe daylight saving, so this is the same all year). The wait is skipped if the run starts after the send time, or more than 90 minutes before it. Messages are sent with high urgency and a 1-hour TTL, so an undeliverable notification expires instead of arriving late.

**Changing the send time:**
1. Edit `SEND_HOUR_UTC` and `SEND_MINUTE_UTC` at the top of the wait logic in `scripts/send-daily-quote.js`.
2. Edit the `cron` line in `.github/workflows/daily-quote.yml` so it starts about 40 minutes *before* the new send time. Pick an off-peak minute (not `:00`). Cron times are in UTC.

For example, for 7:00 AM Arizona (14:00 UTC), set the script to hour `14`, minute `0`, and the cron to `20 13 * * *`.

**If a device stops receiving notifications:** push tokens can be invalidated (e.g. the app was reinstalled or Safari data was cleared). The workflow log in the Actions tab shows which token failed and why. Have that phone open the app and switch the **Daily Reminder** toggle off and back on to register a fresh token. A failed token for one phone won't stop the quote from sending to the others.

**Only one service worker:** `sw.js` must remain the only service worker for the app. A second one at the same scope (such as a separate `firebase-messaging-sw.js`) can replace or race with it, which causes stale subscriptions and duplicate notifications.