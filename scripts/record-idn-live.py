"""
record-idn-live.py — Armeniaca IDN Live recorder for Helisma Putri (jkt48_eli)

Chat via WebSocket IRC (wss://chat.idn.app), gifts via HTTP polling.

Protocol (from ikhbaldwiyan/showroom CommentIDN.jsx):
  1. Connect  wss://chat.idn.app
  2. NICK     idn-{uuid8}-{unix_ts}
  3. USER     idn-{uuid8}-{unix_ts} 0 * null
  4. Wait for server :001 (registered)
  5. JOIN     #{chat_room_id}
  6. Parse    PRIVMSG #{ch} :{json}
     json = { user:{name,username,avatar_url}, chat:{message}, timestamp }

chat_room_id comes from IDN API v4:
  GET https://api.idn.app/api/v4/livestream/{slug}
  Header: x-api-key: 123f4c4e-6ce1-404d-8786-d17e46d65b5c

Outputs:
  public/data/idn-replay/srt/{slug}.srt
  public/data/idn-replay/top_gifters/{slug}.json
  public/data/idn-replay/sessions/{slug}.json

Usage:
  python scripts/record-idn-live.py                        # watch + auto-record
  python scripts/record-idn-live.py --slug <slug>          # force a specific slug
  python scripts/record-idn-live.py --ci-mode              # GitHub Actions mode
  python scripts/record-idn-live.py --probe --slug <slug>  # probe gift endpoints
  python scripts/record-idn-live.py --dry-run              # no file writes

Requirements: pip install -r scripts/requirements.txt
"""

import argparse
import json
import os
import queue
import signal
import sys
import threading
import time
import uuid
from datetime import datetime, timezone

import requests
import websocket  # websocket-client

# ── Config ────────────────────────────────────────────────────────────────────
IDN_V4_URL   = "https://api.idn.app/api/v4"
IDN_API_KEY  = "123f4c4e-6ce1-404d-8786-d17e46d65b5c"
GRAPHQL_URL  = "https://api.idn.app/graphql"
MOBILE_API   = "https://mobile-api.idn.app"
CHAT_WS_URL  = "wss://chat.idn.app"
ELI_USERNAME = "jkt48_eli"

GIFT_POLL_SEC     = 10
WATCH_SEC         = 30
STREAM_END_CHECKS = 3   # consecutive misses before declaring stream ended
WS_RECONNECT_SEC  = 5   # wait before reconnecting on WS drop

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
    r = requests.get(IDN_V4_URL + path, params=params, headers=HEADERS_V4, timeout=15)
    r.raise_for_status()
    return r.json()

def gql(query):
    r = requests.post(GRAPHQL_URL, json={"query": query}, headers=HEADERS_GQL, timeout=15)
    r.raise_for_status()
    return r.json()

# ── Stream detection ──────────────────────────────────────────────────────────
def find_eli_stream():
    """v4 REST primary → GraphQL fallback. Returns normalized dict or None."""
    for page in range(1, 9):
        try:
            data    = v4_get("/livestreams", params={"category": "all", "page": page})
            streams = data.get("data") or data.get("livestreams") or []
            if not streams:
                break
            match = next(
                (s for s in streams
                 if (s.get("creator") or s.get("user") or {}).get("username") == ELI_USERNAME),
                None,
            )
            if match:
                return _normalize_v4(match)
        except Exception as e:
            print(f"[WATCH] v4 error p{page}: {e}")
            break

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
            print(f"[WATCH] GQL error p{page}: {e}")
            break

    return None


def fetch_stream_detail(slug):
    """Pull full v4 detail to get chat_room_id. Returns normalized dict."""
    try:
        data   = v4_get(f"/livestream/{slug}")
        detail = data.get("data") or data
        if isinstance(detail, dict) and detail.get("slug"):
            return _normalize_v4(detail)
    except Exception as e:
        print(f"[STREAM] Detail fetch failed: {e}")
    return {"slug": slug}


def _normalize_v4(s):
    creator = s.get("creator") or s.get("user") or {}
    return {
        "slug":            s.get("slug") or s.get("id") or "",
        "title":           s.get("title") or s.get("name") or "",
        "live_at":         s.get("live_at") or s.get("created_at") or s.get("started_at") or "",
        "view_count":      s.get("view_count") or s.get("viewers") or 0,
        "image_url":       s.get("image_url") or s.get("thumbnail") or s.get("cover") or "",
        "playback_url":    s.get("playback_url") or s.get("hls_url") or s.get("stream_url") or "",
        "room_identifier": s.get("room_identifier") or s.get("room_id") or "",
        "chat_room_id":    s.get("chat_room_id") or s.get("chatroom_id") or s.get("chat_id") or "",
        "creator":         {"username": creator.get("username", ""), "name": creator.get("name", "")},
    }

# ── WebSocket IRC chat client ─────────────────────────────────────────────────
class IRCChatClient:
    """
    Connects to wss://chat.idn.app using IRC protocol, joins #{chat_room_id},
    and puts parsed chat dicts into `msg_queue`.

    Thread-safe: runs in a daemon thread, main loop drains the queue.
    Auto-reconnects on unexpected close while `self.active` is True.
    """

    def __init__(self, chat_room_id, msg_queue):
        self.chat_room_id = chat_room_id
        self.queue        = msg_queue
        self.active       = False
        self._ws          = None
        self._thread      = None
        self._nick        = self._make_nick()

    @staticmethod
    def _make_nick():
        uid = uuid.uuid4().hex[:8]
        return f"idn-{uid}-{int(time.time())}"

    # ── IRC handlers ──────────────────────────────────────────────────────
    def _on_open(self, ws):
        print(f"[WS] Connected → {CHAT_WS_URL}")
        ws.send(f"NICK {self._nick}")
        ws.send(f"USER {self._nick} 0 * null")

    def _on_message(self, ws, raw):
        # IRC PING keepalive
        if raw.startswith("PING"):
            ws.send("PONG " + raw[5:].strip())
            return

        # 001 = server confirmed registration → join room
        if " 001 " in raw:
            ws.send(f"JOIN #{self.chat_room_id}")
            print(f"[WS] Joined #{self.chat_room_id}")
            return

        # PRIVMSG carries the chat payload
        if "PRIVMSG" not in raw:
            return
        try:
            # :nick!user@host PRIVMSG #channel :{json}
            colon_idx = raw.index(":", raw.index("PRIVMSG"))
            data      = json.loads(raw[colon_idx + 1:])
            # Normalise into our internal shape
            user    = data.get("user") or {}
            chat    = data.get("chat") or {}
            message = chat.get("message") or data.get("message") or ""
            if not message:
                return
            self.queue.put({
                "id":         data.get("id") or f"{time.time():.3f}",
                "message":    message,
                "created_at": data.get("timestamp") or data.get("created_at") or "",
                "user": {
                    "name":     user.get("name") or user.get("username") or "anon",
                    "username": user.get("username") or "",
                },
            })
        except Exception:
            pass

    def _on_error(self, ws, error):
        print(f"[WS] Error: {error}")

    def _on_close(self, ws, code, msg):
        print(f"[WS] Closed ({code}): {msg}")
        # Reconnect loop — keep retrying while the session is active
        if self.active:
            print(f"[WS] Reconnecting in {WS_RECONNECT_SEC}s...")
            time.sleep(WS_RECONNECT_SEC)
            if self.active:
                self._connect()

    # ── Lifecycle ─────────────────────────────────────────────────────────
    def _connect(self):
        self._nick = self._make_nick()   # fresh nick on every (re)connect
        self._ws   = websocket.WebSocketApp(
            CHAT_WS_URL,
            on_open=self._on_open,
            on_message=self._on_message,
            on_error=self._on_error,
            on_close=self._on_close,
        )
        self._ws.run_forever(ping_interval=30, ping_timeout=10)

    def start(self):
        self.active  = True
        self._thread = threading.Thread(target=self._connect, daemon=True)
        self._thread.start()
        print(f"[WS] IRC client started (nick={self._nick})")

    def stop(self):
        self.active = False
        if self._ws:
            self._ws.close()

# ── Gift polling (HTTP) ───────────────────────────────────────────────────────
_gift_endpoint_ok = None

def fetch_gifts(slug, chat_room_id=None):
    global _gift_endpoint_ok
    candidates = []
    if chat_room_id:
        candidates += [
            f"{IDN_V4_URL}/chat-room/{chat_room_id}/gifts",
            f"{IDN_V4_URL}/chat-room/{chat_room_id}/top-gifters",
        ]
    candidates += [
        f"{IDN_V4_URL}/livestream/{slug}/gifts",
        f"{IDN_V4_URL}/livestream/{slug}/top-gifters",
        f"{MOBILE_API}/v1/stream/{slug}/gift",
        f"{MOBILE_API}/v1/live/{slug}/gift",
    ]
    if _gift_endpoint_ok:
        candidates = [c for c in candidates if c == _gift_endpoint_ok]

    for url in candidates:
        try:
            r = requests.get(url, headers=HEADERS_V4, timeout=10)
            if r.status_code != 200:
                continue
            body  = r.json()
            gifts = (
                (body.get("data") or {}).get("gifts")
                or (body.get("data") or {}).get("top_gifters")
                or body.get("gifts") or body.get("top_gifters")
                or (body.get("data") if isinstance(body.get("data"), list) else None)
                or []
            )
            if gifts:
                if _gift_endpoint_ok != url:
                    print(f"[GIFT] ✓ Endpoint: {url}")
                    _gift_endpoint_ok = url
                return gifts
        except Exception:
            pass
    return []

# ── Probe gift endpoints ──────────────────────────────────────────────────────
def probe_gifts(slug, chat_room_id):
    print(f"\n[PROBE] slug={slug}  chat_room_id={chat_room_id or '(none)'}")
    print("─" * 60)
    candidates = []
    if chat_room_id:
        candidates += [
            f"{IDN_V4_URL}/chat-room/{chat_room_id}/gifts",
            f"{IDN_V4_URL}/chat-room/{chat_room_id}/top-gifters",
        ]
    candidates += [
        f"{IDN_V4_URL}/livestream/{slug}/gifts",
        f"{IDN_V4_URL}/livestream/{slug}/top-gifters",
        f"{MOBILE_API}/v1/stream/{slug}/gift",
        f"{MOBILE_API}/v1/live/{slug}/gift",
    ]
    for url in candidates:
        try:
            r = requests.get(url, headers=HEADERS_V4, timeout=8)
            snippet = r.text[:300].replace("\n", " ")
            print(f"  [{r.status_code}] {url}")
            if r.status_code == 200:
                print(f"         → {snippet}")
        except Exception as e:
            print(f"  [ERR ] {url} — {e}")
    print("─" * 60)

# ── SRT helpers ───────────────────────────────────────────────────────────────
def ms_to_srt(ms):
    ms = max(0, int(ms))
    h, rem = divmod(ms // 1000, 3600)
    m, s   = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d},{ms % 1000:03d}"

def srt_entry(idx, start_ms, end_ms, author, message):
    safe = message.replace("<", "&lt;").replace(">", "&gt;")
    return f"{idx}\n{ms_to_srt(start_ms)} --> {ms_to_srt(end_ms)}\n<b>{author}</b>: {safe}\n\n"

def parse_ts(ts_str):
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
    slug         = stream["slug"]
    live_at      = stream.get("live_at") or datetime.now(timezone.utc).isoformat()
    origin_s     = parse_ts(live_at) or time.time()

    detail       = fetch_stream_detail(slug)
    chat_room_id = detail.get("chat_room_id") or stream.get("chat_room_id") or ""

    print(f"\n{'[DRY] ' if dry_run else ''}[REC] ── {slug} ──────────────────────────")
    print(f"  Title:        {detail.get('title') or stream.get('title', '(no title)')}")
    print(f"  Live at:      {live_at}")
    print(f"  Playback:     {detail.get('playback_url') or stream.get('playback_url', '(none)')}")
    print(f"  chat_room_id: {chat_room_id or '⚠️  not found — WS will not connect'}")
    if max_seconds:
        print(f"  Time cap:     {max_seconds // 60} min")

    if probe:
        probe_gifts(slug, chat_room_id)

    if dry_run:
        print("[DRY] No files written.")
        return

    if not chat_room_id:
        print("[REC] ⚠️  No chat_room_id — cannot open WebSocket. Aborting.")
        return

    srt_path     = os.path.join(ensure_dir("srt"),         f"{slug}.srt")
    gifts_path   = os.path.join(ensure_dir("top_gifters"), f"{slug}.json")
    session_path = os.path.join(ensure_dir("sessions"),    f"{slug}.json")

    with open(session_path, "w", encoding="utf-8") as f:
        json.dump({
            "slug":            slug,
            "title":           detail.get("title") or stream.get("title"),
            "live_at":         live_at,
            "playback_url":    detail.get("playback_url") or stream.get("playback_url"),
            "image_url":       detail.get("image_url") or stream.get("image_url"),
            "room_identifier": detail.get("room_identifier") or stream.get("room_identifier"),
            "chat_room_id":    chat_room_id,
            "recorded_at":     datetime.now(timezone.utc).isoformat(),
        }, f, ensure_ascii=False, indent=2)

    msg_queue     = queue.Queue()
    ws_client     = IRCChatClient(chat_room_id, msg_queue)
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

    ws_client.start()

    with open(srt_path, "w", encoding="utf-8") as srt_f:
        while running:
            now = time.time()

            # ── Time cap ──────────────────────────────────────────────────
            if max_seconds and (now - session_start) >= max_seconds:
                print(f"[REC] Time cap ({max_seconds // 60} min) — saving progress.")
                running = False
                continue

            # ── Drain WebSocket message queue ─────────────────────────────
            new_count = 0
            while not msg_queue.empty():
                try:
                    c   = msg_queue.get_nowait()
                    cid = c.get("id", "")
                    if cid in seen_ids:
                        continue
                    seen_ids.add(cid)

                    author  = (c.get("user") or {}).get("name") or "anon"
                    message = c.get("message") or ""
                    if not message:
                        continue

                    ts_s     = parse_ts(c.get("created_at"))
                    start_ms = int((ts_s - origin_s) * 1000) if ts_s else int((now - origin_s) * 1000)
                    start_ms = max(0, start_ms)

                    srt_f.write(srt_entry(srt_index, start_ms, start_ms + 4000, author, message))
                    srt_f.flush()
                    srt_index += 1
                    new_count += 1
                except queue.Empty:
                    break

            if new_count:
                print(f"[CHAT] +{new_count} (total {srt_index - 1})")

            # ── Gift polling ──────────────────────────────────────────────
            if now - last_gift_t >= GIFT_POLL_SEC:
                last_gift_t = now
                for g in fetch_gifts(slug, chat_room_id=chat_room_id):
                    uname = (g.get("user") or {}).get("username") or "anon"
                    name  = (g.get("user") or {}).get("name") or uname
                    coins = (
                        g.get("coins") or (g.get("gift") or {}).get("coins") or g.get("price") or 0
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
                    print("[REC] Stream ended.")
                    running = False
            else:
                end_check_ct = 0

            if running:
                time.sleep(1)   # tight loop — WS pushes messages, no need to sleep long

    ws_client.stop()

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

    print(f"\n[REC] ✓ SRT     → {srt_path}  ({srt_index - 1} lines)")
    print(f"[REC] ✓ Gifters → {gifts_path}  ({len(gifters_list)} unique)")
    print(f"[REC] ✓ Session → {session_path}")

# ── Entry point ───────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="Armeniaca IDN Live recorder (WebSocket IRC)")
    ap.add_argument("--slug",        help="Force-record a specific stream slug")
    ap.add_argument("--dry-run",     action="store_true")
    ap.add_argument("--probe",       action="store_true",
                    help="Probe gift HTTP endpoints and exit (run during a live stream)")
    ap.add_argument("--ci-mode",     action="store_true",
                    help="Exit immediately if Eli is not live (GitHub Actions)")
    ap.add_argument("--max-minutes", type=int, default=0,
                    help="Stop after N minutes (0 = unlimited)")
    args = ap.parse_args()

    max_seconds = args.max_minutes * 60 if args.max_minutes > 0 else None

    def run(stream):
        global _gift_endpoint_ok
        _gift_endpoint_ok = None
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
