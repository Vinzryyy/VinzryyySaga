# JKT48Connect schedule bot

Eli's theater shows come from the JKT48Connect API (free fanbase plan,
50,000 requests/month) while jkt48.com blocks the old scraper.

- Script: `scripts/fetch-jkt48connect-schedule.mjs`
- Logic + tests: `src/lib/jkt48connect.js`, `src/lib/__tests__/jkt48connect.test.js`
- Output: `public/data/eli-schedule.jkt48connect.json` (shows from the last 30 days and upcoming)
- Workflow: `.github/workflows/refresh-jkt48connect.yml`, every 3 hours, commits only when Eli's shows change
- Merge order on the site (`src/lib/scheduleSource.js`): jkt48.com scrape > JKT48Connect > /admin/jadwal > manual JSON

Eli is matched by member key `helisma-putri` (id 112), never by name:
"Eli" is also the start of "Elin".

## API key

Server-side only, never committed and never shipped to the browser.

- Local: `JKT48CONNECT_API_KEY=…` in `.env.local` (gitignored). Run `node scripts/fetch-jkt48connect-schedule.mjs`.
- GitHub: repository secret `JKT48CONNECT_API_KEY`. Without it the workflow does nothing.

## Not covered yet

Personal Meet & Greet sessions and their quotas: no endpoint found on the
fanbase plan (tried `/api/exclusive`, `/api/events`, `/api/schedule`).
M&G still goes through `/admin/jadwal`.
