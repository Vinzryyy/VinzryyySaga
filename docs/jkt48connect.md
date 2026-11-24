# JKT48Connect schedule & M&G bot

Eli's theater shows and M&G / 2-Shot / Video Call sessions (with sold-out status) come from the JKT48Connect API (free fanbase plan,
50,000 requests/month) while jkt48.com blocks the old scraper.

- Script: `scripts/fetch-jkt48connect-schedule.mjs`
- Logic + tests: `src/lib/jkt48connect.js`, `src/lib/__tests__/jkt48connect.test.js`
- Output:
  - `public/data/eli-schedule.jkt48connect.json`: shows + exclusive sessions from the last 30 days and upcoming
  - `public/data/eli-sales.jkt48connect.json`: products on sale where Eli still has a session, per-session sold-out status (shown in "Sedang Dijual" on /schedule)
- Workflow: `.github/workflows/refresh-jkt48connect.yml`, hourly, commits only when something changes (~20 requests per run, ~15k/month)
- Merge order on the site (`src/lib/scheduleSource.js`): jkt48.com scrape > JKT48Connect > /admin/jadwal > manual JSON

Eli is matched by member key `helisma-putri` (id 112) in shows, and by
her full name "Helisma" in exclusive lanes. Never by "Eli": it is also
the start of "Elin".

## API key

Server-side only, never committed and never shipped to the browser.

- Local: `JKT48CONNECT_API_KEY=…` in `.env.local` (gitignored). Run `node scripts/fetch-jkt48connect-schedule.mjs`.
- GitHub: repository secret `JKT48CONNECT_API_KEY`. Without it the workflow does nothing.

## Endpoints used

- `GET /api/theater?page&perpage`: shows with cast lists
- `GET /api/exclusives?page&perpage`: product list (newest first; the bot reads the newest 15)
- `GET /api/exclusives/:code`: sales periods, sessions, lanes with member name and `sold_out` / `available`

Sold-out status is as of the last run (shown as "Status per …"); the
card tells fans to double-check on jkt48.com before buying.
