"""
Eli Schedule Scraper — pulls Helisma Putri's confirmed appearances from
the official jkt48.com API and writes the result to a static JSON file
the frontend can serve as `/data/eli-schedule.json`.

Why a Python scraper (not Node like the rest of the repo): jkt48.com
sits behind Cloudflare's anti-bot challenge that pure-HTTP libraries
(node-fetch, axios) can't solve out-of-the-box. `cloudscraper` is the
lightest tool that does, and it's Python-only. The frontend is still
React/Vite — we just consume the JSON output.

The public `/api/v1/schedules` endpoints don't actually require auth —
both listing and detail return full cast arrays unauthenticated. So no
session cookie, no bearer token, no secret rotation needed.

Two event categories handled:
  1. SHOW (theater stages)     — `data.jkt48_member` array of {name, member_id}
  2. EXCLUSIVE (meet & greet)  — `data.session[].session_detail[].jkt48_member_name`
                                  (one M&G can have multiple sessions, each
                                  with a separate Eli slot if applicable)

How it works (per run):
  1. For the current month + next N months:
       a. GET /api/v1/schedules?lang=id&month=M&year=Y → list of events
       b. For each SHOW: GET detail, keep if Eli in jkt48_member
       c. For each EXCLUSIVE: GET detail, expand sessions, keep ones
          where any session_detail mentions Helisma Putri
  2. Sort by date, write to public/data/eli-schedule.json.

Run locally:
  $ pip install -r scripts/requirements.txt
  $ python scripts/scrape-eli-schedule.py
"""

import json
import time
from datetime import datetime
from pathlib import Path

import cloudscraper

ELI_MEMBER_ID = 112
ELI_NAME = "Helisma Putri"

# How many months ahead to scrape. JKT48 typically announces 2-4 weeks
# out, so 3 months captures everything currently scheduled.
MONTHS_AHEAD = 3

# Event categories we KEEP from the listing for detail fetching.
#   SHOW       — theater stages
#   EXCLUSIVE  — meet & greet / 2Shot festivals
#   EVENT      — special standalone events (Video Call, dedicated session)
#   GENERAL    — public/off-site events (festival, mall anniversary, etc.)
# Eli appears in the cast list of EVENT/GENERAL when she's confirmed.
# When `jkt48_member` is empty (e.g., gen-14-only events) we skip them.
KEEP_TYPES = {"SHOW", "EXCLUSIVE", "EVENT", "GENERAL"}

# Which kinds use the SHOW-style detail (flat jkt48_member array)
SHOWLIKE_KINDS = {"SHOW", "EVENT", "GENERAL"}

# Politeness delay between detail fetches.
DETAIL_DELAY_S = 0.4

OUTPUT_PATH = Path(__file__).parent.parent / "public" / "data" / "eli-schedule.json"
BASE = "https://jkt48.com"


def make_scraper() -> cloudscraper.CloudScraper:
    return cloudscraper.create_scraper(
        browser={"browser": "chrome", "platform": "windows", "desktop": True}
    )


def fetch_month(sc, month: int, year: int):
    url = f"{BASE}/api/v1/schedules?lang=id&month={month}&year={year}"
    r = sc.get(url, timeout=20)
    r.raise_for_status()
    body = r.json()
    if not body.get("status"):
        print(f"  [warn] API returned status=false for {month}/{year}: {body.get('message')}")
        return []
    return body.get("data") or []


def fetch_detail(sc, slug: str):
    r = sc.get(f"{BASE}/api/v1/schedules/{slug}", timeout=20)
    if r.status_code != 200:
        return None
    return r.json().get("data")


def normalize_showlike(detail: dict, slug: str, kind: str) -> dict | None:
    """SHOW / EVENT / GENERAL → one event. Returns None if Eli not in cast.

    All three share the same detail shape: flat `jkt48_member` array
    plus top-level date/start_time/end_time. Difference is intent
    (theater vs special event vs public event), surfaced via `kind`.
    """
    members = detail.get("jkt48_member") or []
    eli = any(
        m.get("member_id") == ELI_MEMBER_ID or m.get("name") == ELI_NAME
        for m in members
    )
    if not eli:
        return None
    # Pick a sensible default venue per kind. EVENT can be in-theater or
    # virtual (Video Call); honor `is_in_theater` when present.
    if kind == "SHOW":
        venue = "JKT48 Theater"
    elif kind == "EVENT":
        is_vc = "video call" in (detail.get("title") or "").lower()
        in_theater = detail.get("is_in_theater")
        venue = "Video Call (online)" if is_vc else ("JKT48 Theater" if in_theater else "JKT48 Event")
    else:  # GENERAL
        venue = "JKT48 Off-site Event"
    return {
        "kind": kind,
        "schedule_id": detail.get("theater_show_id") or detail.get("event_id"),
        "code": detail.get("code"),
        "title": detail.get("title"),
        "date": detail.get("date"),
        "start_time": detail.get("start_time"),
        "end_time": detail.get("end_time"),
        "set_list": detail.get("set_list"),
        "team": detail.get("jkt48_member_type"),
        "venue": venue,
        "members": [
            {"name": m.get("name"), "member_id": m.get("member_id"), "type": m.get("type")}
            for m in members
        ],
        "is_birthday_show": detail.get("birthday_member") is not None,
        "is_video_call": kind == "EVENT" and "video call" in (detail.get("title") or "").lower(),
        # jkt48.com uses the full slug from the listing (e.g.
        # `sh86f5-sambil-menggandeng-erat-tanganku`), not just the
        # short `code` (`SH86F5`). Short-form URLs redirect to
        # /schedule overview which loses context.
        "url": f"{BASE}/schedule/{slug}",
    }


def normalize_exclusive(detail: dict, listing_date: str | None, slug: str) -> list[dict]:
    """EXCLUSIVE (M&G) → one event per session that has Eli in a Jalur."""
    out = []
    sessions = detail.get("session") or []
    for s_idx, sess in enumerate(sessions, start=1):
        details = sess.get("session_detail") or []
        eli_jalurs = [
            d for d in details
            if d.get("jkt48_member_name") == ELI_NAME
        ]
        if not eli_jalurs:
            continue
        # Compose a friendly title that includes the session label
        base_title = detail.get("title") or "Personal Meet & Greet"
        sess_label = sess.get("label") or f"Sesi {s_idx}"
        # Sold-out if every Eli-Jalur in this session has 0 quota left.
        # Partial = some Jalur still has quota; treated as "available".
        eli_remaining = [d.get("available_quota", 0) or 0 for d in eli_jalurs]
        all_sold_out = all(q == 0 for q in eli_remaining)
        total_remaining = sum(eli_remaining)
        out.append({
            "kind": "EXCLUSIVE",
            "schedule_id": detail.get("exclusive_id"),
            "code": detail.get("code"),
            "title": f"{base_title} ({sess_label})",
            "date": sess.get("date") or listing_date,
            "start_time": (sess.get("start_time") or "")[:5] if sess.get("start_time") else None,
            "end_time": (sess.get("end_time") or "")[:5] if sess.get("end_time") else None,
            "category": detail.get("category"),  # e.g. TWO_SHOT, MEET_GREET
            "team": None,
            "venue": "JKT48 Personal M&G Festival",
            "members": [
                {"name": d.get("jkt48_member_name")}
                for d in details
            ],
            "eli_jalur": [d.get("label") for d in eli_jalurs],
            "tickets_sold_eli": [d.get("tickets_sold") for d in eli_jalurs],
            "eli_remaining": eli_remaining,
            "sold_out": all_sold_out,
            "remaining_total": total_remaining,
            "is_birthday_show": False,
            # Full listing slug — short `code` URLs hit /schedule overview
            "url": f"{BASE}/schedule/{slug}",
        })
    return out


def main():
    sc = make_scraper()

    print(f"[1/2] Scanning {MONTHS_AHEAD} months ahead...")
    today = datetime.now()
    eli_events = []
    detail_calls = 0
    # Dedupe upstream: each EXCLUSIVE M&G appears in the listing once per
    # session-date, but `/api/v1/schedules/{slug}` returns ALL sessions in
    # one payload — so fetching detail per listing entry produces duplicate
    # normalized sessions. Track each unique detail `code` so we only fetch
    # + emit per event once.
    seen_codes = set()

    for offset in range(MONTHS_AHEAD):
        m = today.month + offset
        y = today.year
        while m > 12:
            m -= 12
            y += 1
        listing = fetch_month(sc, m, y)
        candidates = [s for s in listing if s.get("type") in KEEP_TYPES]
        skipped = len(listing) - len(candidates)
        print(f"      {y}-{m:02d}: {len(listing)} entries, {len(candidates)} candidates ({skipped} skipped)")

        for entry in candidates:
            slug = entry.get("link")
            if not slug:
                continue
            # Skip if we've already processed this slug
            if slug in seen_codes:
                continue
            detail = fetch_detail(sc, slug)
            detail_calls += 1
            time.sleep(DETAIL_DELAY_S)
            if not detail:
                continue
            seen_codes.add(slug)
            kind = entry.get("type")
            if kind in SHOWLIKE_KINDS:
                norm = normalize_showlike(detail, slug, kind)
                if norm:
                    eli_events.append(norm)
            elif kind == "EXCLUSIVE":
                eli_events.extend(normalize_exclusive(detail, entry.get("date"), slug))

    eli_events.sort(key=lambda s: s.get("date") or "")
    # Belt-and-suspenders dedupe by (code, date, start_time) in case the
    # source itself has overlapping records.
    seen = set()
    deduped = []
    for e in eli_events:
        key = (e.get("code"), e.get("date"), e.get("start_time"))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(e)
    eli_events = deduped

    counts = {}
    for e in eli_events:
        k = e.get("kind", "?")
        counts[k] = counts.get(k, 0) + 1
    breakdown = ", ".join(f"{v} {k.lower()}" for k, v in counts.items())
    print(f"[2/2] Found {len(eli_events)} Eli appearances ({breakdown}; "
          f"{detail_calls} detail fetches)")

    payload = {
        "source": "https://jkt48.com (official public API)",
        "sourceNote": (
            "Eli (Helisma Putri, member_id 112) appearances in JKT48 "
            "schedule for the next {months} months. Includes theater shows "
            "(SHOW) + Personal Meet & Greet sessions (EXCLUSIVE). Cast "
            "verified per event detail."
        ).format(months=MONTHS_AHEAD),
        "fetchedAt": datetime.utcnow().isoformat() + "Z",
        "eventCount": len(eli_events),
        "events": eli_events,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"      wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
