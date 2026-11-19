# Manual schedule entries

jkt48.com currently blocks the automated scraper (Cloudflare 403), so
`public/data/eli-schedule.json` stops updating. Add Eli's appearances by
hand in **`public/data/eli-schedule.manual.json`** instead. The site merges
both files everywhere the schedule appears: the Home status hero, the
"Terkini" Jadwal card, `/schedule` (list + calendar), setlist counts and the
Armeniaca Town almanak.

If the scraper starts working again and finds the same event (same WIB day,
start time and type), its copy wins and the manual one is hidden, so you
never get duplicates. Old manual entries can stay in the file.

## Adding an entry

1. Copy the details from the event page on jkt48.com.
2. Add an object to `events`:

```json
{
  "updatedAt": "2026-11-19",
  "events": [
    {
      "title": "Aitakatta",
      "date": "2026-11-21",
      "start_time": "19:00",
      "url": "https://jkt48.com/schedule/sh1234-aitakatta"
    }
  ]
}
```

3. Set `updatedAt` to today. It's shown as the "Update …" date on the site.
4. Check it: `npm run check-schedule`. It lists every entry in WIB time, or
   tells you exactly what's wrong.
5. Commit and push. Vercel redeploys and the entry appears.

## Fields

| Field | Required | Notes |
|---|---|---|
| `title` | yes | For theater shows, use the **setlist name** (e.g. "Aitakatta") so setlist counts update after the show airs. |
| `date` | yes | `YYYY-MM-DD` in WIB. A full ISO timestamp with offset also works. |
| `start_time` | recommended | `HH:MM`, 24-hour, WIB. |
| `end_time` | no | `HH:MM`. |
| `kind` | no | `SHOW` (default), `EXCLUSIVE` (M&G / 2Shot), `EVENT`, `GENERAL` (off-site). |
| `is_video_call` | no | `true` for video-call events (use with `kind: "EVENT"`). |
| `category` | no | For `EXCLUSIVE`: `TWO_SHOT`, `MEET_GREET`, `PHOTOCARD`, or `DIGITAL_PHOTOBOOK` (shown as Video Call). |
| `venue` | no | Defaults by kind, e.g. "JKT48 Theater". |
| `url` | recommended | The jkt48.com event page. Defaults to the schedule overview. |
| `team` | no | Shows default to `DREAM`. |
| `is_birthday_show` | no | `true` adds the Birthday badge. |
| `eli_jalur`, `sold_out`, `remaining_total` | no | M&G details, same as the scraper's fields. |
| `note` | no | Free text for yourself; not shown on the site. |

## More examples

```json
{ "kind": "EXCLUSIVE", "category": "TWO_SHOT", "title": "Personal 2Shot (Sesi 2)",
  "date": "2026-11-22", "start_time": "13:00", "end_time": "14:30", "eli_jalur": ["Jalur 4"] }

{ "kind": "EVENT", "is_video_call": true, "title": "Video Call Sesi Malam",
  "date": "2026-11-25", "start_time": "20:00" }

{ "kind": "GENERAL", "title": "JKT48 Fest Bandung", "date": "2026-11-29",
  "start_time": "15:00", "venue": "Trans Studio Bandung" }
```
