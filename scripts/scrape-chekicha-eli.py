"""
Chekicha Scraper — pulls Eli (Helisma Putri)'s Chekicha session schedule
+ full history from ckc.utaten.com and writes a static JSON the
frontend serves as /data/chekicha-eli.json.

Why separate from scrape-eli-schedule.py:
  - Different platform (ckc.utaten.com vs jkt48.com)
  - Chekicha = Japanese video meet-and-greet app exclusive sessions
    (Birthday Chekicha, 2shot events) that DON'T appear in jkt48.com
    schedule — purely additive content.
  - Different stack: ASP.NET Core server-rendered HTML, no JSON API.
    Parse with BeautifulSoup instead of consuming an API response.

Access notes:
  - Public access — no login/auth needed. Profile renders the same logged out.
  - Eli is listed under her formal name "Helisma Putri" on Chekicha,
    not "Eli". Talent ID is MRI67PYR88 (8-char public ID).
  - Run locally:
      $ pip install -r scripts/requirements.txt
      $ python scripts/scrape-chekicha-eli.py
"""

import json
import time
from datetime import datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ELI_NAME = "Helisma Putri"
CHEKICHA_ID = "MRI67PYR88"
BASE = "https://ckc.utaten.com"

# Polite UA — identifies us so they can contact / rate-limit cleanly
# rather than getting blocked silently. armeniaca.online is a Helisma
# fan archive, so the scrape purpose is transparent.
USER_AGENT = (
    "Armeniaca-FanSite/1.0 "
    "(+https://armeniaca.online; chekicha-schedule-scraper)"
)
FETCH_DELAY_S = 0.6

OUTPUT_PATH = (
    Path(__file__).parent.parent / "public" / "data" / "chekicha-eli.json"
)


def make_session():
    s = requests.Session()
    s.headers.update({
        "User-Agent": USER_AGENT,
        "Accept-Language": "ja,en;q=0.9",
    })
    # Chekicha renders session times server-side based on this cookie
    # (set client-side via moment.tz.guess() on first visit). Without
    # it the server falls back to JST — which is +2 hrs vs WIB. Pin to
    # Jakarta so the JSON shows times Indonesian fans expect to see.
    s.cookies.set("time_zone", "Asia/Jakarta", domain="ckc.utaten.com", path="/")
    return s


def _text(el):
    return el.get_text(strip=True) if el else None


def parse_archive_items(soup):
    """Parse <li class="archive-list__item"> blocks.

    Selector uses classes (not IDs) because the source HTML duplicates
    id="liveDate"/"liveTime"/etc. across every <li> — invalid HTML but
    typical of server-rendered template output.
    """
    items = []
    for li in soup.select("ul.archive-list > li.archive-list__item"):
        img = li.select_one("img.archive-list__img")
        items.append({
            "date": _text(li.select_one(".archive-list__program-detail__date")),
            "time": _text(li.select_one(".archive-list__program-detail__time")),
            "title": _text(li.select_one(".archive-list__title")),
            "idol": _text(li.select_one(".archive-list__idol-name")),
            "thumbnail": img["src"] if (img and img.has_attr("src")) else None,
        })
    return items


def parse_upcoming(soup):
    """Parse <section class="program"> — may be empty.

    Returns (items, is_explicit_empty). Empty section uses the
    `.item--none` placeholder "チェキチャの予定はありません。".
    When populated, presumed to mirror archive-list structure (we don't
    have a confirmed sample — defensive selector covers likely shapes).
    """
    section = soup.find("section", class_="program")
    if not section:
        return [], False
    if section.find("div", class_="item--none"):
        return [], True

    items = []
    # Try the same archive-list selector first (most likely shape).
    # Fall back to a class-prefix probe for other potential template shapes.
    candidates = section.select(
        "li.archive-list__item, "
        "li[class*='program-list__item'], "
        "li[class*='list__item']"
    )
    for li in candidates:
        img = li.select_one("img")
        items.append({
            "date": _text(li.select_one("[class*='date']")),
            "time": _text(li.select_one("[class*='time']")),
            "title": _text(li.select_one("[class*='title']")),
            "idol": _text(li.select_one("[class*='idol']")),
            "thumbnail": img["src"] if (img and img.has_attr("src")) else None,
        })
    return items, False


def parse_talent_meta(soup):
    name_el = soup.select_one(".channel__title--program")
    group_el = soup.select_one(".channel__group-name")
    avatar_el = soup.select_one(".channel__img img")
    return {
        "name": _text(name_el) or ELI_NAME,
        "group": _text(group_el),
        "avatar": avatar_el["src"] if (avatar_el and avatar_el.has_attr("src")) else None,
    }


def fetch(sess, url, label):
    r = sess.get(url, timeout=25)
    r.raise_for_status()
    return BeautifulSoup(r.text, "html.parser")


def main():
    sess = make_session()
    name_enc = ELI_NAME.replace(" ", "%20")
    profile_url = f"{BASE}/idol/detail/{name_enc}/{CHEKICHA_ID}/"
    livefeed_url = f"{BASE}/idol/livefeed/{CHEKICHA_ID}/"

    print(f"[1/2] Fetch profile {CHEKICHA_ID} ({ELI_NAME})...")
    profile_soup = fetch(sess, profile_url, label="profile")
    meta = parse_talent_meta(profile_soup)
    upcoming, upcoming_empty = parse_upcoming(profile_soup)
    preview_history = parse_archive_items(profile_soup)
    print(
        f"      upcoming: {len(upcoming)}"
        f"{' (empty placeholder)' if upcoming_empty else ''}, "
        f"archive preview: {len(preview_history)}"
    )

    print("[2/2] Fetch full livefeed history...")
    time.sleep(FETCH_DELAY_S)
    try:
        livefeed_soup = fetch(sess, livefeed_url, label="livefeed")
        full_history = parse_archive_items(livefeed_soup)
    except requests.RequestException as e:
        print(f"  [warn] livefeed fetch failed, fall back to profile preview: {e}")
        full_history = preview_history

    # Dedupe by (date, time, title) — preview overlaps with full feed
    seen = set()
    history = []
    for item in (full_history or preview_history):
        key = (item.get("date"), item.get("time"), item.get("title"))
        if key in seen:
            continue
        seen.add(key)
        history.append(item)

    # Sort history newest-first (date strings are yyyy/mm/dd so lex sort works)
    history.sort(
        key=lambda h: (h.get("date") or "", h.get("time") or ""),
        reverse=True,
    )

    payload = {
        "source": profile_url,
        "sourceNote": (
            f"Eli ({ELI_NAME}) Chekicha sessions scraped from ckc.utaten.com. "
            "Upcoming = video meet-and-greet slots she's confirmed for. "
            "History = past Birthday Chekicha + 2shot events. Chekicha "
            "is a JP-only app — armeniaca.online surfaces this for fans "
            "outside the Japanese App Store / Play Store ecosystem."
        ),
        "fetchedAt": datetime.utcnow().isoformat() + "Z",
        "talent": {
            **meta,
            "chekichaId": CHEKICHA_ID,
            "profileUrl": profile_url,
            "livefeedUrl": livefeed_url,
        },
        "timezone": "WIB (UTC+7, Asia/Jakarta)",
        "upcoming": upcoming,
        "upcomingEmptyPlaceholder": upcoming_empty,
        "history": history,
        "counts": {
            "upcoming": len(upcoming),
            "history": len(history),
        },
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        f"      wrote {OUTPUT_PATH} "
        f"({len(upcoming)} upcoming, {len(history)} history)"
    )


if __name__ == "__main__":
    main()
