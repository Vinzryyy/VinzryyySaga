"""
record-idn-live.py — Armeniaca IDN Live recorder for Helisma Putri (jkt48_eli)

Detects when Eli goes live on IDN, then records:
  - Chat messages  →  public/data/idn-replay/srt/{slug}.srt
  - Gift log       →  public/data/idn-replay/top_gifters/{slug}.json
  - Session meta   →  public/data/idn-replay/sessions/{slug}.json

Usage:
  python scripts/record-idn-live.py                        # watch + auto-record
  python scripts/record-idn-live.py --slug <slug>          # force a specific slug
  python scripts/record-idn-live.py --ci-mode              # GitHub Actions mode
  python scripts/record-idn-live.py --probe --slug <slug>  # dump raw API responses for debugging
  python scripts/record-idn-live.py --dry-run              # detect only, no file writes

Stream detection: IDN API v4 (primary) → GraphQL (fallback)
Chat/gift:        v4 chat_room_id-based endpoints (probed on first live session)

Requirements:
  pip install requests>=2.31.0
"""

import argparse
import json
import os
import signal
import sys
import time
from datetime import datetime, timezone

import requests

# ── Config ────────────────────────────────────────────────────────────────────
IDN_V4_URL    = "https://api.idn.app/api/v4"
IDN_API_KEY   = "123f4c4e-6ce1-404d-8786-d17e46d65b5c"   # public key from jkt48.gemes.in
GRAPHQL_URL   = "https://api.idn.app/graphql"
MOBILE_API    = "https://mobile-api.idn.app"
ELI_USERNAME  = "jkt48_eli"

CHAT_POLL_SEC     = 5
GIFT_POLL_SEC     = 10
WATCH_SEC         = 30
STREAM_END_CHECKS = 3

HEADERS_V4 = {
    "Accept": "application/json",
    "x-api-key": IDN_API_KEY,
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36"
    ),
}
HEADERS_GQL = {**HEADERS_V4, "Content-Type": "application/json"}

# ── Output paths ──────────────────────────────────────────────────────────────
BASE_OUT = os.path.join("public", "data", "idn-replay")

def ensure_dir(sub):
    d = os.path.join(BASE_OUT, sub)
    os.makedirs(d, exist_ok=True)
    return d

# ── v4 REST helpers ───────────────────────────────────────────────────────────
def v4_get(path, params=None):
    r = requests.get(
        IDN_V4_URL + path,
        params=params,
        headers=HEADERS_V4,
        timeout=15,
    )
    r.raise_for_status()
    return r.json()

# ── GraphQL fallback ──────────────────────────────────────────────────────────
def gql(query):
    r = requests.post(
        GRAPHQL_URL,
        json={"query": query},
        headers=HEADERS_GQL,
        timeout=15,
    )
    r.raise_for_status()
    return r.json()

# ── Stream detection ──────────────────────────────────────────────────────────
def find_eli_stream():
    """
    Primary: walk /api/v4/livestreams pages for jkt48_eli.
    Fallback: GraphQL getLivestreams.
    Returns normalized stream dict or None.
    """
    # ── v4 REST ───────────────────────────────────────────────────────────
    for page in range(1, 9):
        try:
            data = v4_get("/livestreams", params={"category": "all", "page": page})
            # v4 shape: {"data": [...]} or {"livestreams": [...]}
            streams = (
                data.get("data")
                or data.get("livestreams")
                or []
            )
            if not streams:
                break
            match = next(
                (s for s in streams
                 if (s.get("creator") or s.get("user") or {}).get("username") == ELI_USERNAME),
                None,
            )
            if match:
                return _normalize_v4_stream(match)
        except Exception as e:
            print(f"[WATCH] v4 error page {page}: {e}")
            break

    # ── GraphQL fallback ──────────────────────────────────────────────────
    for page in range(1, 9):
        try:
            resp = gql(
                f"{{ getLivestreams(page: {page}) {{"
                " slug title status live_at view_count image_url"
                " playback_url room_identifier"
                " creator {{ username name }}"
                " }} }}"
            )
            streams = (resp.get("data") or {}).get("getLivestreams") or []
            if not streams:
                break
            match = next(
                (s for s in streams
                 if (s.get("creator") or {}).get("username") == ELI_USERNAME
                 and s.get("status") == "live"),
                None,
            )
            if match:
                return match
        except Exception as e:
            print(f"[WATCH] GraphQL error page {page}: {e}")
            break

    return None


def fetch_stream_detail(slug):
    """
    Pull full stream detail from v4 — includes chat_room_id and extra fields
    not available from the list endpoint. Returns merged dict or original slug stub.
    """
    try:
        data = v4_get(f"/livestream/{slug}")
        # v4 shape: {"data": {...}} or the object directly
        detail = data.get("data") or data
        if isinstance(detail, dict) and detail.get("slug"):
            return _normalize_v4_stream(detail)
    except Exception as e:
        print(f"[STREAM] Detail fetch failed for {slug}: {e}")
    return {"slug": slug}


def _normalize_v4_stream(s):
    """Map v4 fields → our internal dict shape (same keys as GraphQL version)."""
    creator = s.get("creator") or s.get("user") or {}
    return {
        "slug":           s.get("slug") or s.get("id") or "",
        "title":          s.get("title") or s.get("name") or "",
        "status":         s.get("status") or "live",
        "live_at":        s.get("live_at") or s.get("created_at") or s.get("started_at") or "",
        "view_count":     s.get("view_count") or s.get("viewers") or 0,
        "image_url":      s.get("image_url") or s.get("thumbnail") or s.get("cover") or "",
        "playback_url":   s.get("playback_url") or s.get("hls_url") or s.get("stream_url") or "",
        "room_identifier":s.get("room_identifier") or s.get("room_id") or "",
        "chat_room_id":   s.get("chat_room_id") or s.get("chatroom_id") or s.get("chat_id") or "",
        "creator":        {"username": creator.get("username", ""), "name": creator.get("name", "")},
        # keep raw for debugging
        "_raw": s,
    }

# ── Probe mode — dump raw responses for all candidate chat endpoints ──────────
def probe_endpoints(slug, chat_room_id):
    """
    Called with --probe flag. Hits every candidate chat/gift endpoint and
    dumps the raw response so we can identify which one actually returns data.
    """
    print(f"\n[PROBE] slug={slug}  chat_room_id={chat_room_id or '(none)'}")
    print("─" * 60)

    candidates = [
        # v4 chat_room_id-based
        (HEADERS_V4,  f"{IDN_V4_URL}/chat-room/{chat_room_id}/messages"),
        (HEADERS_V4,  f"{IDN_V4_URL}/chat-room/{chat_room_id}/comments"),
        (HEADERS_V4,  f"{IDN_V4_URL}/chat-room/{chat_room_id}/chats"),
        # v4 slug-based
        (HEADERS_V4,  f"{IDN_V4_URL}/livestream/{slug}/comments"),
        (HEADERS_V4,  f"{IDN_V4_URL}/livestream/{slug}/chat"),
        (HEADERS_V4,  f"{IDN_V4_URL}/livestream/{slug}/messages"),
        # mobile API slug-based
        (HEADERS_V4,  f"{MOBILE_API}/v1/stream/{slug}/comment"),
        (HEADERS_V4,  f"{MOBILE_API}/v1/live/{slug}/comment"),
        (HEADERS_V4,  f"{MOBILE_API}/v2/stream/{slug}/comment"),
        # mobile API chat_room_id-based
        (HEADERS_V4,  f"{MOBILE_API}/v1/chat-room/{chat_room_id}/messages"),
    ]

    for headers, url in candidates:
        if not url or "(none)" in url:
            continue
        try:
            r = requests.get(url, headers=headers, timeout=8)
            snippet = r.text[:300].replace("\n", " ")
            print(f"  [{r.status_code}] {url}")
            if r.status_code == 200:
                print(f"         → {snippet}")
        except Exception as e:
            print(f"  [ERR ] {url} — {e}")

    print("\n[PROBE] Gift endpoints:")
    gift_candidates = [
        f"{IDN_V4_URL}/livestream/{slug}/gifts",
        f"{IDN_V4_URL}/chat-room/{chat_room_id}/gifts",
        f"{MOBILE_API}/v1/stream/{slug}/gift",
        f"{MOBILE_API}/v1/live/{slug}/gift",
    ]
    for url in gift_candidates:
        if not url or "(none)" in url:
            continue
        try:
            r = requests.get(url, headers=HEADERS_V4, timeout=8)
            snippet = r.text[:300].replace("\n", " ")
            print(f"  [{r.status_code}] {url}")
            if r.status_code == 200:
                print(f"         → {snippet}")
        except Exception as e:
            print(f"  [ERR ] {url} — {e}")

    print("─" * 60)

# ── Chat polling ──────────────────────────────────────────────────────────────
_chat_endpoint_confirmed = None

def fetch_comments(slug, chat_room_id=None, after_id=None):
    """
    Try endpoints in priority order, cache the first one that returns data.
    Priority: v4 chat_room_id → v4 slug → mobile API slug
    """
    global _chat_endpoint_confirmed

    params = {}
    if after_id:
        params["after_id"] = after_id
        params["latest_comment_id"] = after_id

    # Build candidate list — chat_room_id paths first if we have one
    candidates = []
    if chat_room_id:
        candidates += [
            (HEADERS_V4, f"{IDN_V4_URL}/chat-room/{chat_room_id}/messages",  params),
            (HEADERS_V4, f"{IDN_V4_URL}/chat-room/{chat_room_id}/comments",  params),
            (HEADERS_V4, f"{IDN_V4_URL}/chat-room/{chat_room_id}/chats",     params),
        ]
    candidates += [
        (HEADERS_V4, f"{IDN_V4_URL}/livestream/{slug}/comments",            params),
        (HEADERS_V4, f"{IDN_V4_URL}/livestream/{slug}/chat",                params),
        (HEADERS_V4, f"{MOBILE_API}/v1/stream/{slug}/comment",
            {**params, "sort": "newest", "page": 1}),
        (HEADERS_V4, f"{MOBILE_API}/v1/live/{slug}/comment",
            {**params, "sort": "newest", "page": 1}),
    ]

    # If already confirmed, jump straight to that endpoint
    if _chat_endpoint_confirmed:
        candidates = [c for c in candidates if _chat_endpoint_confirmed in c[1]]

    for headers, url, p in candidates:
        try:
            r = requests.get(url, headers=headers, params=p, timeout=10)
            if r.status_code != 200:
                continue
            body = r.json()
            comments = (
                (body.get("data") or {}).get("messages")
                or (body.get("data") or {}).get("comments")
                or (body.get("data") or {}).get("chats")
                or body.get("messages")
                or body.get("comments")
                or body.get("chats")
                or (body.get("data") if isinstance(body.get("data"), list) else None)
                or []
            )
            if comments:
                if _chat_endpoint_confirmed != url:
                    print(f"[CHAT] ✓ Endpoint confirmed: {url}")
                    _chat_endpoint_confirmed = url
                return comments
        except Exception:
            pass

    if not _chat_endpoint_confirmed:
        print(
            "[CHAT] ⚠️  No chat endpoint returned data yet. "
            "Run with --probe during a live stream to identify the correct path."
        )
    return []

# ── Gift polling ──────────────────────────────────────────────────────────────
_gift_endpoint_confirmed = None

def fetch_gifts(slug, chat_room_id=None):
    global _gift_endpoint_confirmed

    candidates = []
    if chat_room_id:
        candidates.append(f"{IDN_V4_URL}/chat-room/{chat_room_id}/gifts")
    candidates += [
        f"{IDN_V4_URL}/livestream/{slug}/gifts",
        f"{IDN_V4_URL}/livestream/{slug}/top-gifters",
        f"{MOBILE_API}/v1/stream/{slug}/gift",
        f"{MOBILE_API}/v1/live/{slug}/gift",
    ]

    if _gift_endpoint_confirmed:
        candidates = [c for c in candidates if c == _gift_endpoint_confirmed]

    for url in candidates:
        try:
            r = requests.get(url, headers=HEADERS_V4, timeout=10)
            if r.status_code != 200:
                continue
            body = r.json()
            gifts = (
                (body.get("data") or {}).get("gifts")
                or (body.get("data") or {}).get("top_gifters")
                or body.get("gifts")
                or body.get("top_gifters")
                or (body.get("data") if isinstance(body.get("data"), list) else None)
                or []
            )
            if gifts:
                if _gift_endpoint_confirmed != url:
                    print(f"[GIFT] ✓ Endpoint confirmed: {url}")
                    _gift_endpoint_confirmed = url
                return gifts
        except Exception:
            pass
    return []

# ── SRT helpers ───────────────────────────────────────────────────────────────
def ms_to_srt(ms):
    ms = max(0, int(ms))
    h, rem = divmod(ms // 1000, 3600)
    m, s   = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d},{ms % 1000:03d}"

def build_srt_entry(idx, start_ms, end_ms, author, message):
    safe = message.replace("<", "&lt;").replace(">", "&gt;")
    return f"{idx}\n{ms_to_srt(start_ms)} --> {ms_to_srt(end_ms)}\n<b>{author}</b>: {safe}\n\n"

def parse_ts(ts_str):
    """Parse ISO or Unix timestamp → epoch seconds, or None."""
    if not ts_str:
        return None
    try:
        return float(ts_str)
    except (TypeError, ValueError):
        pass
    try:
        return datetime.fromisoformat(str(ts_str).replace("Z", "+00:00")).timestamp()
    except Exception:
        return None

# ── Record session ────────────────────────────────────────────────────────────
def record_session(stream, dry_run=False, max_seconds=None, probe=False):
    slug          = stream["slug"]
    live_at       = stream.get("live_at") or datetime.now(timezone.utc).isoformat()
    origin_s      = parse_ts(live_at) or time.time()

    # Pull full detail to get chat_room_id (may not be in list response)
    detail        = fetch_stream_detail(slug)
    chat_room_id  = (
        detail.get("chat_room_id")
        or stream.get("chat_room_id")
        or ""
    )

    print(f"\n{'[DRY] ' if dry_run else ''}[REC] ── Session: {slug} ──────────────────")
    print(f"  Title:        {stream.get('title') or detail.get('title', '(no title)')}")
    print(f"  Live at:      {live_at}")
    print(f"  Playback:     {detail.get('playback_url') or stream.get('playback_url', '(none)')}")
    print(f"  chat_room_id: {chat_room_id or '(not found yet)'}")
    if max_seconds:
        print(f"  Time cap:     {max_seconds // 60} min")

    if probe:
        probe_endpoints(slug, chat_room_id)

    if dry_run:
        print("[DRY] Dry-run — no files written.")
        return

    srt_path     = os.path.join(ensure_dir("srt"),         f"{slug}.srt")
    gifts_path   = os.path.join(ensure_dir("top_gifters"), f"{slug}.json")
    session_path = os.path.join(ensure_dir("sessions"),    f"{slug}.json")

    session_meta = {
        "slug":           slug,
        "title":          detail.get("title") or stream.get("title"),
        "live_at":        live_at,
        "playback_url":   detail.get("playback_url") or stream.get("playback_url"),
        "image_url":      detail.get("image_url") or stream.get("image_url"),
        "room_identifier":detail.get("room_identifier") or stream.get("room_identifier"),
        "chat_room_id":   chat_room_id,
        "recorded_at":    datetime.now(timezone.utc).isoformat(),
    }
    with open(session_path, "w", encoding="utf-8") as f:
        json.dump(session_meta, f, ensure_ascii=False, indent=2)

    seen_ids      = set()
    srt_index     = 1
    gift_totals   = {}
    running       = True
    end_check_ct  = 0
    last_gift_t   = 0.0
    session_start = time.time()

    def stop(sig, frame):
        nonlocal running
        print("\n[REC] Interrupt — finalizing...")
        running = False

    signal.signal(signal.SIGINT,  stop)
    signal.signal(signal.SIGTERM, stop)

    with open(srt_path, "w", encoding="utf-8") as srt_f:
        while running:
            now = time.time()

            if max_seconds and (now - session_start) >= max_seconds:
                print(f"[REC] Time cap ({max_seconds // 60} min) reached — saving progress.")
                running = False
                continue

            # ── Chat ──────────────────────────────────────────────────────
            latest_id = max(seen_ids, default=None) if seen_ids else None
            comments  = fetch_comments(slug, chat_room_id=chat_room_id, after_id=latest_id)
            new_cmts  = [c for c in comments if c.get("id") not in seen_ids]
            new_cmts.sort(key=lambda c: parse_ts(c.get("created_at")) or 0)

            for c in new_cmts:
                cid     = c.get("id", "")
                seen_ids.add(cid)
                author  = (c.get("user") or {}).get("name") or "anon"
                message = c.get("message") or c.get("text") or c.get("content") or ""
                if not message:
                    continue
                ts_s     = parse_ts(c.get("created_at"))
                start_ms = int((ts_s - origin_s) * 1000) if ts_s else int((now - origin_s) * 1000)
                start_ms = max(0, start_ms)
                srt_f.write(build_srt_entry(srt_index, start_ms, start_ms + 4000, author, message))
                srt_f.flush()
                srt_index += 1

            if new_cmts:
                print(f"[CHAT] +{len(new_cmts)} (total {srt_index - 1})")

            # ── Gifts ─────────────────────────────────────────────────────
            if now - last_gift_t >= GIFT_POLL_SEC:
                last_gift_t = now
                for g in fetch_gifts(slug, chat_room_id=chat_room_id):
                    uname = (g.get("user") or {}).get("username") or "anon"
                    name  = (g.get("user") or {}).get("name") or uname
                    coins = (
                        g.get("coins")
                        or (g.get("gift") or {}).get("coins")
                        or g.get("price") or 0
                    )
                    if uname not in gift_totals:
                        gift_totals[uname] = {"name": name, "total_coins": 0, "count": 0}
                    gift_totals[uname]["total_coins"] += coins
                    gift_totals[uname]["count"] += 1
                if gift_totals:
                    print(f"[GIFT] {len(gift_totals)} unique gifters")

            # ── Check still live ──────────────────────────────────────────
            active = find_eli_stream()
            if active is None or active.get("slug") != slug:
                end_check_ct += 1
                print(f"[REC] Not detected ({end_check_ct}/{STREAM_END_CHECKS})...")
                if end_check_ct >= STREAM_END_CHECKS:
                    print("[REC] Stream ended — finalizing.")
                    running = False
            else:
                end_check_ct = 0

            if running:
                time.sleep(CHAT_POLL_SEC)

    # ── Save gifts ────────────────────────────────────────────────────────
    gifters_list = sorted(
        [{"username": u, **v} for u, v in gift_totals.items()],
        key=lambda x: x["total_coins"], reverse=True,
    )
    with open(gifts_path, "w", encoding="utf-8") as f:
        json.dump(
            {"slug": slug, "recorded_at": datetime.now(timezone.utc).isoformat(),
             "gifters": gifters_list},
            f, ensure_ascii=False, indent=2,
        )

    print(f"\n[REC] ✓ SRT      → {srt_path}  ({srt_index - 1} lines)")
    print(f"[REC] ✓ Gifters  → {gifts_path}  ({len(gifters_list)} unique)")
    print(f"[REC] ✓ Session  → {session_path}")

# ── Entry point ───────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="Armeniaca IDN Live recorder")
    ap.add_argument("--slug",        help="Force-record a specific stream slug")
    ap.add_argument("--dry-run",     action="store_true")
    ap.add_argument("--probe",       action="store_true",
                    help="Dump raw responses from all candidate endpoints (run during a live stream)")
    ap.add_argument("--ci-mode",     action="store_true",
                    help="Exit immediately if not live (GitHub Actions)")
    ap.add_argument("--max-minutes", type=int, default=0)
    args = ap.parse_args()

    max_seconds = args.max_minutes * 60 if args.max_minutes > 0 else None

    def run(stream):
        global _chat_endpoint_confirmed, _gift_endpoint_confirmed
        _chat_endpoint_confirmed = None
        _gift_endpoint_confirmed = None
        record_session(stream, dry_run=args.dry_run,
                       max_seconds=max_seconds, probe=args.probe)

    if args.slug:
        run({"slug": args.slug, "live_at": datetime.now(timezone.utc).isoformat()})
        return

    if args.ci_mode:
        print(f"[CI] Checking {ELI_USERNAME}...")
        stream = find_eli_stream()
        if not stream:
            print("[CI] Not live — exiting.")
            sys.exit(0)
        print(f"[CI] 🔴 LIVE — {stream['slug']}")
        run(stream)
        return

    # Watch mode
    print(f"[WATCH] Polling every {WATCH_SEC}s for {ELI_USERNAME}... (Ctrl+C to stop)")
    try:
        while True:
            stream = find_eli_stream()
            if stream:
                print(f"\n[WATCH] 🔴 LIVE — {stream['slug']}")
                run(stream)
                print(f"[WATCH] Done. Resuming in {WATCH_SEC}s...")
            else:
                print(f"[WATCH] {datetime.now().strftime('%H:%M:%S')} — not live.")
            time.sleep(WATCH_SEC)
    except KeyboardInterrupt:
        print("\n[WATCH] Stopped.")
        sys.exit(0)


if __name__ == "__main__":
    main()
