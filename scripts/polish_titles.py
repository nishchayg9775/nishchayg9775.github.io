# -*- coding: utf-8 -*-
"""
Display-title polish for gallery items. Filenames arrive as export noise
("Artboard 1 Copy", "post@2x", trailing version numbers); visitors should
see curated captions instead.

Used two ways:
  - imported by build_gallery.py, applied to every generated title
  - run directly to rewrite js/gallery-data.js in place:  python scripts/polish_titles.py
"""
import json
import pathlib
import re
import sys

# item id -> final display title, for names no rule can rescue.
# Keyed by id (not filename) so a re-run of build_gallery.py stays stable.
OVERRIDES = {
    "new-work-6-social-media-post-why-choose-xbancer2x": "Why Choose XBancer",
    "new-work-7-d1-3":            "Payomatix Makar Sankranti Post",
    "new-work-artboard-1-copy":   "Payomatix Checkmate Your Payment Challenges",
    "new-work-artboard-12x":      "XBancer Cross-Border Payments",
    "new-work-artboard-2":        "Payomatix Makar Sankranti (Hindi Type)",
    "new-work-artboard-2-315x":   "XBancer Cross-Border Payments 2",
    "new-work-artboard-415x":     "XBancer Canada Payment Industry",
    "new-work-partnership":       "Payomatix Infrastructure You Can Build On",
    "festivals-d1-3":             "Makar Sankranti Social Media Creative",
    "festivals-lohri-d2":         "Payomatix Happy Lohri",
    "festivals-social-media-post-4": "Republic Day Creative",
    "festivals-vote-creative":    "Vote India · General Election 2024",
    "festivals-book-lovers-day-pd-creative": "Book Lovers Day Creative",
    "thumbnails-yt-thumbnail-11": "Security Categories In India",
    "thumbnails-yt-thumbnail-8":  "Shankaracharyas Skipped The Ram Mandir Inauguration",
    "flyers-feedback-form-3-02":  "Feedback QR Flyer",
    "decks-payomatix-baas-deck-compressed": "Payomatix BaaS Deck",
    "decks-transforming-fintech-partnerships-beyond-payments-1":
        "Transforming Fintech Partnerships Beyond Payments",
}

# misspellings and brand casing, applied per word (case-insensitive)
WORD_FIXES = {
    "hocky": "Hockey",
    "congragulation": "Congratulations",
    "perfomances": "Performances",
    "mediapost": "Media Post",
    "virua": "Virus",
    "whitle": "White",
    "earthday": "Earth Day",
    "icse": "ICSE",
    "aids": "AIDS",
    "baas": "BaaS",
    "ii": "II",
    "iii": "III",
}

def polish_title(item_id: str, title: str) -> str:
    if item_id in OVERRIDES:
        return OVERRIDES[item_id]

    t = title

    # "1. Payomatix ..." ordering prefixes from the New Work folder
    t = re.sub(r"^\d+\.\s+", "", t)

    # export-scale suffixes: @2x, @3x@3x@3x, @1.5x (with or without space)
    t = re.sub(r"\s*@\d+(?:\.\d+)?x", "", t, flags=re.I)

    # trailing "Copy" / "Final" export leftovers
    t = re.sub(r"(\s+(copy|final))+$", "", t, flags=re.I)

    # trailing zero-padded version numbers: " 01", " 2 03" -> keep real variant
    # numbers ("Diwali Creative 3") but drop zero-padded export counters
    while re.search(r"\s0\d$", t):
        t = re.sub(r"\s0\d$", "", t)

    # word-level typo / casing fixes
    words = t.split(" ")
    words = [WORD_FIXES.get(w.lower(), w) for w in words]
    t = " ".join(words)

    # possessives: "Doctor S Day" / "Mothers Day" -> "Doctor's Day" / "Mother's Day"
    t = re.sub(r"\b(Mother|Father|Teacher|Doctor|Valentine)s (Day)\b", r"\1's \2", t)
    t = re.sub(r"\b([A-Z][a-z]+) S (Day)\b", r"\1's \2", t)

    t = re.sub(r"\s{2,}", " ", t).strip(" .-")
    return t or title


def rewrite_manifest(path: pathlib.Path) -> int:
    src = path.read_text(encoding="utf-8")
    start, end = src.index("{"), src.rindex(";")
    data = json.loads(src[start:end])
    changed = 0
    for item in data["items"]:
        new = polish_title(item["id"], item["title"])
        if new != item["title"]:
            print(f'  {item["title"]!r} -> {new!r}')
            item["title"] = new
            changed += 1
    out = src[:start] + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    path.write_text(out, encoding="utf-8")
    return changed


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    manifest = pathlib.Path(__file__).resolve().parents[1] / "js" / "gallery-data.js"
    n = rewrite_manifest(manifest)
    print(f"\npolished {n} titles in {manifest.name}")
