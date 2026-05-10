#!/usr/bin/env python3
"""Scan photos/ and produce photos/manifest.json.

Convention:
  photos/weilinhe.jpg              -> avatar
  photos/<YYYY.M.D>/*.jpg          -> a session (photos sorted by filename)
  photos/baseline/*.jpg            -> optional explicit baseline override
  photos/<anything>/_label.txt     -> optional one-line note for that session

The earliest dated session is treated as the baseline unless a folder named
"baseline" exists.

Run locally:
    python3 scripts/build_manifest.py

CI runs it automatically before the GitHub Pages deploy.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS_DIR = os.path.join(ROOT, "photos")
MANIFEST_PATH = os.path.join(PHOTOS_DIR, "manifest.json")
IMG_EXT = (".jpg", ".jpeg", ".png", ".webp")
DATE_RE = re.compile(r"^(\d{4})[.\-_](\d{1,2})[.\-_](\d{1,2})$")


def list_images(folder):
    return sorted(
        f for f in os.listdir(folder)
        if not f.startswith(".") and f.lower().endswith(IMG_EXT)
    )


def read_label(folder):
    p = os.path.join(folder, "_label.txt")
    if os.path.isfile(p):
        with open(p, encoding="utf-8") as f:
            return f.readline().strip()
    return ""


def session_key(s):
    m = DATE_RE.match(s["date"])
    if m:
        return tuple(int(x) for x in m.groups())
    return (0, 0, 0)


def main():
    if not os.path.isdir(PHOTOS_DIR):
        print("photos/ does not exist — nothing to build")
        return 0

    avatar = "photos/weilinhe.jpg" if os.path.isfile(
        os.path.join(PHOTOS_DIR, "weilinhe.jpg")
    ) else None

    sessions = []
    explicit_baseline = None

    for entry in sorted(os.listdir(PHOTOS_DIR)):
        full = os.path.join(PHOTOS_DIR, entry)
        if not os.path.isdir(full):
            continue
        photos = list_images(full)
        if not photos:
            continue
        record = {
            "date": entry,
            "label": read_label(full),
            "photos": [f"photos/{entry}/{p}" for p in photos],
        }
        if entry == "baseline":
            explicit_baseline = record
        elif DATE_RE.match(entry):
            sessions.append(record)
        else:
            # Skip non-date folders silently
            pass

    sessions.sort(key=session_key)

    if explicit_baseline is None and sessions:
        baseline = sessions.pop(0)
    else:
        baseline = explicit_baseline

    # Weekly progress = remaining sessions, newest first
    sessions.sort(key=session_key, reverse=True)

    manifest = {
        "avatar": avatar,
        "baseline": baseline,
        "weekly": sessions,
    }

    os.makedirs(PHOTOS_DIR, exist_ok=True)
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"manifest written: avatar={'yes' if avatar else 'no'}, "
          f"baseline={'yes' if baseline else 'no'}, "
          f"weekly={len(sessions)} session(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
