# Daily Ashton

A tiny installable web app for iPhone that shows a daily quote from Elder Marvin J. Ashton. Tap the card for another random quote, share it, or turn on a daily reminder notification.

## Files

| File | Purpose |
|---|---|
| `index.html` | The app's layout and logic |
| `quotes.json` | The quotes themselves — edit this to add, remove, or change quotes |
| `manifest.json` | Lets iOS treat it as an installable app ("Add to Home Screen") |
| `sw.js` | Service worker — enables offline caching and notification display |
| `icon-192.png` / `icon-512.png` | Home screen app icons |

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
- **Notifications**: iOS only supports push notifications for home-screen-installed PWAs (iOS 16.4+). The current setup reschedules a local daily reminder each time you open the app — it won't reliably fire if the app goes unopened for days. Reliable "fires even if unopened" delivery needs a small push server (e.g. a free Cloudflare Worker); ask if you want that added.
- **Quotes**: stored in `quotes.json`, 25 to start. They cycle deterministically by date (same quote all day, changes daily), plus a random quote on tap. See "Adding or editing quotes" above.