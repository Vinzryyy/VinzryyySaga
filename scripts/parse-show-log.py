"""
Parse the manual show log into structured JSON.

Source: scripts/eli-show-log.tsv (9-column TSV: NO / HARI / TANGGAL /
SETLIST / UNIT SONG / POSITION / PARTNER / LINEUP / NOTE).

Output: public/data/eli-show-log.json — consumed by the SetlistGrid
and ShowLog components on /schedule. Re-run whenever the TSV is
updated:

  $ python scripts/parse-show-log.py
"""

import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent.parent
TSV_PATH = ROOT / "scripts" / "eli-show-log.tsv"
OUTPUT_PATH = ROOT / "public" / "data" / "eli-show-log.json"


def parse_date(s):
    """DD/MM/YYYY -> ISO YYYY-MM-DD. Returns None on bad input."""
    s = (s or "").strip()
    if not s:
        return None
    try:
        d, m, y = s.split("/")
        return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
    except ValueError:
        return None


def clean(s):
    """Trim + treat empty/dash-only cells as None."""
    s = (s or "").strip()
    if s in ("", "-"):
        return None
    return s


def main():
    if not TSV_PATH.exists():
        print(f"ERROR: {TSV_PATH} not found", file=sys.stderr)
        sys.exit(1)

    rows = []
    with TSV_PATH.open(encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        header = next(reader, None)
        for raw in reader:
            # Pad to 9 cols so missing trailing tabs don't crash indexing
            cells = list(raw) + [""] * (9 - len(raw))
            no = clean(cells[0])
            day = clean(cells[1])
            iso = parse_date(cells[2])
            setlist = clean(cells[3])
            if not no or not iso or not setlist:
                continue
            rows.append({
                "no": int(no),
                "day": day,
                "date": iso,
                "setlist": setlist,
                "unitSong": clean(cells[4]),
                "position": clean(cells[5]),
                "partner": clean(cells[6]),
                "lineup": clean(cells[7]),
                "note": clean(cells[8]),
            })

    rows.sort(key=lambda r: (r["date"], r["no"]))

    # Aggregates the frontend would otherwise re-derive on every load
    setlist_counts = defaultdict(int)
    setlist_first = {}
    setlist_last = {}
    setlist_units = defaultdict(lambda: defaultdict(int))
    setlist_centers = defaultdict(int)  # how many shows Eli was Center per setlist
    for r in rows:
        sl = r["setlist"]
        setlist_counts[sl] += 1
        if sl not in setlist_first or r["date"] < setlist_first[sl]:
            setlist_first[sl] = r["date"]
        if sl not in setlist_last or r["date"] > setlist_last[sl]:
            setlist_last[sl] = r["date"]
        if r["unitSong"]:
            setlist_units[sl][r["unitSong"]] += 1
        if r["position"] and r["position"].lower().startswith("center"):
            setlist_centers[sl] += 1

    setlists = []
    for sl, count in sorted(setlist_counts.items(), key=lambda kv: -kv[1]):
        unit_breakdown = sorted(
            setlist_units[sl].items(), key=lambda kv: -kv[1]
        )
        setlists.append({
            "setlist": sl,
            "count": count,
            "centerCount": setlist_centers[sl],
            "firstDate": setlist_first[sl],
            "lastDate": setlist_last[sl],
            "units": [{"name": u, "count": c} for u, c in unit_breakdown],
        })

    # Career totals derived in one pass so the frontend can show them
    # without re-iterating the full row list.
    centers = sum(1 for r in rows if r["position"] and r["position"].lower().startswith("center"))
    solos = sum(1 for r in rows if r["position"] and r["position"].lower().startswith("solo"))
    duos = sum(1 for r in rows if r["position"] and r["position"].lower().startswith("duo"))

    payload = {
        "source": "Manual show log",
        "totalShows": len(rows),
        "asOfDate": rows[-1]["date"] if rows else None,
        "totals": {
            "centers": centers,
            "solos": solos,
            "duos": duos,
        },
        "setlists": setlists,
        "shows": rows,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(f"Parsed {len(rows)} shows")
    print(f"  {len(setlists)} unique setlists")
    print(f"  {centers} center shows · {solos} solo · {duos} duo")
    print(f"  asOf: {payload['asOfDate']}")
    print(f"  wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
