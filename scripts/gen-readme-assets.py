#!/usr/bin/env python3
"""README visuals for dsh-contract-renewal (docs/assets/).

Both figures are read off the shipped material, not a shared template.

hero 1440x576 (Pillow; zh/en x light/dark, 4 files)
    The five quickstart contracts as renewal-window lanes on one days_left
    axis. Every bar spans `end_date - renewal_window_days .. end_date`; the
    vertical line is `as_of 2026-12-01`. A bar that crosses the line is in
    the renewal window, a bar entirely left of it is expired, a bar to the
    right with days_left <= within_days is expiring soon, and anything past
    within_days is only counted. Numbers, statuses, as_of and within_days
    are parsed from samples/quickstart/expected/result.json at build time
    (report.text carries all five rows), so the picture cannot drift from
    the golden fixture.

flow 1100x660 (hand-written SVG; light/dark, 2 files)
    Two sides of one append-only ledger, not a row of boxes:
      WRITE SIDE  contracts.csv / contract_ingest -> validate() -> append
      READ SIDE   days_left = end_date - as_of -> four exclusive buckets,
                  drawn as a descending four-rung ladder, -> two exits
                  (contract_upcoming's three groups, contract_report's CSV)
    contracts.jsonl is the full-width band both sides meet at. Text is
    token-only English (tool names, field names, paths, numbers), so all
    five README languages share the same pair.

Run once:  python scripts/gen-readme-assets.py
Requires:  Python 3.10+ with Pillow; Windows fonts msyh.ttc / msyhbd.ttc /
           consola.ttf / segoeui.ttf / segoeuib.ttf.
"""
from __future__ import annotations

import csv
import io
import json
import os
import sys
from html import escape

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")
FIXTURE = os.path.join(ROOT, "samples", "quickstart", "expected", "result.json")

FONT_CJK = r"C:\Windows\Fonts\msyh.ttc"
FONT_CJK_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"
FONT_MONO = r"C:\Windows\Fonts\consola.ttf"
FONT_EN = r"C:\Windows\Fonts\segoeui.ttf"
FONT_EN_BOLD = r"C:\Windows\Fonts\segoeuib.ttf"

for _p in (FONT_CJK, FONT_CJK_BOLD, FONT_MONO, FONT_EN, FONT_EN_BOLD):
    if not os.path.exists(_p):
        raise SystemExit(f"FATAL: font missing: {_p}")

FALLAS: list[str] = []          # layout problems: non-empty means "do not ship"
_MEASURE = ImageDraw.Draw(Image.new("RGB", (8, 8)))

# ---------------------------------------------------------------- primitives


def font(size: float, kind: str = "cjk") -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(
        {"cjk": FONT_CJK, "cjk_bold": FONT_CJK_BOLD, "mono": FONT_MONO,
         "en": FONT_EN, "en_bold": FONT_EN_BOLD}[kind], max(8, int(round(size))))


def measure(text: str, size: float, kind: str = "mono") -> float:
    return _MEASURE.textlength(text, font=font(size, kind))


def hx(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def gradient(w: int, h: int, c1: str, c2: str) -> Image.Image:
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = 0.25 * (y / h) + 0.75 * (y / h) ** 1.6
        d.line([(0, y), (w, y)],
               fill=tuple(int(p + (q - p) * t) for p, q in zip(hx(c1), hx(c2))))
    return img


def glow(img: Image.Image, cx: int, cy: int, r: int, color: tuple, alpha: int) -> Image.Image:
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(10, 0, -1):
        rr = r * i / 10
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                  fill=color + (int(alpha * (1 - i / 11)),))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def card(img: Image.Image, box: tuple[int, int, int, int], skin: dict,
         radius: int = 20, shadow: int = 26) -> Image.Image:
    x0, y0, x1, y1 = box
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    for i in range(shadow, 0, -3):
        sd.rounded_rectangle([x0 - i // 5, y0 + i // 2, x1 + i // 5, y1 + i],
                             radius=radius + i // 5,
                             fill=skin["shadow"] + (int(7 * (1 - i / shadow)),))
    base = Image.alpha_composite(img.convert("RGBA"),
                                 sh.filter(ImageFilter.GaussianBlur(12)))
    d = ImageDraw.Draw(base)
    d.rounded_rectangle(box, radius=radius, fill=hx(skin["card"]),
                        outline=hx(skin["card_edge"]), width=2)
    return base.convert("RGB")


def text(img: Image.Image, xy: tuple[float, float], s: str, size: float,
         kind: str, color: str, anchor: str = "ls", max_w: float | None = None,
         min_size: float = 14, tag: str = "") -> float:
    """Draw text by baseline; shrink to fit max_w and record a hard failure."""
    d = ImageDraw.Draw(img)
    size = float(size)
    if max_w is not None:
        while size > min_size and measure(s, size, kind) > max_w:
            size -= 1
        if measure(s, size, kind) > max_w + 0.5:
            FALLAS.append(f"{tag or s!r}: {measure(s, size, kind):.0f}px > {max_w:.0f}px")
    d.text(xy, s, font=font(size, kind), fill=hx(color), anchor=anchor)
    return size


def pill(img: Image.Image, xy: tuple[int, int], s: str, skin: dict, size: float,
         kind: str, fg: str | None = None, bg: str | None = None,
         tag: str = "") -> None:
    d = ImageDraw.Draw(img)
    tw = measure(s, size, kind)
    x, y = xy
    h = size + 22
    d.rounded_rectangle([x, y, x + tw + 36, y + h], radius=h / 2,
                        fill=hx(bg or skin["pill"]))
    d.text((x + 18, y + h / 2), s, font=font(size, kind),
           fill=hx(fg or skin["accent"]), anchor="lm")
    if tw + 36 > 470:
        FALLAS.append(f"pill {tag or s!r}: {tw + 36:.0f}px wide")


# --------------------------------------------------------------- palette

SKIN = {
    "light": dict(
        bg_from="#f9f6fd", bg_to="#e4eaf8", card="#ffffff",
        card_edge="#e4e1ee", zone="#f5f2fb", text="#141419", sub="#4d5261",
        faint="#8f94a4", accent="#4B67B4", danger="#b4442c", good="#16a34a",
        pill="#ece7f9", track="#eae6f3", grid="#e7e4f0", shadow=(32, 26, 64),
        dot="#d9d3ea",
    ),
    "dark": dict(
        bg_from="#131a2a", bg_to="#0c1016", card="#1b2231",
        card_edge="#2e374b", zone="#171e2d", text="#f0f3f9", sub="#a8b1c4",
        faint="#737b8d", accent="#8496f5", danger="#f0885c", good="#3fb950",
        pill="#242d42", track="#243049", grid="#1e2636", shadow=(0, 0, 0),
        dot="#26314a",
    ),
}

STATUS_COLOR = {"expired": "danger", "in_renewal_window": "accent",
                "expiring_soon": "good", "later": "faint"}

# --------------------------------------------------------------- fixture


def load_fixture() -> tuple[dict, list[dict]]:
    """Read the golden quickstart result; report.text holds all five rows."""
    with open(FIXTURE, encoding="utf-8") as fh:
        data = json.load(fh)
    rows = list(csv.reader(io.StringIO(data["report"]["text"].strip())))
    head = rows[0]
    contracts = []
    for row in rows[1:]:
        rec = dict(zip(head, row))
        contracts.append(dict(
            no=rec["contract_no"],
            days=int(rec["days_left"]),
            window=int(rec["renewal_window_days"]),
            status=rec["status"],
        ))
    contracts.sort(key=lambda r: r["days"])
    counts = data["upcoming"]["counts"]
    if len(contracts) != counts["total"]:
        raise SystemExit("FATAL: fixture rows do not match counts.total")
    return data, contracts


AS_OF, CONTRACTS = load_fixture()
WITHIN_DAYS = AS_OF["within_days"]
COUNTS = AS_OF["upcoming"]["counts"]
if AS_OF["as_of"] != "2026-12-01":
    raise SystemExit("FATAL: fixture as_of changed; re-check the hero copy")

# --------------------------------------------------------------- hero

HERO = {
    "zh": dict(
        kicker="DeepSeek Harness · 合同到期登记插件",
        title=["合同到期登记"],
        title_size=88, title_baselines=[210],
        value=["一行七字段，登记一份合同", "按 as_of 分三组，互不重复"],
        value_size=36, value_baselines=[282, 326],
        sub="UTC 日历天分三组 → 导出可校验 CSV",
        sub_size=25, sub_baseline=374,
        meta="R0 只读 / R1 本地写 · 无网络 · 不读合同正文",
        meta_size=20, meta_baseline=426,
        foot="Apache-2.0 · PerryLink DSH plugin family",
        foot_size=17, foot_baseline=476,
        panel_head="as_of 2026-12-01",
        panel_head2=" · 5 份合同 · within_days 90",
        panel_sub="days_left = end_date − as_of；条 = 该合同的续签窗口 [end − w, end]",
        zones=["已过期", "N 天内", "later"],
        legend=["已过期", "续签窗口", "N 天内", "later"],
        note_tail="later 只进 counts.later · 条宽 = 该合同的续签窗口天数",
        as_of_cap="as_of",
        name_kind="cjk_bold", body_kind="cjk",
    ),
    "en": dict(
        kicker="DeepSeek Harness · contract renewal plugin",
        title=["Contract", "renewal"],
        title_size=76, title_baselines=[164, 232],
        value=["Seven fields register one contract",
               "Three exclusive groups for one as_of"],
        value_size=30, value_baselines=[292, 334],
        sub="UTC calendar days in, checked CSV out — all local",
        sub_size=22, sub_baseline=380,
        meta="R0 read-only / R1 local write · no network · bodies never read",
        meta_size=19, meta_baseline=428,
        foot="Apache-2.0 · PerryLink DSH plugin family",
        foot_size=16, foot_baseline=476,
        panel_head="as_of 2026-12-01",
        panel_head2=" · 5 contracts · within_days 90",
        panel_sub="days_left = end_date − as_of; bar = that contract's renewal window [end − w, end]",
        zones=["expired", "within N days", "later"],
        legend=["expired", "renewal window", "within N days", "later"],
        note_tail="later only feeds counts · bar = its own renewal window",
        as_of_cap="as_of",
        name_kind="en_bold", body_kind="en",
    ),
}

CARD = (648, 40, 1392, 528)
PLOT_X0, PLOT_X1 = 840, 1368
DAY_MIN, DAY_MAX = -84, 132
LANE_TOP = 162
LANE_STEP = 54


def band_x(day: float) -> float:
    return PLOT_X0 + (day - DAY_MIN) * (PLOT_X1 - PLOT_X0) / (DAY_MAX - DAY_MIN)


def hero(lang: str, skin_name: str) -> None:
    s = SKIN[skin_name]
    m = HERO[lang]
    body = m["body_kind"]
    w, h = 1440, 576
    img = gradient(w, h, s["bg_from"], s["bg_to"])
    img = glow(img, 1210, 30, 430, hx(s["accent"]), 22 if skin_name == "light" else 40)
    img = glow(img, 110, 566, 300, hx(s["accent"]), 9 if skin_name == "light" else 16)

    # ------------------------------------------------------- left column
    pill(img, (60, 46), m["kicker"], s, 19 if lang == "zh" else 18.5,
         m["name_kind"], tag=f"{lang}.kicker")

    for line, base in zip(m["title"], m["title_baselines"]):
        text(img, (60, base), line, m["title_size"], m["name_kind"],
             s["text"], max_w=560, min_size=64, tag=f"{lang}.title")

    for i, (line, base) in enumerate(zip(m["value"], m["value_baselines"])):
        text(img, (61, base), line, m["value_size"], m["name_kind"], s["text"],
             max_w=556, min_size=24, tag=f"{lang}.value{i}")
    text(img, (61, m["sub_baseline"]), m["sub"], m["sub_size"], body, s["sub"],
         max_w=556, min_size=17, tag=f"{lang}.sub")
    text(img, (62, m["meta_baseline"]), m["meta"], m["meta_size"], body,
         s["faint"], max_w=556, min_size=15, tag=f"{lang}.meta")
    d = ImageDraw.Draw(img)
    d.line([62, 452, 618, 452], fill=hx(s["grid"]), width=2)
    text(img, (62, m["foot_baseline"]), m["foot"], m["foot_size"], "en",
         s["faint"], max_w=556, min_size=13, tag=f"{lang}.foot")

    # ------------------------------------------------------- right card
    img = card(img, CARD, s, radius=22)
    d = ImageDraw.Draw(img)

    text(img, (672, 78), m["panel_head"], 21, "mono", s["text"],
         max_w=300, min_size=16, tag=f"{lang}.panel_head")
    text(img, (676 + measure(m["panel_head"], 21, "mono"), 77), m["panel_head2"],
         15, body, s["faint"], max_w=330, min_size=12, tag=f"{lang}.panel_head2")
    text(img, (672, 102), m["panel_sub"], 13.5, body, s["faint"],
         max_w=680, min_size=11, tag=f"{lang}.panel_sub")
    d.line([672, 116, 1368, 116], fill=hx(s["grid"]), width=2)

    # zones behind the lanes
    x_zero, x_n = band_x(0), band_x(WITHIN_DAYS)
    zone_alpha = (16, 18) if skin_name == "light" else (22, 20)
    for x0, x1, color, alpha in ((PLOT_X0, x_zero, s["danger"], zone_alpha[0]),
                                 (x_zero, x_n, s["accent"], zone_alpha[1])):
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).rectangle([x0, 128, x1, 404],
                                        fill=hx(color) + (alpha,))
        img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
    d = ImageDraw.Draw(img)

    text(img, ((PLOT_X0 + x_zero) / 2, 140), m["zones"][0], 12, body, s["danger"],
         anchor="ms", max_w=x_zero - PLOT_X0 - 8, min_size=11, tag=f"{lang}.zone0")
    text(img, ((x_zero + x_n) / 2, 140), m["zones"][1], 12, body, s["accent"],
         anchor="ms", max_w=x_n - x_zero - 8, min_size=11, tag=f"{lang}.zone1")
    text(img, ((x_n + PLOT_X1) / 2, 140), m["zones"][2], 12, body, s["faint"],
         anchor="ms", max_w=PLOT_X1 - x_n - 6, min_size=10, tag=f"{lang}.zone2")

    d.line([x_zero, 128, x_zero, 406], fill=hx(s["accent"]), width=2)
    d.line([x_n, 128, x_n, 406], fill=hx(s["grid"]), width=2)

    for i, c in enumerate(CONTRACTS):
        cy = LANE_TOP + i * LANE_STEP
        color = hx(s[STATUS_COLOR[c["status"]]])
        x_end = band_x(c["days"])
        x_start = band_x(c["days"] - c["window"])
        # the bar is the renewal window; the dot is the end date
        if c["status"] == "later":
            d.rounded_rectangle([x_start, cy - 9, x_end, cy + 9], radius=9,
                                fill=color + (48,), outline=color + (150,), width=2)
        else:
            d.rounded_rectangle([x_start, cy - 9, x_end, cy + 9], radius=9,
                                fill=color + (66,), outline=color, width=2)
        d.line([x_end, cy - 12, x_end, cy + 12], fill=color, width=3)

        text(img, (672, cy + 1), c["no"], 13.5, "mono", s["text"],
             max_w=160, min_size=10, tag=f"{lang}.lane{i}.no")
        text(img, (672, cy + 17), f"{c['days']:+d} d · w {c['window']}", 12.5,
             "mono", s["faint"], max_w=160, min_size=10, tag=f"{lang}.lane{i}.days")

    # days_left axis
    d.line([PLOT_X0, 410, PLOT_X1, 410], fill=hx(s["grid"]), width=2)
    for day in (-60, -30, 0, 30, 60, 90, 120):
        x = band_x(day)
        d.line([x, 410, x, 416], fill=hx(s["faint"]), width=1)
        if day == 0:
            text(img, (x, 436), "0", 12.5, "mono", s["accent"], anchor="ms",
                 max_w=40, min_size=11, tag=f"{lang}.tick0")
            text(img, (x, 453), m["as_of_cap"], 12, "mono", s["accent"],
                 anchor="ms", max_w=60, min_size=10, tag=f"{lang}.asof")
        else:
            text(img, (x, 436), f"{day:+d}", 12.5, "mono", s["faint"], anchor="ms",
                 max_w=40, min_size=11, tag=f"{lang}.tick{day}")

    # legend
    lx = 672.0
    for i, (key, label) in enumerate(zip(
            ("expired", "in_renewal_window", "expiring_soon", "later"), m["legend"])):
        color = hx(s[STATUS_COLOR[key]])
        d.ellipse([lx, 478, lx + 9, 487], fill=color)
        text(img, (lx + 15, 488), f"{label} {COUNTS[key]}", 14, body, s["sub"],
             max_w=200, min_size=10, tag=f"{lang}.legend{i}")
        lx += 15 + measure(f"{label} {COUNTS[key]}", 14, body) + 26

    total = COUNTS["total"]
    text(img, (672, 512), f"total {total} = {COUNTS['expired']} + "
         f"{COUNTS['in_renewal_window']} + {COUNTS['expiring_soon']} + "
         f"{COUNTS['later']} · {m['note_tail']}", 12.5, body, s["faint"],
         max_w=690, min_size=10, tag=f"{lang}.note")

    img.save(os.path.join(OUT, f"dsh-contract-renewal-hero-{lang}-{skin_name}.webp"),
             "WEBP", quality=92)
    print(f"wrote dsh-contract-renewal-hero-{lang}-{skin_name}.webp")


# ------------------------------------------------------------- flow (SVG)

FLOW = {
    "light": dict(bg_from="#f9f6fd", bg_to="#e4eaf8", card="#ffffff",
                  edge="#e4e1ee", zone="#f4f1fb", text="#141419", sub="#4d5261",
                  faint="#8f94a4", accent="#4B67B4", danger="#b4442c",
                  good="#16a34a", pill="#ece7f9", track="#eae6f3",
                  grid="#e7e4f0", dot="#d9d3ea"),
    "dark": dict(bg_from="#131a2a", bg_to="#0c1016", card="#1b2231",
                 edge="#2e374b", zone="#171e2d", text="#f0f3f9", sub="#a8b1c4",
                 faint="#737b8d", accent="#8496f5", danger="#f0885c",
                 good="#3fb950", pill="#242d42", track="#243049",
                 grid="#1e2636", dot="#26314a"),
}

MONO = ("ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace")
SANS = ("ui-sans-serif, system-ui, -apple-system, 'Segoe UI', "
        "'Microsoft YaHei', sans-serif")

P = 44                      # page margin
LEDGER = (44, 480, 1056, 544)
LPANEL = (44, 116, 414, 462)    # write side
RPANEL = (434, 116, 1056, 462)  # read side
FORMULA = (454, 188, 1036, 240)
OUT_CARDS = ((786, 252, 1036, 378), (786, 392, 1036, 456))
RUNG_RIGHT = 770
BUS_X = 776


def svg_text(x, y, s, size=14, kind="mono", fill="#000", anchor="start",
             weight=None, ls=None, opacity=None, budget=None, tag="") -> str:
    if budget is not None:
        # the browser may resolve the family stack to a wider face than
        # Consolas/YaHei; keep a safety margin so nothing can clip on GitHub.
        raw = measure(s, size, "mono" if kind == "mono" else "cjk")
        got = raw * (1.12 if kind == "mono" else 1.05)
        if got > budget:
            FALLAS.append(f"svg {tag or s!r}: {got:.0f}px > {budget:.0f}px")
    attr = [f'x="{x:g}"', f'y="{y:g}"', f'fill="{fill}"',
            f'font-family="{MONO if kind == "mono" else SANS}"',
            f'font-size="{size:g}"']
    if anchor != "start":
        attr.append(f'text-anchor="{anchor}"')
    if weight:
        attr.append(f'font-weight="{weight}"')
    if ls:
        attr.append(f'letter-spacing="{ls:g}"')
    if opacity is not None:
        attr.append(f'opacity="{opacity:g}"')
    return f'<text {" ".join(attr)}>{escape(s)}</text>'


def rect(x0, y0, x1, y1, fill, r=18, stroke=None, sw=1.5, filt=False,
         dash=None, opacity=None) -> str:
    a = [f'x="{x0:g}"', f'y="{y0:g}"', f'width="{x1 - x0:g}"',
         f'height="{y1 - y0:g}"', f'rx="{r:g}"', f'fill="{fill}"']
    if stroke:
        a += [f'stroke="{stroke}"', f'stroke-width="{sw:g}"']
    if dash:
        a.append(f'stroke-dasharray="{dash}"')
    if opacity is not None:
        a.append(f'opacity="{opacity:g}"')
    body = f'<rect {" ".join(a)}/>'
    return f'<g filter="url(#soft)">{body}</g>' if filt else body


def arrow(x1, y1, x2, y2, color, width=2.0, dash=None, head=7) -> str:
    a = [f'M{x1:g} {y1:g}', f'L{x2:g} {y2:g}']
    line = (f'<path d="{" ".join(a)}" fill="none" stroke="{color}" '
            f'stroke-width="{width:g}" stroke-linecap="round"'
            + (f' stroke-dasharray="{dash}"' if dash else '') + '/>')
    if x1 == x2:
        sgn = 1 if y2 > y1 else -1
        tri = (f'<path d="M{x2 - head * 0.62:g} {y2 - sgn * head:g}'
               f'L{x2 + head * 0.62:g} {y2 - sgn * head:g}'
               f'L{x2:g} {y2:g} Z" fill="{color}"/>')
    else:
        sgn = 1 if x2 > x1 else -1
        tri = (f'<path d="M{x2 - sgn * head:g} {y2 - head * 0.62:g}'
               f'L{x2 - sgn * head:g} {y2 + head * 0.62:g}'
               f'L{x2:g} {y2:g} Z" fill="{color}"/>')
    return line + tri


def flow_svg(skin_name: str) -> str:
    s = FLOW[skin_name]
    shadow_op = "0.10" if skin_name == "light" else "0.55"
    shadow_col = "#1b1735" if skin_name == "light" else "#000000"
    g = s["grid"]
    p: list[str] = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="660" viewBox="0 0 1100 660" role="img" aria-labelledby="flowTitle flowDesc">
<title id="flowTitle">dsh-contract-renewal structure: one append-only contracts.jsonl, a write side that validates and appends, and a read side that turns days_left into four exclusive buckets and two exits</title>
<desc id="flowDesc">contracts.csv (7 fields) is validated by contract_ingest (R1) and appended to $DSH_HOME/storages/dsh-contract-renewal/contracts.jsonl. On the read side days_left = end_date - as_of is computed in UTC day numbers and classified by four ordered tests with w = renewal_window_days and N = within_days (90): days_left &lt; 0 gives expired, 0 &lt;= days_left &lt;= w gives in_renewal_window, w &lt; days_left &lt;= N gives expiring_soon, days_left &gt; N is later and only counted. contract_upcoming returns the three groups plus counts; contract_report writes every row to exports/contracts-&lt;as_of&gt;.csv with sha256, rows and bytes.</desc>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
    <stop offset="0" stop-color="{s['bg_from']}"/>
    <stop offset="1" stop-color="{s['bg_to']}"/>
  </linearGradient>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="180%">
    <feDropShadow dx="0" dy="7" stdDeviation="10" flood-color="{shadow_col}" flood-opacity="{shadow_op}"/>
  </filter>
  <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
    <circle cx="1.4" cy="1.4" r="1.4" fill="{s['dot']}"/>
  </pattern>
</defs>
<rect width="1100" height="660" fill="url(#bg)"/>
<rect width="1100" height="660" fill="url(#dots)" opacity=".45"/>''']

    # ---- header
    p.append(svg_text(P, 58, "dsh-contract-renewal", 33, "mono", s["text"],
                      weight=700, budget=420, tag="title"))
    p.append(svg_text(P, 84, "one local ledger · days_left = end_date − as_of · "
                             "four exclusive buckets · two exits", 14, "sans",
                      s["sub"], budget=620, tag="sub"))
    p.append(rect(652, 42, 1056, 76, s["pill"], r=17))
    p.append(svg_text(854, 63, "as_of 2026-12-01 · within_days 90 · fixture 5",
                      13, "mono", s["accent"], anchor="middle", budget=380,
                      tag="pill"))
    p.append(f'<line x1="{P}" y1="102" x2="1056" y2="102" stroke="{g}" stroke-width="1.5"/>')

    # ---- write side panel
    p.append(rect(*LPANEL, s["zone"], r=20, stroke=s["edge"]))
    p.append(svg_text(64, 144, "WRITE SIDE · R1 LOCAL WRITE", 12.5, "mono",
                      s["accent"], weight=700, ls=1.2, budget=330, tag="w-eyebrow"))
    p.append(svg_text(64, 172, "contract_ingest", 19, "mono", s["text"],
                      weight=700, budget=260, tag="w-title"))
    p.append(rect(344, 154, 394, 180, s["pill"], r=13))
    p.append(svg_text(369, 171, "R1", 12.5, "mono", s["accent"], anchor="middle",
                      budget=44, tag="w-r1"))
    p.append(svg_text(64, 198, "contracts.csv · 7 fields", 13.5, "sans", s["sub"],
                      budget=300, tag="w-sec1"))

    fields = (("contract_no", 0, 224), ("counterparty", 0, 246),
              ("start_date", 0, 268), ("end_date", 0, 290),
              ("renewal_window_days", 172, 224), ("owner", 172, 246),
              ("amount", 172, 268))
    for name, dx, y in fields:
        p.append(f'<circle cx="{64 + dx + 3}" cy="{y - 4}" r="2.6" fill="{s["accent"]}" opacity=".55"/>')
        p.append(svg_text(64 + dx + 13, y, name, 12.5, "mono", s["sub"],
                          budget=150, tag=f"w-field-{name}"))
    p.append(f'<line x1="64" y1="304" x2="394" y2="304" stroke="{g}" stroke-width="1.4"/>')

    p.append(svg_text(64, 326, "validate() · fail closed", 13.5, "sans", s["sub"],
                      budget=300, tag="w-sec2"))
    rules = ["strict YYYY-MM-DD, real calendar date",
             "contract_no unique, case-insensitive",
             "window / within_days: integer 0-3650",
             "amount 0-1e12, at most 2 decimals"]
    for i, rule in enumerate(rules):
        p.append(svg_text(64, 348 + i * 20, rule, 12.5, "sans", s["sub"],
                          budget=326, tag=f"w-rule{i}"))
    p.append(rect(64, 420, 394, 448, s["card"], r=12, stroke=s["edge"]))
    p.append(svg_text(78, 438, "E_CONTRACT_* → one sentence + next step", 11,
                      "mono", s["danger"], budget=302, tag="w-error"))

    # ---- read side panel
    p.append(rect(*RPANEL, s["zone"], r=20, stroke=s["edge"]))
    p.append(svg_text(454, 144, "READ SIDE · R0 READ / R1 EXPORT", 12.5, "mono",
                      s["accent"], weight=700, ls=1.2, budget=420, tag="r-eyebrow"))
    p.append(svg_text(454, 172, "contract_upcoming · contract_report", 17, "mono",
                      s["text"], weight=700, budget=420, tag="r-title"))
    p.append(svg_text(1036, 171, "R0 / R1", 12.5, "mono", s["faint"],
                      anchor="end", budget=70, tag="r-r0"))
    p.append(rect(*FORMULA, s["card"], r=14, stroke=s["edge"], filt=True))
    p.append(svg_text(471, 210, "days_left = end_date − as_of  ·  UTC day numbers, "
                                "no TZ / DST", 13.5, "mono", s["text"],
                      budget=548, tag="r-formula1"))
    p.append(svg_text(471, 231, "w = renewal_window_days (per contract)  ·  "
                                "N = within_days (default 90)", 12, "sans",
                      s["sub"], budget=548, tag="r-formula2"))

    # ---- the four-rung exclusive ladder (right edges aligned at RUNG_RIGHT)
    rungs = [
        ("days_left < 0", "expired", "danger",
         "listed however old — N never hides it"),
        ("0 ≤ days_left ≤ w", "in_renewal_window", "accent",
         "window beats the N-day bucket"),
        ("w < days_left ≤ N", "expiring_soon", "good",
         "day N counts, N + 1 does not"),
        ("days_left > N", "later", "faint",
         "counted in counts.later only"),
    ]
    for i, (cond, key, colorkey, note) in enumerate(rungs):
        y0 = 252 + i * 50
        x0 = 454 + i * 12
        color = s[colorkey]
        cond_w = measure(cond, 13, "mono") * 1.03
        key_w = measure(key, 13, "mono") * 1.03
        if x0 + 18 + cond_w + 14 > RUNG_RIGHT - 16 - key_w:
            FALLAS.append(f"rung{i}: condition and key collide "
                          f"({cond_w:.0f} + {key_w:.0f})")
        p.append(rect(x0, y0, RUNG_RIGHT, y0 + 44, s["card"], r=14,
                      stroke=s["edge"], filt=True))
        p.append(rect(x0 + 2, y0 + 10, x0 + 6, y0 + 34, color, r=2))
        p.append(svg_text(x0 + 18, y0 + 19, cond, 13, "mono", s["text"],
                          budget=RUNG_RIGHT - x0 - 34, tag=f"rung{i}-cond"))
        p.append(svg_text(RUNG_RIGHT - 16, y0 + 19, key, 13, "mono", color,
                          anchor="end", weight=700, budget=RUNG_RIGHT - x0 - 34,
                          tag=f"rung{i}-key"))
        p.append(svg_text(x0 + 18, y0 + 37, note, 11.5, "sans", s["faint"],
                          budget=RUNG_RIGHT - x0 - 34, tag=f"rung{i}-note"))

    # ---- bus from the ladder to the two exits
    p.append(f'<path d="M{RUNG_RIGHT} 274 L{BUS_X} 274 L{BUS_X} 424 L{RUNG_RIGHT} 424" '
             f'fill="none" stroke="{s["accent"]}" stroke-width="2" opacity=".55"/>')
    p.append(arrow(BUS_X, 315, 784, 315, s["accent"], 2, head=6))
    p.append(arrow(BUS_X, 421, 784, 421, s["accent"], 2, head=6))

    # ---- two exits
    up, rep = OUT_CARDS
    p.append(rect(*up, s["card"], r=16, stroke=s["edge"], filt=True))
    p.append(svg_text(802, 276, "contract_upcoming · R0", 13, "mono", s["accent"],
                      weight=700, budget=218, tag="out-up-title"))
    p.append(svg_text(802, 294, "3 exclusive groups + counts", 11.5, "sans",
                      s["faint"], budget=218, tag="out-up-sub"))
    rows = (("expired[]", COUNTS["expired"], s["danger"]),
            ("in_renewal_window[]", COUNTS["in_renewal_window"], s["accent"]),
            ("expiring_soon[]", COUNTS["expiring_soon"], s["good"]),
            ("counts.later", COUNTS["later"], s["faint"]))
    for i, (label, n, color) in enumerate(rows):
        p.append(svg_text(802, 318 + i * 18, label, 13, "mono", color,
                          budget=190, tag=f"out-row{i}"))
        p.append(svg_text(1036, 318 + i * 18, str(n), 13, "mono", s["text"],
                          anchor="end", weight=700, budget=24, tag=f"out-n{i}"))

    p.append(rect(*rep, s["card"], r=16, stroke=s["edge"], filt=True))
    p.append(svg_text(802, 413, "contract_report · R1", 13, "mono", s["accent"],
                      weight=700, budget=218, tag="out-rep-title"))
    p.append(svg_text(802, 431, "RFC 4180 CSV · sha256 · rows", 11, "mono",
                      s["sub"], budget=218, tag="out-rep-1"))
    p.append(svg_text(802, 448, "exports/contracts-2026-12-01.csv", 11, "mono",
                      s["faint"], budget=218, tag="out-rep-2"))

    # ---- shared append-only ledger band
    p.append(rect(*LEDGER, s["card"], r=20, stroke=s["edge"], filt=True))
    p.append(svg_text(64, 508, "contracts.jsonl · append-only", 16, "mono",
                      s["text"], weight=700, budget=380, tag="ledger-title"))
    p.append(svg_text(64, 532, "$DSH_HOME/storages/dsh-contract-renewal/contracts.jsonl",
                      12, "mono", s["faint"], budget=480, tag="ledger-path"))
    p.append(svg_text(1036, 508, "fixture 5 rows · one contract per line", 12.5,
                      "sans", s["sub"], anchor="end", budget=340, tag="ledger-1"))
    p.append(svg_text(1036, 532, "source contract files never read or modified", 12.5,
                      "sans", s["sub"], anchor="end", budget=340, tag="ledger-2"))
    title_w = measure("contracts.jsonl · append-only", 16, "mono")
    p.append(rect(64 + title_w + 26, 492, 64 + title_w + 76, 514, s["pill"], r=11))
    p.append(svg_text(64 + title_w + 51, 508, "R1", 11.5, "mono", s["accent"],
                      anchor="middle", weight=700, budget=40, tag="ledger-r1"))

    # ---- both sides meet at the ledger
    p.append(arrow(229, 462, 229, 478, s["accent"], 2))
    p.append(svg_text(240, 475, "append (R1)", 11.5, "mono", s["sub"], budget=110,
                      tag="append-label"))
    p.append(arrow(600, 480, 600, 464, s["accent"], 2))
    p.append(svg_text(610, 475, "load() — the same file", 11.5,
                      "mono", s["sub"], budget=250, tag="load-label"))

    # ---- footer rules
    p.append(svg_text(P, 574, "counts.total = expired + in_renewal_window + "
                              "expiring_soon + later · one contract, one bucket", 12.5,
                      "mono", s["sub"], budget=1000, tag="foot1"))
    p.append(svg_text(P, 598, "UTC calendar days · no TZ/DST drift · no network · "
                              "no model call · contract bodies never read", 12.5,
                      "sans", s["sub"], budget=1000, tag="foot2"))
    p.append(svg_text(P, 622, "errors: one human sentence | E_CONTRACT_* | one next step "
                              "· 12 stable codes · R0 read-only, R1 local write", 12,
                      "mono", s["faint"], budget=1000, tag="foot3"))
    p.append('</svg>')

    path = os.path.join(OUT, f"dsh-contract-renewal-flow-v5-{skin_name}.svg")
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(p) + "\n")
    print(f"wrote dsh-contract-renewal-flow-v5-{skin_name}.svg")


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    for skin_name in ("light", "dark"):
        for lang in ("zh", "en"):
            hero(lang, skin_name)
        flow_svg(skin_name)

    import xml.etree.ElementTree as ET

    for skin_name in ("light", "dark"):
        ET.parse(os.path.join(OUT, f"dsh-contract-renewal-flow-v5-{skin_name}.svg"))

    if FALLAS:
        for f in FALLAS:
            print(f"FAIL {f}")
        return 1
    print("all layout budgets satisfied")
    return 0


if __name__ == "__main__":
    sys.exit(main())
