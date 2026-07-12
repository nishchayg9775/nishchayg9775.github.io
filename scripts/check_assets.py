# -*- coding: utf-8 -*-
"""
Pre-deploy sanity check:
1. Every asset path referenced by index.html, js/data.js and js/gallery-data.js
   must exist on disk.
2. Nothing the site serves may reference the Portfolio/ source tree.
Exit code 0 = deployable, 1 = problems found.
"""
import pathlib
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCES = ["index.html", "js/data.js", "js/gallery-data.js"]

ASSET_RE = re.compile(r'["\'(](assets/[^"\')?#]+)')
PORTFOLIO_RE = re.compile(r'Portfolio/')

missing, portfolio_refs = [], []
for name in SOURCES:
    text = (ROOT / name).read_text(encoding="utf-8")
    if PORTFOLIO_RE.search(text):
        portfolio_refs.append(name)
    for m in ASSET_RE.finditer(text):
        rel = m.group(1)
        if not (ROOT / rel).exists():
            missing.append(f"{name}: {rel}")

print(f"checked {len(SOURCES)} source files")
if portfolio_refs:
    print("FAIL: Portfolio/ referenced by:", ", ".join(portfolio_refs))
if missing:
    print(f"FAIL: {len(missing)} referenced assets missing:")
    for m in missing[:20]:
        print("  -", m)
    if len(missing) > 20:
        print(f"  ... and {len(missing) - 20} more")
if not portfolio_refs and not missing:
    print("OK: all referenced assets exist, no Portfolio/ references")
    sys.exit(0)
sys.exit(1)
