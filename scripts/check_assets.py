# -*- coding: utf-8 -*-
"""
Pre-deploy sanity check:
1. Every local bundle and deployed asset referenced by the site must exist.
2. Reference casing must exactly match disk casing for Linux/GitHub Pages.
3. Nothing the site serves may reference the Portfolio/ source tree.
4. Every deployed asset must be referenced, so stale output cannot ship.
Exit code 0 = deployable, 1 = problems found.
"""
import pathlib
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCES = [
    "index.html",
    "css/styles.css",
    "js/data.js",
    "js/gallery-data.js",
    "js/main.js",
]

ASSET_RE = re.compile(r"assets/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+")
HTML_LOCAL_RE = re.compile(r"(?:src|href)=[\"']([^\"']+)[\"']", re.IGNORECASE)
PORTFOLIO_RE = re.compile(r"Portfolio/")
EXTERNAL_PREFIXES = ("#", "//", "data:", "http:", "https:", "mailto:", "tel:")


def clean_local_ref(raw: str):
    """Return a repository-relative local URL without query/hash metadata."""
    value = raw.strip()
    if not value or value.lower().startswith(EXTERNAL_PREFIXES):
        return None
    value = value.split("#", 1)[0].split("?", 1)[0].replace("\\", "/")
    while value.startswith("./"):
        value = value[2:]
    return value.lstrip("/") or None


source_missing = [name for name in SOURCES if not (ROOT / name).is_file()]
source_text = {}
for name in SOURCES:
    path = ROOT / name
    if path.is_file():
        source_text[name] = path.read_text(encoding="utf-8")

deployed_assets = {
    path.relative_to(ROOT).as_posix()
    for path in (ROOT / "assets").rglob("*")
    if path.is_file()
}
deploy_files = {
    path.relative_to(ROOT).as_posix()
    for path in ROOT.rglob("*")
    if path.is_file()
    and path.relative_to(ROOT).parts[0] not in {".git", "Portfolio"}
}
actual_case = {rel.lower(): rel for rel in deploy_files}

missing_assets = []
missing_local = []
case_mismatches = []
portfolio_refs = []
referenced_assets = set()
local_refs = set()

for name, text in source_text.items():
    if PORTFOLIO_RE.search(text):
        portfolio_refs.append(name)
    for match in ASSET_RE.finditer(text):
        rel = match.group(0)
        referenced_assets.add(rel)
        actual = actual_case.get(rel.lower())
        if actual is None:
            missing_assets.append(f"{name}: {rel}")
        elif actual != rel:
            case_mismatches.append(f"{name}: {rel} -> {actual}")

index_text = source_text.get("index.html", "")
for match in HTML_LOCAL_RE.finditer(index_text):
    rel = clean_local_ref(match.group(1))
    if not rel:
        continue
    local_refs.add(rel)
    actual = actual_case.get(rel.lower())
    if actual is None:
        missing_local.append(f"index.html: {rel}")
    elif actual != rel:
        case_mismatches.append(f"index.html: {rel} -> {actual}")

orphans = sorted(deployed_assets - referenced_assets)
case_mismatches = sorted(set(case_mismatches))

print(
    f"checked {len(source_text)} source files, {len(local_refs)} local bundles "
    f"and {len(deployed_assets)} assets"
)
if source_missing:
    print("FAIL: required source files missing:", ", ".join(source_missing))
if portfolio_refs:
    print("FAIL: Portfolio/ referenced by:", ", ".join(portfolio_refs))
if missing_local:
    print(f"FAIL: {len(missing_local)} local HTML files missing:")
    for item in missing_local[:20]:
        print("  -", item)
if missing_assets:
    print(f"FAIL: {len(missing_assets)} referenced assets missing:")
    for item in missing_assets[:20]:
        print("  -", item)
    if len(missing_assets) > 20:
        print(f"  ... and {len(missing_assets) - 20} more")
if case_mismatches:
    print(f"FAIL: {len(case_mismatches)} path casing mismatches:")
    for item in case_mismatches[:20]:
        print("  -", item)
if orphans:
    orphan_bytes = sum((ROOT / rel).stat().st_size for rel in orphans)
    print(
        f"FAIL: {len(orphans)} unreferenced deployed assets "
        f"({orphan_bytes / 1048576:.1f}MB):"
    )
    for rel in orphans[:20]:
        print("  -", rel)
    if len(orphans) > 20:
        print(f"  ... and {len(orphans) - 20} more")

failed = any(
    (
        source_missing,
        portfolio_refs,
        missing_local,
        missing_assets,
        case_mismatches,
        orphans,
    )
)
if not failed:
    print(
        f"OK: {len(referenced_assets)} referenced assets and "
        f"{len(local_refs)} local bundles resolve with exact casing"
    )
sys.exit(1 if failed else 0)