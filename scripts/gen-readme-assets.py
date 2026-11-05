#!/usr/bin/env python3
"""Generate README image assets for dsh-contract-renewal (docs/assets/).

Outputs (idempotent overwrite):
  dsh-contract-renewal-flow-light.svg / dsh-contract-renewal-flow-dark.svg
      Hero pipeline diagram. Two hand-written SVG files (vector — never
      rasterized to webp). Text inside is command-surface tokens only
      (contract.ingest, contract.upcoming, contract.report, group keys,
      paths, risk levels), so all five README languages share the same pair.

No rasterized assets are produced, and therefore no CJK font probe is
needed: this repo has no UI (no client/) and no benchmark/RESULTS.md, so
there is no screenshot to normalize and no evidence bar chart to draw. The
moment a real benchmark lands, add an evidence() function here using the
dsh-mask skeleton (Pillow, CJK font probe, WEBP quality=90) and quote the
numbers verbatim from its source file.

Existing assets (docs/assets/quickstart.png, quickstart.log) are real
captured terminal output and are kept untouched.

Run once:  python scripts/gen-readme-assets.py
Requires:  Python 3.10+ (standard library only)
"""
from __future__ import annotations

import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")

# --- palette: PerryLink family (accent) + GitHub page backgrounds ----------
FAMILY = "#4B67B4"   # family accent (badges labelColor family uses #2B3245)
GREEN = {"light": "#16a34a", "dark": "#3fb950"}
SKIN = {
    "light": dict(bg="#ffffff", box="#f6f8fa", border="#d0d7de",
                  text="#1f2328", sub="#57606a"),
    "dark": dict(bg="#0d1117", box="#161b22", border="#30363d",
                 text="#f0f6fc", sub="#8b949e"),
}

# ---------------------------------------------------------------------------
# Hero pipeline SVG (light + dark). Tokens only: tool names, group keys,
# paths, risk levels — no natural-language sentences, so the same pair of
# files serves all five README languages.
# ---------------------------------------------------------------------------
FLOW_NODES = [
    ("contracts.csv", "7 fields · UTF-8 CSV"),
    ("contract.ingest", "validate → append · R1"),
    ("contracts.jsonl", "$DSH_HOME/storages/..."),
    ("contract.upcoming", "as_of · days_left · R0"),
    ("contract.report", "exports/*.csv · sha256 · R1"),
]


def flow_svg(skin: str) -> str:
    s = SKIN[skin]
    w, h = 1200, 400
    nw, nh, gap = 200, 96, 32
    y0 = 146
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}" role="img" '
        f'aria-label="dsh-contract-renewal pipeline">',
        f'<title>dsh-contract-renewal pipeline</title>',
        f'<rect width="{w}" height="{h}" rx="18" fill="{s["bg"]}"/>',
        f'<text x="48" y="60" fill="{s["text"]}" font-family="ui-sans-serif,'
        f'system-ui,sans-serif" font-size="30" font-weight="700">'
        f'dsh-contract-renewal</text>',
        f'<text x="48" y="92" fill="{s["sub"]}" font-family="ui-monospace,'
        f'monospace" font-size="16">contract.ingest → contract.upcoming → '
        f'contract.report · local files only</text>',
        f'<line x1="48" y1="114" x2="1152" y2="114" stroke="{s["border"]}"/>',
    ]
    for i, (label, sub) in enumerate(FLOW_NODES):
        x = 48 + i * (nw + gap)
        accent = GREEN[skin] if i == len(FLOW_NODES) - 1 else (
            FAMILY if i in (1, 3) else s["border"])
        parts.append(
            f'<rect x="{x}" y="{y0}" width="{nw}" height="{nh}" rx="14" '
            f'fill="{s["box"]}" stroke="{accent}" stroke-width="2"/>')
        parts.append(
            f'<text x="{x + nw // 2}" y="{y0 + 40}" fill="{s["text"]}" '
            f'text-anchor="middle" font-family="ui-monospace,monospace" '
            f'font-size="15" font-weight="700">{label}</text>')
        parts.append(
            f'<text x="{x + nw // 2}" y="{y0 + 68}" fill="{s["sub"]}" '
            f'text-anchor="middle" font-family="ui-monospace,monospace" '
            f'font-size="11">{sub}</text>')
        if i < len(FLOW_NODES) - 1:
            ax = x + nw + 5
            ay = y0 + nh // 2
            parts.append(
                f'<path d="M{ax} {ay}h{gap - 12}" stroke="{s["sub"]}" '
                f'stroke-width="3"/>')
            parts.append(
                f'<path d="M{ax + gap - 15} {ay - 7}l10 7-10 7" fill="none" '
                f'stroke="{s["sub"]}" stroke-width="3" '
                f'stroke-linecap="round" stroke-linejoin="round"/>')
    # bottom strip: the three mutually exclusive groups + risk levels
    parts.append(
        f'<rect x="48" y="282" width="1104" height="50" rx="12" '
        f'fill="{s["box"]}" stroke="{FAMILY}" stroke-width="2"/>')
    parts.append(
        f'<text x="600" y="313" fill="{s["text"]}" text-anchor="middle" '
        f'font-family="ui-monospace,monospace" font-size="14">'
        f'expired · in_renewal_window · expiring_soon ｜ later = counts only '
        f'｜ R0: contract.upcoming ｜ R1: contract.ingest · contract.report'
        f'</text>')
    parts.append(
        f'<text x="48" y="374" fill="{s["sub"]}" font-family="ui-monospace,'
        f'monospace" font-size="13">UTC calendar days · no TZ/DST drift · '
        f'no network · no model call · contract bodies never read · '
        f'append-only registry</text>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n"


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for skin in ("light", "dark"):
        path = os.path.join(OUT, f"dsh-contract-renewal-flow-{skin}.svg")
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(flow_svg(skin))
    # Fail loudly rather than silently shipping malformed SVG.
    import xml.etree.ElementTree as ET

    for skin in ("light", "dark"):
        ET.parse(os.path.join(OUT, f"dsh-contract-renewal-flow-{skin}.svg"))
    print("wrote 2 SVG assets to docs/assets/")


if __name__ == "__main__":
    sys.exit(main())
