# Admin jadwal (`/admin/jadwal`)

A private page for adding Eli's schedule from your phone or laptop. Entries are
saved to Firebase Realtime Database at `/eli_schedule` and appear on the site
immediately (Home status hero, Jadwal card, `/schedule` list and calendar). No
commit or redeploy needed.

Only Google accounts listed under `/admins` in the database can save. The
database rules enforce this; the page just hides the form from everyone else.

## One-time setup (Firebase Console)

1. **Turn on Google sign-in**
   Firebase Console → Authentication → Get started → Sign-in method →
   **Google** → Enable → Save.
2. **Allow your domains**
   Authentication → Settings → Authorized domains. Make sure
   `armeniaca.online` and `localhost` are listed. Add your Vercel domain too
   if you sign in on preview deployments.
3. **Publish the database rules**
   Realtime Database → Rules → paste the whole `database.rules.json` from the
   repo → Publish. (Or `firebase deploy --only database`.)
4. **Make yourself admin**
   - Open `https://armeniaca.online/admin/jadwal` and sign in with Google.
   - The page shows your UID ("Akun ini belum jadi admin").
   - Realtime Database → Data → add a child `admins`, and under it a key with
     your UID and the value `true` (boolean, not the text "true").
   - Reload the page. The form appears.

To add another admin later, repeat step 4 with their UID.

## Adding a schedule

1. Pick the type: Show Teater, 2Shot / M&G, Video Call, Event / Off-site.
2. Set the date (WIB) and start time. Shows default to 19:00.
3. For shows, type or tap the setlist (recent ones appear as quick buttons).
   Unit song, position and partner are optional but feed the Rekap and show
   log.
4. **Tambah.** It's on the site right away.

Edit with the pencil button, delete with the bin (asks once more inline).

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
