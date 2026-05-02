"""
One-off Eli Lifetime Show Counter — walks the jkt48.com schedule API
backwards from today to Eli's theater debut (Dec 2018) and prints how
many appearances she's made, broken down by kind (SHOW / EXCLUSIVE /
EVENT / GENERAL) and by year.

This is a counting variant of scrape-eli-schedule.py. Same matching
logic, same kind classification — but no JSON output, no dedupe across
sessions (each EXCLUSIVE session counts as one appearance, matching
how the production scraper emits them).

Run:
  $ pip install -r scripts/requirements.txt
  $ python scripts/count-eli-shows.py

Note: the public API may return empty for very old months. The script
prints per-month progress so you can see if/when coverage starts.
"""

import time
from collections import defaultdict
from datetime import datetime

import cloudscraper

ELI_MEMBER_ID = 112
ELI_NAME = "Helisma Putri"

# Eli's theater debut is 2018-12-16. Walk back to 2018-09 (audition month)
# for safety — anything earlier returns empty and we just print 0s.
DEBUT_YEAR = 2018
DEBUT_MONTH = 9

KEEP_TYPES = {"SHOW", "EXCLUSIVE", "EVENT", "GENERAL"}
SHOWLIKE_KINDS = {"SHOW", "EVENT", "GENERAL"}
DETAIL_DELAY_S = 0.35
BASE = "https://jkt48.com"


def make_scraper():
    return cloudscraper.create_scraper(
        browser={"browser": "chrome", "platform": "windows", "desktop": True}
    )


def fetch_month(sc, month, year):
    url = f"{BASE}/api/v1/schedules?lang=id&month={month}&year={year}"
    try:
        r = sc.get(url, timeout=20)
        r.raise_for_status()
        body = r.json()
    except Exception as e:
        print(f"  [warn] fetch_month {year}-{month:02d} failed: {e}")
        return []
    if not body.get("status"):
        return []
    return body.get("data") or []


def fetch_detail(sc, slug):
    try:
        r = sc.get(f"{BASE}/api/v1/schedules/{slug}", timeout=20)
        if r.status_code != 200:
            return None
        return r.json().get("data")
    except Exception:
        return None


def has_eli_in_showlike(detail):
    members = detail.get("jkt48_member") or []
    return any(
        m.get("member_id") == ELI_MEMBER_ID or m.get("name") == ELI_NAME
        for m in members
    )


def event_subkind(detail):
    """Split EVENT into 'event_theater' (counts as theater show) vs
    'event_vc' (Video Call, excluded from theater total) vs 'event_other'."""
    title_lc = (detail.get("title") or "").lower()
    if "video call" in title_lc:
        return "event_vc"
    if detail.get("is_in_theater"):
        return "event_theater"
    return "event_other"


def count_eli_in_exclusive(detail):
    """Each session that has Eli in any Jalur counts as one appearance."""
    sessions = detail.get("session") or []
    n = 0
    for sess in sessions:
        details = sess.get("session_detail") or []
        if any(d.get("jkt48_member_name") == ELI_NAME for d in details):
            n += 1
    return n


def iter_months_backwards(start_year, start_month, end_year, end_month):
    """Yield (year, month) from start back to end inclusive."""
    y, m = start_year, start_month
    while (y, m) >= (end_year, end_month):
        yield y, m
        m -= 1
        if m == 0:
            m = 12
            y -= 1


def main():
    sc = make_scraper()
    today = datetime.now()
    # Start one month ahead so already-announced shows for next month
    # (typically released 2-4 weeks before) are included in the count.
    start_y, start_m = today.year, today.month + 1
    if start_m > 12:
        start_m = 1
        start_y += 1

    by_kind = defaultdict(int)
    by_year = defaultdict(int)
    by_year_kind = defaultdict(lambda: defaultdict(int))
    detail_calls = 0
    seen_slugs = set()  # don't refetch a slug we've already seen this run

    print(
        f"Walking {start_y}-{start_m:02d} back to {DEBUT_YEAR}-{DEBUT_MONTH:02d}..."
    )
    for y, m in iter_months_backwards(start_y, start_m, DEBUT_YEAR, DEBUT_MONTH):
        listing = fetch_month(sc, m, y)
        candidates = [s for s in listing if s.get("type") in KEEP_TYPES]
        month_count = 0
        for entry in candidates:
            slug = entry.get("link")
            if not slug or slug in seen_slugs:
                continue
            seen_slugs.add(slug)
            detail = fetch_detail(sc, slug)
            detail_calls += 1
            time.sleep(DETAIL_DELAY_S)
            if not detail:
                continue
            kind = entry.get("type")
            entry_year = (entry.get("date") or "")[:4] or str(y)
            if kind in SHOWLIKE_KINDS:
                if has_eli_in_showlike(detail):
                    # Tag EVENT with its subkind so Video Calls don't
                    # inflate the "theater shows" total.
                    bucket = event_subkind(detail) if kind == "EVENT" else kind
                    by_kind[bucket] += 1
                    by_year[entry_year] += 1
                    by_year_kind[entry_year][bucket] += 1
                    month_count += 1
            elif kind == "EXCLUSIVE":
                n = count_eli_in_exclusive(detail)
                if n:
                    by_kind[kind] += n
                    by_year[entry_year] += n
                    by_year_kind[entry_year][kind] += n
                    month_count += n
        print(
            f"  {y}-{m:02d}: {len(listing):>3} listed, "
            f"{len(candidates):>3} candidates, +{month_count} Eli "
            f"(total {sum(by_kind.values())})"
        )

    total = sum(by_kind.values())
    # "Theater shows" the way fans count: SHOW + in-theater EVENTs
    # (anniversary nights, Sousenkyo concerts, dedicated sessions held
    # inside the JKT48 Theater). Excludes Video Calls and off-site events.
    theater_shows = by_kind["SHOW"] + by_kind["event_theater"]
    print()
    print("=" * 50)
    print(f"TOTAL Eli appearances:   {total}")
    print(f"THEATER SHOWS (SHOW + in-theater EVENT): {theater_shows}")
    print(f"  ({detail_calls} detail fetches across "
          f"{len(seen_slugs)} unique slugs)")
    print("=" * 50)
    print()
    print("By kind:")
    print(f"  SHOW                  {by_kind['SHOW']:>4}")
    print(f"  EVENT (in-theater)    {by_kind['event_theater']:>4}")
    print(f"  EVENT (video call)    {by_kind['event_vc']:>4}")
    print(f"  EVENT (other)         {by_kind['event_other']:>4}")
    print(f"  EXCLUSIVE (M&G)       {by_kind['EXCLUSIVE']:>4}")
    print(f"  GENERAL (off-site)    {by_kind['GENERAL']:>4}")
    print()
    print("By year (theater-show subset only):")
    for yr in sorted(by_year.keys()):
        kinds = by_year_kind[yr]
        ts = kinds.get("SHOW", 0) + kinds.get("event_theater", 0)
        bits = []
        if kinds.get("SHOW"):
            bits.append(f"{kinds['SHOW']} show")
        if kinds.get("event_theater"):
            bits.append(f"{kinds['event_theater']} in-theater event")
        if kinds.get("event_vc"):
            bits.append(f"{kinds['event_vc']} VC")
        if kinds.get("event_other"):
            bits.append(f"{kinds['event_other']} other event")
        if kinds.get("EXCLUSIVE"):
            bits.append(f"{kinds['EXCLUSIVE']} M&G")
        breakdown = ", ".join(bits)
        print(f"  {yr}: {ts:>3} theater  ({breakdown})")


if __name__ == "__main__":
    main()
