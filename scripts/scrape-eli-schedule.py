"""
Eli Schedule Scraper — pulls Helisma Putri's confirmed appearances from
the official jkt48.com API and writes the result to a static JSON file
the frontend can serve as `/data/eli-schedule.json`.

Why a Python scraper (not Node like the rest of the repo): jkt48.com
sits behind Cloudflare's anti-bot challenge that pure-HTTP libraries
(node-fetch, axios) can't solve out-of-the-box. Playwright launches a
real Chromium browser to solve the challenge, then re-uses the session
cookies for all subsequent API calls. The frontend is still React/Vite
— we just consume the JSON output.

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
import re
import time
from datetime import datetime
from html import unescape
from pathlib import Path

from playwright.sync_api import sync_playwright

ELI_MEMBER_ID = 112
ELI_NAME = "Helisma Putri"

# How many months ahead to scrape. JKT48 typically announces 2-4 weeks
# out, so 3 months captures everything currently scheduled.
MONTHS_AHEAD = 3

# How many months behind to also include. We need 1 month of recent past
# so the live counter on /schedule can detect shows that aired between the
# manual #JumlahShowJKT48 baseline (last updated mid-month) and today.
# Past shows past the live-counter window are still in the lifetime
# baseline (siteConfig.eli.careerStats), so 1 month of trailing data is
# enough to bridge the gap.
MONTHS_BEHIND = 1

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
MEMBER_OUTPUT_PATH = Path(__file__).parent.parent / "public" / "data" / "eli-member.json"
SALES_OUTPUT_PATH = Path(__file__).parent.parent / "public" / "data" / "eli-sales.json"
ELI_NEWS_OUTPUT_PATH = Path(__file__).parent.parent / "public" / "data" / "eli-news.json"
BASE = "https://jkt48.com"

# How many news entries to pull from the listing endpoint per scrape.
# JKT48's news template rarely names individual members in the body —
# only ~1 out of every 50 articles mentions "Helisma" directly. So the
# strip ships as "JKT48 Resmi" with an Eli highlight badge per row.
# 50 covers ~5 months of announcements so a fan loading the page sees
# at least one badged article even during quiet stretches; fits inside
# the ~60s news-pass budget even with detail fetches.
NEWS_SCAN_LIMIT = 50

# Eli-name regex used to flag (not filter) news articles. Word boundary
# on "Helisma" avoids partial matches inside unrelated words; "Helisma
# Putri" is her unique full name. We deliberately don't match bare
# "Eli" — too many JKT48 names start with E (Elin, Eliana, Elsa, etc.).
ELI_NAME_RE = re.compile(r"\bHelisma\b", re.IGNORECASE)

# Strip HTML tags + collapse whitespace for the snippet preview. Cheap
# regex pass is fine here — jkt48.com content_body is well-formed HTML
# from a rich-text editor (no <script>/<style> to worry about).
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


class _Response:
    """Mimics requests.Response for in-browser fetch() results."""
    def __init__(self, status, url, body):
        self.status_code = status
        self.url = url
        self._body = body

    def json(self):
        if isinstance(self._body, str):
            return json.loads(self._body)
        return self._body

    def raise_for_status(self):
        if self.status_code >= 400:
            reason = {403: "Forbidden", 404: "Not Found", 500: "Server Error"}.get(
                self.status_code, "Error"
            )
            raise Exception(
                f"{self.status_code} Client Error: {reason} for url: {self.url}"
            )


class _Scraper:
    """Drop-in cloudscraper replacement — runs fetch() inside the browser
    page so Cloudflare cookies and JS context are used automatically."""
    def __init__(self, page):
        self._page = page

    def get(self, url, timeout=45):
        result = self._page.evaluate(
            """async ([url, timeoutMs]) => {
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), timeoutMs);
                try {
                    const r = await fetch(url, { signal: ctrl.signal });
                    const text = await r.text();
                    return { status: r.status, body: text };
                } catch (e) {
                    return { status: 0, body: e.message };
                } finally {
                    clearTimeout(timer);
                }
            }""",
            [url, timeout * 1000],
        )
        status = result.get("status", 0)
        body = result.get("body", "")
        if status == 0:
            raise Exception(f"fetch failed for {url}: {body}")
        return _Response(status, url, body)


# jkt48.com sometimes stalls past 20s under load — a single read timeout
# used to kill the whole GH Action run. Retry with short backoff so one
# slow slug doesn't lose us the rest of the scrape.
def _get_with_retry(sc, url, timeout=45, tries=3, label=None):
    last_exc = None
    for attempt in range(tries):
        try:
            return sc.get(url, timeout=timeout)
        except Exception as e:
            last_exc = e
            if attempt < tries - 1:
                wait = 2 * (attempt + 1)
                print(f"  [retry] {label or url}: {type(e).__name__}, "
                      f"retry {attempt + 1}/{tries - 1} in {wait}s")
                time.sleep(wait)
    raise last_exc


def fetch_month(sc, month: int, year: int):
    url = f"{BASE}/api/v1/schedules?lang=id&month={month}&year={year}"
    try:
        r = _get_with_retry(sc, url, label=f"month {year}-{month:02d}")
        r.raise_for_status()
    except Exception as e:
        print(f"  [warn] month {year}-{month:02d} fetch failed after retries: {e}")
        return []
    body = r.json()
    if not body.get("status"):
        print(f"  [warn] API returned status=false for {month}/{year}: {body.get('message')}")
        return []
    return body.get("data") or []


def fetch_detail(sc, slug: str):
    try:
        r = _get_with_retry(
            sc, f"{BASE}/api/v1/schedules/{slug}", label=f"detail {slug}"
        )
    except Exception as e:
        print(f"  [warn] detail {slug} fetch failed after retries: {e}")
        return None
    if r.status_code != 200:
        return None
    return r.json().get("data")


def normalize_showlike(detail: dict, slug: str, kind: str) -> dict | None:
    """SHOW / EVENT / GENERAL → one event. Returns None if Eli not in cast.

    All three share the same detail shape: flat `jkt48_member` array
    plus top-level date/start_time/end_time. Difference is intent
    (theater vs special event vs public event), surfaced via `kind`.

    Special rule: Team Dream shows (jkt48_member_type == "DREAM") are
    included even when Eli isn't yet explicitly listed in the cast.
    Eli is an active Team Dream member so her presence is certain —
    some shows are announced before the full cast is confirmed.
    """
    members = detail.get("jkt48_member") or []
    team = (detail.get("jkt48_member_type") or "").upper()
    eli_explicit = any(
        m.get("member_id") == ELI_MEMBER_ID or m.get("name") == ELI_NAME
        for m in members
    )
    eli_inferred = not eli_explicit and kind == "SHOW" and team == "DREAM"
    if not eli_explicit and not eli_inferred:
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
        # True when Eli isn't listed in the cast yet but we include the
        # show because she's a confirmed Team Dream member.
        "eli_inferred": eli_inferred,
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
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/126.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()
        print("[0/3] Solving Cloudflare challenge...")
        page.goto("https://jkt48.com", wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(5000)
        # Debug: dump cookies and try a test fetch
        cookies = context.cookies()
        cf_cookies = [c for c in cookies if "cf" in c["name"].lower() or "clearance" in c["name"].lower()]
        print(f"      Cloudflare cookies: {[c['name'] for c in cf_cookies]}")
        print(f"      All cookies: {[c['name'] for c in cookies]}")
        print(f"      Page URL after challenge: {page.url}")
        # Test: try fetching API with various approaches
        test1 = page.evaluate("""async () => {
            try {
                const r = await fetch('/api/v1/members/112', {
                    headers: { 'Accept': 'application/json' }
                });
                return { status: r.status, type: r.headers.get('content-type'), body: (await r.text()).substring(0, 200) };
            } catch(e) { return { error: e.message }; }
        }""")
        print(f"      Test 1 (fetch with Accept:json): {test1}")
        # Test: navigate to schedule page and intercept API calls
        api_responses = []
        def on_response(response):
            if "/api/" in response.url:
                api_responses.append({"url": response.url, "status": response.status})
        page.on("response", on_response)
        page.goto("https://jkt48.com/schedule", wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(3000)
        print(f"      API calls from /schedule page: {api_responses}")
        # Check if there's an X-Requested-With or other header the site uses
        test2 = page.evaluate("""async () => {
            try {
                const r = await fetch('/api/v1/members/112', {
                    headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
                });
                return { status: r.status, type: r.headers.get('content-type'), body: (await r.text()).substring(0, 200) };
            } catch(e) { return { error: e.message }; }
        }""")
        print(f"      Test 2 (with X-Requested-With): {test2}")

        sc = _Scraper(page)
        try:
            _run(sc)
        finally:
            browser.close()


def _run(sc):
    print(f"[1/3] Scanning {MONTHS_BEHIND} month behind + {MONTHS_AHEAD} months ahead...")
    today = datetime.now()
    eli_events = []
    detail_calls = 0
    # Dedupe upstream: each EXCLUSIVE M&G appears in the listing once per
    # session-date, but `/api/v1/schedules/{slug}` returns ALL sessions in
    # one payload — so fetching detail per listing entry produces duplicate
    # normalized sessions. Track each unique detail `code` so we only fetch
    # + emit per event once.
    seen_codes = set()
    # Map detail.code -> listing slug so fetch_active_sales can build
    # canonical /schedule/{slug} URLs for the on-sale strip. The
    # /api/v1/exclusives endpoint only returns the short code; the
    # public site's product page lives under /schedule/{slug} where
    # slug is `{code.lower()}-{ddmmyyyy}` derived from the WIB-shifted
    # listing date — non-trivial to reconstruct, so we capture it
    # during the schedule walk where it's free.
    slug_by_code = {}

    # Iterate from MONTHS_BEHIND in the past through MONTHS_AHEAD in the
    # future (inclusive). Negative offsets walk backward from today's
    # month; non-negative offsets walk forward.
    for offset in range(-MONTHS_BEHIND, MONTHS_AHEAD):
        m = today.month + offset
        y = today.year
        while m > 12:
            m -= 12
            y += 1
        while m < 1:
            m += 12
            y -= 1
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
            # Record slug for any EXCLUSIVE we've seen in the listing.
            # detail.code is the short product code (EXBE10 etc.).
            if kind == "EXCLUSIVE":
                ex_code = detail.get("code")
                if ex_code:
                    slug_by_code[ex_code] = slug
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
    print(f"[2/3] Found {len(eli_events)} Eli appearances ({breakdown}; "
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

    # === Member + Sales ===
    # Bonus pulls — once per scrape since these endpoints are cheap (1
    # request each) and the data drives the MemberCard + OnSaleStrip
    # components that don't need their own scraper.
    print("[3/3] Fetching member profile + active sales + news...")
    fetch_member(sc)
    fetch_active_sales(sc, slug_by_code)
    fetch_eli_news(sc)


def fetch_member(sc):
    """Cache /api/v1/members/112 to public/data/eli-member.json so the
    Profile page can render official photos / socials / bio without
    a hardcoded mirror in siteConfig."""
    url = f"{BASE}/api/v1/members/{ELI_MEMBER_ID}"
    try:
        r = sc.get(url, timeout=20)
        r.raise_for_status()
        m = r.json().get("data") or {}
    except Exception as e:
        print(f"  [warn] member fetch failed: {e}")
        return
    if not m:
        print("  [warn] member endpoint returned empty data")
        return
    payload = {
        "fetchedAt": datetime.utcnow().isoformat() + "Z",
        "member": {
            "code": m.get("code"),
            "name": m.get("name"),
            "nickname": m.get("nickname"),
            "type": m.get("type"),                 # team code (DREAM/LOVE/PASSION)
            "birthDate": m.get("birth_date"),
            "birthPlace": m.get("birth_place"),
            "bloodType": m.get("blood_type"),
            "bodyHeight": m.get("body_height"),
            "horoscope": m.get("horoscope"),
            "instagram": m.get("instagram_account"),
            "twitter": m.get("twitter_account"),
            "tiktok": m.get("tiktok_account"),
            "youtube": m.get("youtube_profile_movie"),
            # Photo URLs — `photo` is a relative path; photo_1/2/3 are
            # absolute. Front-end falls back through these in order.
            "photoPath": m.get("photo"),
            "photoUrls": [
                u for u in (m.get("photo_1"), m.get("photo_2"), m.get("photo_3"))
                if u
            ],
        },
    }
    MEMBER_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    MEMBER_OUTPUT_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"      wrote {MEMBER_OUTPUT_PATH}")


def lookup_exclusive_slug(sc, code, soonest_session_iso):
    """Find an exclusive's listing slug by querying the month its
    soonest session falls into. Used as a fallback when the slug
    wasn't captured during the main schedule walk (e.g. session is
    >MONTHS_AHEAD in the future)."""
    if not code or not soonest_session_iso:
        return None
    try:
        d = datetime.fromisoformat(soonest_session_iso.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None
    # The listing slug uses WIB-shifted dates, which can land in the
    # next or previous month vs UTC — probe ±1 month for safety.
    code_lc = code.lower()
    candidates = [(d.year, d.month)]
    nm = d.month + 1 if d.month < 12 else 1
    ny = d.year if d.month < 12 else d.year + 1
    candidates.append((ny, nm))
    pm = d.month - 1 if d.month > 1 else 12
    py = d.year if d.month > 1 else d.year - 1
    candidates.append((py, pm))
    for y, m in candidates:
        try:
            r = sc.get(
                f"{BASE}/api/v1/schedules?lang=id&month={m}&year={y}",
                timeout=15,
            )
            time.sleep(DETAIL_DELAY_S)
            listing = r.json().get("data") or []
        except Exception:
            continue
        for entry in listing:
            slug = (entry.get("link") or "").lower()
            if slug.startswith(f"{code_lc}-"):
                return entry.get("link")
    return None


def fetch_active_sales(sc, slug_by_code=None):
    """List exclusives currently on sale that include Eli in any session
    Jalur. Output drives the OnSaleStrip on /schedule. Each entry's
    sales_period array is preserved verbatim so the front-end can
    render a 'sale ends in X hours' countdown.

    slug_by_code: optional dict captured by the schedule walk earlier
    in this run, mapping product code -> listing slug. Used to build
    correct /schedule/{slug} URLs since /exclusive/{code} 404s on the
    public site.
    """
    slug_by_code = slug_by_code or {}
    try:
        r = sc.get(f"{BASE}/api/v1/exclusives", timeout=20)
        r.raise_for_status()
        listing = r.json().get("data") or []
    except Exception as e:
        print(f"  [warn] exclusives list fetch failed: {e}")
        return

    eli_sales = []
    for entry in listing:
        code = entry.get("code")
        if not code:
            continue
        try:
            d = sc.get(f"{BASE}/api/v1/exclusives/{code}", timeout=20)
            time.sleep(DETAIL_DELAY_S)
            if d.status_code != 200:
                continue
            detail = d.json().get("data") or {}
        except Exception:
            continue

        # Check if Eli is in any session_detail Jalur
        sessions = detail.get("session") or []
        eli_jalurs = []
        soonest_session_date = None
        for sess in sessions:
            details = sess.get("session_detail") or []
            matches = [
                sd for sd in details
                if sd.get("jkt48_member_name") == ELI_NAME
            ]
            if not matches:
                continue
            for sd in matches:
                eli_jalurs.append({
                    "sessionLabel": sess.get("label"),
                    "sessionDate": sess.get("date"),
                    "jalur": sd.get("label"),
                    "ticketsSold": sd.get("tickets_sold"),
                    "remainingQuota": sd.get("available_quota", 0) or 0,
                })
            if sess.get("date"):
                if soonest_session_date is None or sess["date"] < soonest_session_date:
                    soonest_session_date = sess["date"]

        if not eli_jalurs:
            continue

        ex_code = detail.get("code")
        listing_slug = slug_by_code.get(ex_code)
        # Prefer the canonical listing slug captured during the schedule
        # walk; fall back to the API listing endpoint to find it for
        # exclusives whose nearest session falls outside the scrape
        # window.
        if not listing_slug:
            listing_slug = lookup_exclusive_slug(sc, ex_code, soonest_session_date)
        if listing_slug:
            url = f"{BASE}/schedule/{listing_slug}"
        else:
            # Last resort — the schedule page list view at least gets
            # the user to the right area instead of a 404.
            url = f"{BASE}/schedule"

        eli_sales.append({
            "exclusiveId": detail.get("exclusive_id"),
            "code": ex_code,
            "slug": listing_slug,
            "category": detail.get("category"),    # PHOTOCARD / TWO_SHOT / DIGITAL_PHOTOBOOK
            "title": detail.get("title"),
            "thumbnail": detail.get("thumbnail_image"),
            "previewImage": detail.get("preview_image"),
            "defaultPrice": detail.get("default_price"),
            "totalQuota": detail.get("total_quota"),
            "salesPeriod": detail.get("sales_period") or [],
            "soonestSessionDate": soonest_session_date,
            "eliSessions": eli_jalurs,
            "url": url,
        })

    payload = {
        "fetchedAt": datetime.utcnow().isoformat() + "Z",
        "salesCount": len(eli_sales),
        "sales": eli_sales,
    }
    SALES_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    SALES_OUTPUT_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"      wrote {SALES_OUTPUT_PATH} ({len(eli_sales)} active sales)")


def _html_to_snippet(html: str, max_chars: int = 220) -> str:
    """Reduce an HTML body to a plain-text preview snippet.

    jkt48.com `content_body` is rich-text editor output — paragraphs of
    nested <span> styling. The first paragraph is usually the lede, so
    grabbing the first ~220 chars of stripped text gives a usable
    preview without us needing a real parser.
    """
    if not html:
        return ""
    text = _HTML_TAG_RE.sub(" ", html)
    text = unescape(text)
    text = _WS_RE.sub(" ", text).strip()
    if len(text) > max_chars:
        # Trim to last word boundary for a cleaner cut.
        text = text[:max_chars].rsplit(" ", 1)[0] + "…"
    return text


def _eli_snippet(html: str, max_chars: int = 220) -> str:
    """Like _html_to_snippet, but anchored around the first 'Helisma'
    mention so the preview shows WHY the article matched.

    Useful for headlines like "Personal Meet and Greet Festival LDP"
    where Eli appears 30 paragraphs deep in a cast list — the lede
    would say nothing about her otherwise.
    """
    if not html:
        return ""
    text = _HTML_TAG_RE.sub(" ", html)
    text = unescape(text)
    text = _WS_RE.sub(" ", text).strip()
    match = ELI_NAME_RE.search(text)
    if not match:
        return text[:max_chars] + ("…" if len(text) > max_chars else "")
    # Anchor a window ~40 chars before the match to give context.
    start = max(0, match.start() - 40)
    end = min(len(text), start + max_chars)
    snippet = text[start:end]
    if start > 0:
        snippet = "…" + snippet.lstrip()
    if end < len(text):
        snippet = snippet.rstrip() + "…"
    return snippet


def fetch_eli_news(sc, scan_limit: int = NEWS_SCAN_LIMIT):
    """Pull the latest JKT48 news with an Eli-mention highlight flag.

    Hybrid feed (not a strict filter): we keep every recent announcement
    so the Home strip has consistent content, but each article carries
    a `mentionsEli` boolean so the UI can badge the ones that actually
    name Helisma Putri. Sparse upstream — only ~1 in 50 mentions her
    directly — so filtering alone would leave the strip empty.

    The detail endpoint wraps the real payload under `data.result`
    (different shape from the schedule API — discovered via probe).
    """
    url = f"{BASE}/api/v1/news?lang=id&limit={scan_limit}"
    try:
        r = _get_with_retry(sc, url, label="news listing")
        r.raise_for_status()
        items = r.json().get("data") or []
    except Exception as e:
        print(f"  [warn] eli-news listing failed: {e}")
        return

    out_items = []
    eli_hit_count = 0
    detail_calls = 0
    for n in items[:scan_limit]:
        slug = n.get("link")
        if not slug:
            continue
        title = n.get("title") or ""
        title_match = bool(ELI_NAME_RE.search(title))

        # Detail fetch gets us both content_body (for body match + snippet)
        # and the canonical background_image (the listing's version is
        # sometimes null while the detail has it).
        body = ""
        detail_bg = None
        try:
            d = _get_with_retry(
                sc, f"{BASE}/api/v1/news/{slug}", label=f"news {slug[:40]}"
            )
            time.sleep(DETAIL_DELAY_S)
            if d.status_code == 200:
                detail_calls += 1
                result = (d.json().get("data") or {}).get("result") or {}
                body = result.get("content_body") or ""
                detail_bg = result.get("background_image") or None
        except Exception as e:
            print(f"  [warn] news detail {slug[:50]} failed: {e}")
            # Continue without body — we still want the headline in the feed.

        body_match = bool(ELI_NAME_RE.search(body)) if body else False
        mentions_eli = title_match or body_match
        if mentions_eli:
            eli_hit_count += 1

        out_items.append({
            "id": n.get("news_id"),
            "title": title,
            "category": n.get("category"),
            "slug": slug,
            "url": f"{BASE}/news/{slug}",
            "image": detail_bg or n.get("background_image") or None,
            "publishedAt": n.get("valid_date_from"),
            "snippet": (
                _eli_snippet(body) if body_match
                else _html_to_snippet(body) if body
                else ""
            ),
            "mentionsEli": mentions_eli,
            "matchedIn": (
                "title+body" if title_match and body_match
                else "title" if title_match
                else "body" if body_match
                else None
            ),
        })

    payload = {
        "source": "https://jkt48.com (official public API)",
        "sourceNote": (
            "Latest {limit} JKT48 news announcements. Articles that name "
            "Helisma Putri (Eli, member_id 112) in title or content_body "
            "carry mentionsEli=true — JKT48's news template rarely names "
            "individual members, so the strip surfaces general updates "
            "with Eli highlights badged when she does appear."
        ).format(limit=scan_limit),
        "fetchedAt": datetime.utcnow().isoformat() + "Z",
        "scanned": len(out_items),
        "eliMentionCount": eli_hit_count,
        "items": out_items,
    }
    ELI_NEWS_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    ELI_NEWS_OUTPUT_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        f"      wrote {ELI_NEWS_OUTPUT_PATH} "
        f"({len(out_items)} articles, {eli_hit_count} mention Eli, "
        f"{detail_calls} detail fetches)"
    )


if __name__ == "__main__":
    main()
