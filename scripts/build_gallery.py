# -*- coding: utf-8 -*-
"""
Scans Test/Portfolio, converts PDFs (all pages) and HEIC to web JPGs in
Test/assets/gallery/, and emits Test/js/gallery-data.js listing EVERY item
category-wise. Idempotent: skips already-rendered pages.
"""
import json
import re
import sys
import pathlib

import fitz  # PyMuPDF
from PIL import Image, ImageOps
import pillow_heif

# Windows consoles default to cp1252; portfolio filenames include Devanagari
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

pillow_heif.register_heif_opener()
Image.MAX_IMAGE_PIXELS = None  # we trust our own portfolio files

ROOT = pathlib.Path(__file__).resolve().parents[1]
PORT = ROOT / "Portfolio"
OUT = ROOT / "assets" / "gallery"
OUT.mkdir(parents=True, exist_ok=True)

PDF_TARGET = 1600   # max px of longest side for rendered PDF pages
JPG_QUALITY = 80

# folder name -> (key, label); order here = filter order on the site
CATEGORIES = [
    ("1. New Work",                      ("new-work",   "New Work")),
    ("2. New AI Ad Campaign",            ("ai-ads",     "AI Ad Campaigns")),
    ("carousel",                         ("carousels",  "Carousels & Case Studies")),
    ("Decks",                            ("decks",      "Decks & Presentations")),
    ("Social Media Posts",               ("social",     "Social Media Posts")),
    ("Festivals or Important Days Posts",("festivals",  "Festival & Moment Posts")),
    ("YouTube Thumbnails",               ("thumbnails", "YouTube Thumbnails")),
    ("Website Banners",                  ("banners",    "Website Banners")),
    ("Flyers And Poster",                ("flyers",     "Flyers & Posters")),
    ("3. Interior And Real-estate",      ("interior",   "Interior & Real Estate")),
]
CAT_MAP = dict(CATEGORIES)

IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def slugify(s: str) -> str:
    s = re.sub(r"[^\w\s-]", "", s, flags=re.ASCII).strip().lower()
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-") or "item"


def clean_title(stem: str) -> str:
    t = re.sub(r"[_\-]+", " ", stem)
    t = re.sub(r"\s+", " ", t).strip()
    # drop redundant per-category prefixes
    for pre in ("yt thumbnail", "web banner", "website banner"):
        if t.lower().startswith(pre):
            t = t[len(pre):].strip(" .")
            break
    if not t:
        t = stem
    # title-case pure-ascii lowercase words, leave mixed case / non-latin alone
    words = [w.capitalize() if w.isascii() and w.islower() else w for w in t.split(" ")]
    return " ".join(words)


def rel_url(p: pathlib.Path) -> str:
    return p.relative_to(ROOT).as_posix()


def img_dims(p: pathlib.Path):
    with Image.open(p) as im:
        im = ImageOps.exif_transpose(im)
        return im.width, im.height


OPT_MAX_DIM = 2400   # beyond this, browsers pay decode cost for nothing
OPT_MAX_MB = 0.8     # originals above this get re-encoded instead of copied
OPT_TARGET = 2000

THUMB_TARGET = 640   # rail cards render near 320px; enough for 2x DPR
THUMB_QUALITY = 72


def flatten_rgb(im: Image.Image) -> Image.Image:
    if im.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im.convert("RGBA"), mask=im.convert("RGBA").split()[-1])
        return bg
    return im.convert("RGB")


def make_thumb(src: pathlib.Path, item_id: str):
    """Small JPEG for the gallery rails; the lightbox keeps the full-size
    asset. Returns [url, w, h] or None when the original is already small
    (or an animated GIF, which the rails reuse as-is)."""
    if src.suffix.lower() == ".gif":
        return None
    w, h = img_dims(src)
    if max(w, h) <= THUMB_TARGET:
        return None
    tdir = OUT / "thumb"
    tdir.mkdir(parents=True, exist_ok=True)
    dst = tdir / f"{item_id}.jpg"
    if not dst.exists():
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im)
            im.thumbnail((THUMB_TARGET, THUMB_TARGET), Image.LANCZOS)
            flatten_rgb(im).save(dst, "JPEG", quality=THUMB_QUALITY, optimize=True)
    tw, th = img_dims(dst)
    return [rel_url(dst), tw, th]


def publish_image(src: pathlib.Path, item_id: str):
    """Every referenced image gets a web copy under assets/gallery/img/ so a
    deployment never needs the Portfolio source tree. Small originals are
    byte-copied (lossless); big ones are downscaled/re-encoded. Never crop."""
    w, h = img_dims(src)
    mb = src.stat().st_size / 1048576
    img_dir = OUT / "img"
    img_dir.mkdir(parents=True, exist_ok=True)

    # GIFs keep animation; small files keep original bytes and format
    if src.suffix.lower() == ".gif" or (max(w, h) <= OPT_MAX_DIM and mb <= OPT_MAX_MB):
        dst = img_dir / f"{item_id}{src.suffix.lower()}"
        if not dst.exists():
            dst.write_bytes(src.read_bytes())
        return dst, w, h

    dst = img_dir / f"{item_id}.jpg"
    if not dst.exists():
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im)
            im.thumbnail((OPT_TARGET, OPT_TARGET), Image.LANCZOS)
            if im.mode in ("RGBA", "LA", "P"):
                bg = Image.new("RGB", im.size, (255, 255, 255))
                bg.paste(im.convert("RGBA"), mask=im.convert("RGBA").split()[-1])
                im = bg
            else:
                im = im.convert("RGB")
            im.save(dst, "JPEG", quality=85, optimize=True)
        print(f"  optimized: {src.name} {w}x{h} ({mb:.1f}MB) -> {im.width}x{im.height}", flush=True)
    ow, oh = img_dims(dst)
    return dst, ow, oh


def convert_heic(src: pathlib.Path, dst: pathlib.Path):
    if dst.exists():
        return
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        if max(im.size) > 2000:
            im.thumbnail((2000, 2000), Image.LANCZOS)
        im.convert("RGB").save(dst, "JPEG", quality=85, optimize=True)


def render_pdf(src: pathlib.Path, out_dir: pathlib.Path):
    """Render every page; returns list of (path, w, h). Skips existing files."""
    out_dir.mkdir(parents=True, exist_ok=True)
    pages = []
    with fitz.open(src) as docu:
        for i, page in enumerate(docu):
            dst = out_dir / f"p{i + 1:02d}.jpg"
            if dst.exists():
                w, h = img_dims(dst)
                pages.append((dst, w, h))
                continue
            rect = page.rect
            zoom = PDF_TARGET / max(rect.width, rect.height)
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
            pix.save(dst, jpg_quality=JPG_QUALITY)
            pages.append((dst, pix.width, pix.height))
            print(f"    p{i + 1:02d} {pix.width}x{pix.height}", flush=True)
    return pages


def main():
    items = []
    skipped = []
    seen_ids = set()

    for folder, (key, label) in CATEGORIES:
        cat_dir = PORT / folder
        if not cat_dir.is_dir():
            print(f"!! missing folder: {folder}", file=sys.stderr)
            continue
        files = sorted(
            (f for f in cat_dir.rglob("*") if f.is_file()),
            key=lambda f: f.name.lower(),
        )
        print(f"[{label}] {len(files)} files", flush=True)
        for f in files:
            ext = f.suffix.lower()
            title = clean_title(f.stem)
            base_id = f"{key}-{slugify(f.stem)}"
            item_id = base_id
            n = 2
            while item_id in seen_ids:
                item_id = f"{base_id}-{n}"
                n += 1
            seen_ids.add(item_id)

            if ext in IMG_EXT:
                src, w, h = publish_image(f, item_id)
                item = {
                    "id": item_id, "cat": key, "title": title,
                    "cover": [rel_url(src), w, h],
                }
                thumb = make_thumb(src, item_id)
                if thumb:
                    item["thumb"] = thumb
                items.append(item)
            elif ext == ".heic":
                dst = OUT / f"{item_id}.jpg"
                convert_heic(f, dst)
                w, h = img_dims(dst)
                item = {
                    "id": item_id, "cat": key, "title": title,
                    "cover": [rel_url(dst), w, h],
                }
                thumb = make_thumb(dst, item_id)
                if thumb:
                    item["thumb"] = thumb
                items.append(item)
            elif ext == ".pdf":
                print(f"  PDF: {f.name}", flush=True)
                pages = render_pdf(f, OUT / item_id)
                item = {
                    "id": item_id, "cat": key, "title": title,
                    "cover": [rel_url(pages[0][0]), pages[0][1], pages[0][2]],
                    "pages": [[rel_url(p), w, h] for p, w, h in pages],
                }
                thumb = make_thumb(pages[0][0], item_id)
                if thumb:
                    item["thumb"] = thumb
                # Multi-page carousel and deck cards show a real three-slide
                # preview stack. Keep those previews lightweight instead of
                # decoding several full-resolution PDF renders in the rail.
                if key in {"carousels", "decks"} and len(pages) > 1:
                    previews = [thumb or item["cover"]]
                    for page_no, (page_path, page_w, page_h) in enumerate(pages[1:3], start=2):
                        page_thumb = make_thumb(page_path, f"{item_id}-p{page_no:02d}")
                        previews.append(page_thumb or [rel_url(page_path), page_w, page_h])
                    item["previews"] = previews
                items.append(item)
            else:
                skipped.append(rel_url(f))

    data = {
        "categories": [[key, label] for _, (key, label) in CATEGORIES],
        "items": items,
    }
    js = (
        "/* AUTO-GENERATED by build_gallery.py — do not edit by hand.\n"
        "   Re-run the script after adding files to /Portfolio. */\n"
        "window.NG_GALLERY = "
        + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    )
    (ROOT / "js" / "gallery-data.js").write_text(js, encoding="utf-8")

    total_pages = sum(len(i.get("pages", [])) for i in items)
    print("\n=== SUMMARY ===")
    print("items:", len(items))
    print("pdf pages rendered:", total_pages)
    per_cat = {}
    for i in items:
        per_cat[i["cat"]] = per_cat.get(i["cat"], 0) + 1
    for k, v in per_cat.items():
        print(f"  {k}: {v}")
    if skipped:
        print("SKIPPED (unsupported ext):")
        for s in skipped:
            print("  -", s)
    else:
        print("skipped: none — every file included")


if __name__ == "__main__":
    main()
