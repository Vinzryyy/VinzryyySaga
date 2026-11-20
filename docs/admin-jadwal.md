# Admin jadwal (`/admin/jadwal`)

A private page for adding Eli's schedule from your phone or laptop. Entries are
saved to Firebase Realtime Database at `/eli_schedule` and appear on the site
immediately (Home status hero, Jadwal card, `/schedule` list and calendar). No
commit or redeploy needed.

## How the password works

- One password per weekday (Monday–Saturday), based on the date in WIB
  (Asia/Jakarta). On **Sunday any of the six** works. The day switches at
  00:00 WIB; if you're still on the page, it locks and asks for the new one.
- The password is checked by the serverless function `api/admin-schedule.js`,
  never in the browser. That function is the only thing allowed to write
  `/eli_schedule` (the database rules deny every client write).
- Only **scrypt hashes** are stored, in the Vercel env var
  `ADMIN_PASSWORD_HASHES`. The plain passwords are not in the repo or on Vercel.
- 5 wrong tries from one IP lock it out for 15 minutes (best effort, per
  server instance).

## One-time setup

1. **Service account key (lets the server write)**
   Firebase Console → ⚙ Project settings → Service accounts →
   **Generate new private key** → download the JSON file.
   Keep it private; don't commit it.
2. **Vercel env vars**
   Vercel → Project → Settings → Environment Variables (Production):
   - `FIREBASE_SERVICE_ACCOUNT`: the whole contents of that JSON file.
   - `ADMIN_PASSWORD_HASHES`: the value from your local `.env.local`
     (the line starting `ADMIN_PASSWORD_HASHES=`, without that prefix).
   - `VITE_FIREBASE_DATABASE_URL` is already set for Wishes and is reused.
     (`FIREBASE_DATABASE_URL` overrides it if you ever need to.)
   Then redeploy so the function picks them up.
3. **Publish the database rules**
   Firebase Console → Realtime Database → Rules → paste the whole
   `database.rules.json` from the repo → Publish.

## Changing the passwords

Create a file with the new passwords, hash them, then delete the file:

```bash
echo '{"mon":"…","tue":"…","wed":"…","thu":"…","fri":"…","sat":"…"}' > /tmp/pw.json
npm run -s hash-admin-passwords < /tmp/pw.json
rm /tmp/pw.json
```

Paste the printed JSON into `ADMIN_PASSWORD_HASHES` on Vercel and redeploy.

## Adding a schedule

1. Open `/admin/jadwal`, enter today's password, **Buka**.
2. Pick the type: Show Teater, 2Shot / M&G, Video Call, Event / Off-site.
3. Set the date (WIB) and start time. Shows default to 19:00.
4. For shows, type or tap the setlist (recent ones appear as quick buttons).
   Unit song, position and partner are optional but feed the Rekap and show
   log.
5. **Tambah.** It's on the site right away.

Edit with the pencil button, delete with the bin (asks once more inline).
**Kunci** locks the page again.

## What happens after a show airs

- Theater shows dated after `careerStats.asOfDate` in `src/config/siteConfig.js`
  add to the show counter on `/schedule` automatically.
- If the title is the setlist name, its setlist count goes up too.
- The "Baris show log" box lists aired shows after the end of
  `scripts/eli-show-log.tsv` as ready-made TSV rows. Copy, paste into the
  TSV, run `python scripts/parse-show-log.py`, and update `careerStats`. Rows
  numbered "?" fall before the latest weekly total and need their number
  checked against the #JumlahShowJKT48 recap.

## Other sources

The site also reads `public/data/eli-schedule.manual.json`
(see [manual-schedule.md](manual-schedule.md)) and the scraped
`eli-schedule.json`. If the same event exists in more than one (same WIB
day, start time and type), priority is: scraped > admin page > JSON file.
