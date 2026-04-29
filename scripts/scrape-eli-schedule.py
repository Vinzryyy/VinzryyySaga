"""
Eli Schedule Scraper — pulls Helisma Putri's confirmed appearances from
the official jkt48.com API and writes the result to a static JSON file
the frontend can serve as `/data/eli-schedule.json`.

Why a Python scraper (not Node like the rest of the repo): jkt48.com
sits behind Cloudflare's anti-bot challenge that pure-HTTP libraries
(node-fetch, axios) can't solve out-of-the-box. `cloudscraper` is the
lightest tool that does, and it's Python-only. The frontend is still
React/Vite — we just consume the JSON output.

How it works (per run):
  1. Read JKT48_SESSION_COOKIE from env (NextAuth session token,
     captured from a real browser login). Cookie lasts ~30 days; refresh
     when scraper starts failing with 401s.
  2. GET /api/auth/session → extract `access_token` (separate JWT used
     as Bearer for the actual API).
  3. For the current month + next N months:
       a. GET /api/v1/schedules?lang=id&month=M&year=Y → list of shows
       b. Skip shows whose `jkt48_member_type` isn't DREAM (Eli's team)
          or JKT48 (all-team) — saves detail fetches.
       c. For each candidate: GET /api/v1/schedules/{slug} → cast list
          includes `jkt48_member` array with names + member_id.
       d. Keep shows where any member has member_id == ELI_MEMBER_ID.
  4. Sort by date, write to public/data/eli-schedule.json.

Run locally:
  $ pip install -r scripts/requirements.txt
  $ JKT48_SESSION_COOKIE='eyJ...' python scripts/scrape-eli-schedule.py

In GitHub Actions: see .github/workflows/refresh-eli-schedule.yml
which puts the cookie in repo secrets.
"""

import os
import sys
import json
import time
from datetime import datetime, timedelta
from pathlib import Path

import cloudscraper

# Eli's member_id on jkt48.com — confirmed via the show detail endpoint
# returning {"name": "Helisma Putri", "member_id": 112, ...}
ELI_MEMBER_ID = 112
ELI_NAME = "Helisma Putri"

# How many months ahead to scrape. Schedules are typically published
# 2-4 weeks ahead, so 3 months captures everything announced.
MONTHS_AHEAD = 3

# Member-type values we care about. DREAM = Eli's team. JKT48 = all-team
# show (e.g. anniversary, special event) where any member can appear.
# Other values like LOVE / PASSION are other teams — Eli won't be in those.
RELEVANT_TYPES = {"DREAM", "JKT48"}

# Reasonable politeness delay between detail fetches so we don't hammer
# the API like a bot. 0.4s ≈ 150 req/min ceiling.
DETAIL_DELAY_S = 0.4

OUTPUT_PATH = Path(__file__).parent.parent / "public" / "data" / "eli-schedule.json"
BASE = "https://jkt48.com"


def must_env(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        sys.exit(
            f"[fatal] {name} is not set. Capture the NextAuth session cookie "
            f"from a logged-in browser (DevTools → Application → Cookies → "
            f"`__Secure-next-auth.session-token`) and pass it via env."
        )
    return v


def make_scraper(session_cookie: str) -> cloudscraper.CloudScraper:
    sc = cloudscraper.create_scraper(
        browser={"browser": "chrome", "platform": "windows", "desktop": True}
    )
    # Set the session cookie so subsequent requests are authenticated
    sc.cookies.set(
        "__Secure-next-auth.session-token",
        session_cookie,
        domain="jkt48.com",
        secure=True,
    )
    return sc


def get_access_token(sc: cloudscraper.CloudScraper) -> str:
    r = sc.get(f"{BASE}/api/auth/session", timeout=20)
    r.raise_for_status()
    data = r.json()
    if not data or "user" not in data:
        sys.exit(
            "[fatal] Session cookie expired or invalid. Re-capture from a "
            "logged-in browser and update the JKT48_SESSION_COOKIE secret."
        )
    return data["user"]["access_token"]


def fetch_month(sc, token: str, month: int, year: int):
    url = f"{BASE}/api/v1/schedules?lang=id&month={month}&year={year}"
    r = sc.get(url, headers={"authorization": f"Bearer {token}"}, timeout=20)
    r.raise_for_status()
    body = r.json()
    if not body.get("status"):
        print(f"  [warn] API returned status=false for {month}/{year}: {body.get('message')}")
        return []
    return body.get("data") or []


def fetch_show_detail(sc, token: str, slug: str):
    url = f"{BASE}/api/v1/schedules/{slug}"
    r = sc.get(url, headers={"authorization": f"Bearer {token}"}, timeout=20)
    if r.status_code != 200:
        return None
    body = r.json()
    return body.get("data")


def has_eli(show_detail: dict) -> bool:
    members = show_detail.get("jkt48_member") or []
    return any(
        m.get("member_id") == ELI_MEMBER_ID or m.get("name") == ELI_NAME
        for m in members
    )


def normalize_show(detail: dict) -> dict:
    """Trim the verbose detail down to the fields the frontend uses."""
    return {
        "schedule_id": detail.get("theater_show_id"),
        "code": detail.get("code"),
        "title": detail.get("title"),
        "date": detail.get("date"),
        "start_time": detail.get("start_time"),
        "end_time": detail.get("end_time"),
        "set_list": detail.get("set_list"),
        "team": detail.get("jkt48_member_type"),  # DREAM / JKT48 / etc
        "venue": "JKT48 Theater",  # API doesn't return venue but theater shows are always at the theater
        "members": [
            {"name": m.get("name"), "member_id": m.get("member_id"), "type": m.get("type")}
            for m in (detail.get("jkt48_member") or [])
        ],
        "is_birthday_show": detail.get("birthday_member") is not None,
        "url": f"https://jkt48.com/schedule/{detail.get('code', '').lower()}",
    }


def main():
    cookie = must_env("JKT48_SESSION_COOKIE")
    sc = make_scraper(cookie)

    print("[1/3] Verifying session…")
    token = get_access_token(sc)
    print(f"      access_token len={len(token)} ✓")

    print(f"[2/3] Scanning {MONTHS_AHEAD} months ahead…")
    today = datetime.now()
    eli_shows = []
    candidates_total = 0
    skipped_total = 0
    detail_calls = 0

    for offset in range(MONTHS_AHEAD):
        # Compute target month with rollover
        m = today.month + offset
        y = today.year
        while m > 12:
            m -= 12
            y += 1
        listing = fetch_month(sc, token, m, y)
        candidates = [s for s in listing if s.get("jkt48_member_type") in RELEVANT_TYPES]
        skipped = len(listing) - len(candidates)
        candidates_total += len(candidates)
        skipped_total += skipped
        print(f"      {y}-{m:02d}: {len(listing)} shows, {len(candidates)} candidates (skipped {skipped} non-DREAM/JKT48)")

        for show in candidates:
            slug = show.get("link")
            if not slug:
                continue
            detail = fetch_show_detail(sc, token, slug)
            detail_calls += 1
            time.sleep(DETAIL_DELAY_S)
            if not detail:
                continue
            if has_eli(detail):
                eli_shows.append(normalize_show(detail))

    eli_shows.sort(key=lambda s: s.get("date") or "")

    print(f"[3/3] Found {len(eli_shows)} Eli appearances "
          f"(scanned {candidates_total} candidates, {detail_calls} detail fetches)")

    payload = {
        "source": "https://jkt48.com (official) via authenticated session",
        "sourceNote": (
            "Eli (Helisma Putri, member_id 112) appearances in JKT48 theater "
            "schedule for the next {months} months. Cast list verified via per-show "
            "detail endpoint."
        ).format(months=MONTHS_AHEAD),
        "fetchedAt": datetime.utcnow().isoformat() + "Z",
        "eventCount": len(eli_shows),
        "events": eli_shows,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"      wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
