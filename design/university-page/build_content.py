"""Snapshot drive_sync output into assets/content.js for the Guidebook mockup.

    python3 design/university-page/build_content.py SYNC_DIR [--year 2026-2027]
        [--slugs aub,aust,usj] [--report]

SYNC_DIR is a `python -m drive_sync --out-prefix` directory. The derivations
here are a prototype of what the real build would do at build time: every fact
is omitted rather than guessed when the tables don't support it.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import tomllib
import unicodedata
from collections import Counter
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
LOCALES = ("en", "ar")

REF_HEADERS = {"reference", "source", "link", "references", "المرجع", "المصدر", "الرابط"}
SOURCES_LINE = re.compile(r"^(?:Reference|References|Source|Sources|المرجع|المراجع|المصدر)\s*:\s*(.*)$")
LEAD = re.compile(r"^\*\*[^*]+\*\*:?$")
LINK = re.compile(r"\[((?:\\.|[^\[\]])*)\]\(([^)\s]+)\)")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
PHONE = re.compile(r"\+\d{1,3}(?:[ -]?\d){6,14}")
MONEY = re.compile(r"(?P<cur>\$|€|USD|EUR|LBP)\s?(?P<num>\d[\d,]*(?:\.\d+)?)|(?P<num2>\d[\d,]*(?:\.\d+)?)\s?(?P<cur2>\$|€|ل\.ل)")
PER_CREDIT = r"per credit|credit hour|لكل ساعة|بالساعة|للساعة|سعر الساعة"
FIELD = re.compile(r"(\w+):\s*('(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?)")
OPENS = re.compile(r"^(opens?|يفتح|تفتح|يُفتح|تُفتح)$", re.I)
CLOSES = re.compile(r"^(closes?|يغلق|يُغلق|تقفل|تُقفل|يقفل)$|deadline|last day|الموعد النهائي|آخر يوم", re.I)
EN_MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}
AR_MONTHS = {
    "كانون الثاني": 1, "شباط": 2, "آذار": 3, "نيسان": 4, "أيار": 5, "حزيران": 6,
    "تموز": 7, "آب": 8, "أيلول": 9, "تشرين الأول": 10, "تشرين الثاني": 11, "كانون الأول": 12,
}


def normalize(text: str) -> str:
    return re.sub(r"[\W_]+", "", text.casefold())


def plain(md: str) -> str:
    text = LINK.sub(lambda m: m.group(1), md)
    text = re.sub(r"\*\*\*|\*\*", "", text)
    text = re.sub(r"(?<![\w])_(\S.*?\S|\S)_(?![\w])", r"\1", text)
    return re.sub(r"\\(.)", r"\1", text).strip()


def unescape(text: str) -> str:
    return re.sub(r"\\([\\<>{}*_|\[\]#])", r"\1", text)


def autolink(escaped: str) -> str:
    def phone(m: re.Match) -> str:
        digits = re.sub(r"[^\d+]", "", m.group(0))
        return f'<a class="tel" dir="ltr" href="tel:{digits}">{m.group(0)}</a>'

    def email(m: re.Match) -> str:
        local, domain = m.group(0).split("@", 1)
        return f'<a href="mailto:{m.group(0)}">{local}@<wbr>{domain}</a>'

    escaped = EMAIL.sub(email, escaped)
    return PHONE.sub(phone, escaped)


def emphasis(escaped: str) -> str:
    escaped = re.sub(r"\*\*\*(.+?)\*\*\*", r"<strong><em>\1</em></strong>", escaped)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    return re.sub(r"(?<![\w])_(\S.*?\S|\S)_(?![\w])", r"<em>\1</em>", escaped)


def anchor(url: str, label_html: str) -> str:
    external = url.startswith("http")
    rel = ' target="_blank" rel="noopener noreferrer"' if external else ""
    return f'<a href="{html.escape(url, quote=True)}"{rel}>{label_html}</a>'


def inline(md: str) -> str:
    links: list[str] = []

    def stash(m: re.Match) -> str:
        label = emphasis(html.escape(unescape(m.group(1)), quote=False))
        links.append(anchor(m.group(2), label))
        return f"\x00{len(links) - 1}\x00"

    text = LINK.sub(stash, md)
    out = emphasis(autolink(html.escape(unescape(text), quote=False)))
    return re.sub("\x00(\\d+)\x00", lambda m: links[int(m.group(1))], out)


class Slugger:
    """Docusaurus heading ids (github-slugger rules)."""

    def __init__(self) -> None:
        self.seen: dict[str, int] = {}

    def __call__(self, text: str) -> str:
        keep = []
        for ch in text.lower():
            cat = unicodedata.category(ch)
            if ch.isalnum() or ch in " -_" or cat[0] == "M" or cat == "Pc":
                keep.append(ch)
        base = "".join(keep).replace(" ", "-")
        slug = base
        while slug in self.seen:
            self.seen[base] += 1
            slug = f"{base}-{self.seen[base]}"
        self.seen[slug] = 0
        return slug


def split_row(line: str) -> list[str]:
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|") and not line.endswith("\\|"):
        line = line[:-1]
    cells, cur, i = [], [], 0
    while i < len(line):
        ch = line[i]
        if ch == "\\" and i + 1 < len(line):
            cur.append(line[i : i + 2])
            i += 2
            continue
        if ch == "|":
            cells.append("".join(cur).strip())
            cur = []
        else:
            cur.append(ch)
        i += 1
    cells.append("".join(cur).strip())
    return cells


def ref_cell(md: str) -> dict | None:
    md = md.strip()
    if not md or md in {"—", "-", "–"}:
        return None
    m = LINK.fullmatch(md)
    if m:
        return {"label": plain(m.group(1)), "url": m.group(2)}
    if re.fullmatch(r"https?://\S+", md):
        host = re.sub(r"^https?://(www\.)?", "", md).split("/")[0]
        return {"label": host, "url": md}
    return {"html": inline(md)}


def parse_table(lines: list[str]) -> dict:
    rows = [split_row(line) for line in lines if not re.fullmatch(r"\|?[\s:|-]+\|?", line.strip())]
    head, body = rows[0], rows[1:]
    width = len(head)
    body = [(r + [""] * width)[:width] for r in body]
    refs_at = [i for i, h in enumerate(head) if normalize(plain(h)) in {normalize(x) for x in REF_HEADERS}]
    ref = refs_at[-1] if refs_at and len(head) > 1 else None
    refs = [ref_cell(r[ref]) for r in body] if ref is not None else [None] * len(body)
    shared = None
    urls = {x.get("url") for x in refs if x}
    if ref is not None and len(urls) == 1 and all(x is None or "url" in x for x in refs) and all(refs):
        shared = next(x for x in refs if x)
        refs = [None] * len(body)
    keep = [i for i in range(width) if i != ref]
    shape = "list" if len(keep) == 1 else "kv" if len(keep) <= 3 else "wide"
    plain_head = [plain(h) for h in head]
    plain_rows = [[plain(c) for c in r] for r in body]
    return {
        "t": "table",
        "shape": shape,
        "windows": windows(plain_head, plain_rows, keep) if len(keep) > 1 else None,
        "head": [plain(head[i]) for i in keep],
        "rows": [[inline(r[i]) for i in keep] for r in body],
        "cells": [[plain(r[i]) for i in keep] for r in body],
        "refs": refs,
        "sharedRef": shared,
        "raw": {"head": [plain(h) for h in head], "rows": [[plain(c) for c in r] for r in body]},
    }


def parse_date(text: str) -> str | None:
    """A full calendar date, or None: "Oct 31, 2025", "1 Aug 2025", "31 تشرين الأول 2025"."""
    t = re.sub(r"\s*\([^)]*\)\s*$", "", text.strip())
    m = re.fullmatch(r"([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})", t) or re.fullmatch(r"(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})", t)
    if m:
        a, b, year = m.groups()
        month, day = (a, b) if a[0].isalpha() else (b, a)
        num = EN_MONTHS.get(month[:3].lower())
        return f"{year}-{num:02d}-{int(day):02d}" if num and 1 <= int(day) <= 31 else None
    m = re.fullmatch(r"(\d{1,2})\s+(.+?)(?:/\S+)?\s+(\d{4})", t)
    if m and m.group(2) in AR_MONTHS:
        return f"{m.group(3)}-{AR_MONTHS[m.group(2)]:02d}-{int(m.group(1)):02d}"
    return None


def windows(head: list[str], rows: list[list[str]], keep: list[int]) -> dict | None:
    closes = next((i for i in keep if CLOSES.search(head[i].strip())), None)
    if closes is None:
        return None
    opens = next((i for i in keep if OPENS.match(head[i].strip())), None)
    return {
        "title": keep.index(next(i for i in keep if i not in (opens, closes))),
        "opens": keep.index(opens) if opens is not None else None,
        "closes": keep.index(closes),
        "dates": [{"opens": parse_date(r[opens]) if opens is not None else None, "closes": parse_date(r[closes])} for r in rows],
    }


def parse_js_string(literal: str) -> str:
    inner = literal[1:-1].replace("\\'", "'")
    return json.loads('"' + inner + '"')


def parse_component(chunk: str) -> dict:
    name = re.match(r"<(\w+)", chunk.strip()).group(1)
    rows = []
    for line in chunk.splitlines():
        line = line.strip()
        if line.startswith("{") and line.rstrip(",").endswith("}"):
            row = {}
            for key, value in FIELD.findall(line):
                row[key] = parse_js_string(value) if value.startswith("'") else json.loads(value)
            rows.append(row)
    return {"t": "majors" if name == "MajorsTable" else "component", "name": name, "rows": rows}


def paragraph(text: str) -> dict:
    m = SOURCES_LINE.match(text)
    if m:
        links = [{"label": plain(a), "url": u} for a, u in LINK.findall(m.group(1))]
        if links:
            return {"t": "sources", "links": links}
    if LEAD.match(text):
        return {"t": "lead", "html": inline(text.strip("*").rstrip(":").strip("*"))}
    return {"t": "p", "html": inline(text)}


def starts_block(line: str) -> bool:
    s = line.strip()
    return bool(re.match(r"(#{2,6} |\||>|- |\d+\. |<[A-Z])", s))


def parse_blocks(lines: list[str], slugger: Slugger) -> list[dict]:
    blocks: list[dict] = []
    i = 0
    while i < len(lines):
        s = lines[i].strip()
        if not s:
            i += 1
            continue
        m = re.match(r"(#{3,6})(?:\s+(.*))?$", s)
        if m:
            text = (m.group(2) or "").strip()
            if text:
                blocks.append({"t": "h", "level": len(m.group(1)), "md": text, "html": inline(text), "text": plain(text), "id": slugger(plain(text))})
            i += 1
            continue
        if re.match(r"<[A-Z]", s):
            j, chunk = i, []
            while j < len(lines):
                chunk.append(lines[j])
                t = lines[j].strip()
                if t.endswith("/>") or re.match(r"</[A-Z]\w*>", t):
                    break
                j += 1
            blocks.append(parse_component("\n".join(chunk)))
            i = j + 1
            continue
        if s.startswith("|"):
            j = i
            while j < len(lines) and lines[j].strip().startswith("|"):
                j += 1
            blocks.append(parse_table(lines[i:j]))
            i = j
            continue
        if s.startswith(">"):
            j, paras, cur = i, [], []
            while j < len(lines) and lines[j].strip().startswith(">"):
                t = lines[j].strip()[1:].strip()
                if t:
                    cur.append(re.sub(r"^\*\s+", "", t) if not cur else t)
                elif cur:
                    paras.append(" ".join(cur))
                    cur = []
                j += 1
            if cur:
                paras.append(" ".join(cur))
            blocks.append({"t": "note", "paras": [inline(p) for p in paras]})
            i = j
            continue
        if re.match(r"(- |\d+\. )", s):
            ordered = bool(re.match(r"\d+\. ", s))
            items: list[str] = []
            j = i
            while j < len(lines) and lines[j].strip() and not re.match(r"(#{2,6} |\||>|<[A-Z])", lines[j].strip()):
                t = lines[j].strip()
                im = re.match(r"(?:- |\d+\. )(.*)", t)
                if im:
                    items.append(im.group(1))
                elif items:
                    items[-1] += " " + t
                j += 1
            blocks.append({"t": "ol" if ordered else "ul", "items": [inline(x) for x in items]})
            i = j
            continue
        j, parts = i, []
        while j < len(lines) and lines[j].strip() and (j == i or not starts_block(lines[j])):
            parts.append(lines[j].strip())
            j += 1
        blocks.append(paragraph(" ".join(parts)))
        i = j
    return merge_faculties(blocks)


def merge_faculties(blocks: list[dict]) -> list[dict]:
    out: list[dict] = []
    for block in blocks:
        prev = out[-1] if out else None
        if block["t"] == "majors" and prev and prev["t"] == "h":
            heading = out.pop()
            m = re.match(r"^(.*?)\s*\(\s*\[([^\]]+)\]\(([^)]+)\)\s*\)\s*$", heading["md"])
            out.append({
                "t": "faculty",
                "id": heading["id"],
                "level": heading["level"],
                "html": heading["html"],
                "name": plain(m.group(1)) if m else heading["text"],
                "abbr": plain(m.group(2)) if m else None,
                "url": m.group(3) if m else None,
                "rows": block["rows"],
            })
        else:
            out.append(block)
    return out


def split_frontmatter(text: str) -> tuple[dict, str]:
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    fm = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            fm[key.strip()] = value.strip()
    return fm, text[m.end():]


def load_rules() -> list[dict]:
    data = tomllib.loads((ROOT / "scripts/drive_sync/mapping.toml").read_text(encoding="utf-8"))
    return data["sections"]["university"]


def section_key(heading: str, rules: list[dict]) -> str | None:
    text = re.sub(r"\s*\((?:AY|للعام)\s[^)]*\)\s*$", "", heading).strip()
    for rule in rules:
        if text in rule["labels"].values():
            return rule["key"]
    norm = normalize(text)
    hits = [(len(normalize(a)), rule["key"]) for rule in rules for a in rule["aliases"] if normalize(a) and normalize(a) in norm]
    return max(hits)[1] if hits else None


def parse_doc(path: Path, rules: list[dict]) -> dict:
    fm, body = split_frontmatter(path.read_text(encoding="utf-8"))
    slugger = Slugger()
    h1, stale, sections, cur = None, None, [], None
    lines = body.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("# ") and h1 is None and cur is None:
            h1 = line[2:].strip()
            slugger(plain(h1))
        elif line.startswith(":::") and cur is None and len(line) > 3:
            m = re.match(r":::(\w+)(?:\[(.*)\])?", line)
            j, content = i + 1, []
            while j < len(lines) and not lines[j].startswith(":::"):
                if lines[j].strip():
                    content.append(lines[j].strip())
                j += 1
            stale = {"kind": m.group(1), "title": plain(m.group(2) or ""), "html": inline(" ".join(content))}
            i = j
        elif line.startswith("## "):
            heading = line[3:].strip()
            cur = {"heading": plain(heading), "id": slugger(plain(heading)), "key": section_key(plain(heading), rules), "lines": []}
            sections.append(cur)
        elif cur is not None:
            cur["lines"].append(line)
        i += 1
    for section in sections:
        section["blocks"] = parse_blocks(section.pop("lines"), slugger)
    return {"fm": fm, "h1": h1, "stale": stale, "sections": sections}


def money(text: str) -> tuple[str, float] | None:
    m = MONEY.search(text)
    if not m:
        return None
    cur = m.group("cur") or m.group("cur2")
    num = m.group("num") or m.group("num2")
    cur = {"USD": "$", "EUR": "€", "ل.ل": "LBP"}.get(cur, cur)
    return cur, float(num.replace(",", ""))


def tables(section: dict | None) -> list[dict]:
    return [b for b in section["blocks"] if b["t"] == "table"] if section else []


def first_ref(table: dict, row: int) -> dict | None:
    ref = table["refs"][row] if row < len(table["refs"]) else None
    return ref if ref and "url" in ref else table["sharedRef"]


def derive_fee(section: dict | None) -> tuple[dict | None, str]:
    for table in tables(section):
        head = table["raw"]["head"]
        if not re.search(r"fee|الرسم", head[0], re.I):
            continue
        amount_col = next((i for i, h in enumerate(head) if re.search(r"amount|القيمة|المبلغ", h, re.I)), 1)
        for r, row in enumerate(table["raw"]["rows"]):
            if re.search(r"application|admission|تقديم|طلب|القبول", row[0], re.I) and re.search(r"\d", row[amount_col]):
                return {"value": row[amount_col], "label": row[0], "source": first_ref(table, r)}, "row"
        return None, "no application-fee row"
    return None, "no fee table"


def derive_tuition(section: dict | None) -> tuple[dict | None, str]:
    values, source = [], None
    for table in tables(section):
        head = table["raw"]["head"]
        col = next((i for i, h in enumerate(head) if re.search(PER_CREDIT, h, re.I)), None)
        for r, row in enumerate(table["raw"]["rows"]):
            if col is None and values:
                break
            cells = [row[col]] if col is not None else [c for c in row[1:] if re.search(PER_CREDIT, row[0], re.I)]
            for cell in cells:
                if re.search(r"year|flat|semester|سنة|سنوي|ثابت|فصل", cell, re.I):
                    continue
                parsed = money(cell)
                if parsed:
                    values.append(parsed)
                    source = source or first_ref(table, r)
    if not values:
        return None, "no per-credit figures"
    currencies = {c for c, _ in values}
    if len(currencies) != 1:
        return None, "mixed currencies"
    nums = [v for _, v in values]
    cur = currencies.pop()
    has_notes = any(b["t"] == "note" for b in section["blocks"])
    return {"min": min(nums), "max": max(nums), "currency": cur, "notes": has_notes, "source": source}, "table"


def section_source(section: dict | None) -> dict | None:
    links = [link for b in (section["blocks"] if section else []) if b["t"] == "sources" for link in b["links"]]
    return links[0] if links else None


def derive_contact(section: dict | None) -> tuple[dict | None, str]:
    for table in tables(section):
        head = table["raw"]["head"]
        phone_col = next((i for i, h in enumerate(head) if re.search(r"phone|الهاتف|tel", h, re.I)), None)
        rows = table["raw"]["rows"]
        order = sorted(range(len(rows)), key=lambda r: 0 if re.search(r"admission|القبول", rows[r][0], re.I) else 1)
        for r in order:
            row = rows[r]
            email = EMAIL.search(" ".join(row))
            phone = row[phone_col] if phone_col is not None and re.search(r"\d", row[phone_col]) else None
            if email or phone:
                return {"office": row[0], "phone": phone, "email": email.group(0) if email else None}, "row"
    return None, "no contacts table"


def load_deadlines() -> list[dict]:
    text = (ROOT / "src/data/homepage/deadlines.ts").read_text(encoding="utf-8")
    ar = json.loads((ROOT / "i18n/ar/code.json").read_text(encoding="utf-8"))
    entries = []
    for chunk in text.split("ref:")[1:]:
        ref = re.search(r"plugin:\s*'(\w+)',\s*id:\s*'([\w-]+)'", chunk)
        tid = re.search(r"id:\s*'(homepage\.deadline\.[\w.]+)'", chunk)
        msg = re.search(r"message:\s*(['\"])(.*?)\1", chunk)
        fields = dict(re.findall(r"(opens|closes|sourceUrl|verifiedOn):\s*'([^']+)'", chunk))
        entries.append({
            "plugin": ref.group(1),
            "id": ref.group(2),
            "title": {"en": msg.group(2), "ar": ar.get(tid.group(1), {}).get("message", msg.group(2))},
            **fields,
        })
    return entries


def load_logos() -> dict[str, dict]:
    text = (ROOT / "src/data/homepage/logos.ts").read_text(encoding="utf-8")
    logos = {}
    for m in re.finditer(r"\n  (\w+): \{(.*?)\n  \},", text, re.S):
        file = re.search(r"file:\s*'([^']+)'", m.group(2))
        tone = re.search(r"tone:\s*'(\w+)'", m.group(2))
        logos[m.group(1)] = {"file": file.group(1), "tone": tone.group(1) if tone else "light"}
    return logos


def doc_path(sync: Path, year: str, locale: str, slug: str) -> Path:
    if locale == "en":
        return sync / "universities_versioned_docs" / f"version-{year}" / f"{slug}.mdx"
    return sync / "i18n" / locale / "docusaurus-plugin-content-docs-universities" / f"version-{year}" / f"{slug}.mdx"


def build_doc(path: Path, slug: str, locale: str, year: str, rules: list[dict], deadlines: list[dict]) -> dict:
    doc = parse_doc(path, rules)
    fm = doc["fm"]
    by_key = {s["key"]: s for s in doc["sections"] if s["key"]}
    title = fm.get("title", "")
    short, _, full = title.partition("—")
    rows = [row for s in doc["sections"] for b in s["blocks"] if b["t"] == "faculty" for row in b["rows"]]
    units = sum(1 for s in doc["sections"] for b in s["blocks"] if b["t"] == "faculty")
    fee, fee_why = derive_fee(by_key.get("application"))
    tuition, tuition_why = derive_tuition(by_key.get("tuition"))
    contact, contact_why = derive_contact(by_key.get("contacts"))
    for fact, key in ((fee, "application"), (tuition, "tuition")):
        if fact and not fact["source"]:
            fact["source"] = section_source(by_key.get(key))
    deadline = next((d for d in deadlines if d["plugin"] == "universities" and d["id"] == slug), None)
    scholarships = sum(len(t["rows"]) for t in tables(by_key.get("scholarships")) if len(t["raw"]["head"]) >= 3)
    apply_url = fm.get("apply_url")
    return {
        "slug": slug,
        "locale": locale,
        "version": year,
        "contentYear": fm.get("content_year", year),
        "title": title,
        "shortName": short.strip() if full else fm.get("sidebar_label", slug.upper()),
        "fullName": full.strip() if full else title,
        "h1": doc["h1"],
        "applyUrl": apply_url,
        "applyHost": re.sub(r"^https?://(www\.)?", "", apply_url).split("/")[0] if apply_url else None,
        "stale": doc["stale"],
        "sections": doc["sections"],
        "facts": {
            "programs": {"count": len(rows), "units": units},
            "fee": fee,
            "tuition": tuition,
            "deadline": deadline,
            "contact": contact,
            "scholarships": scholarships or None,
        },
        "why": {"fee": fee_why, "tuition": tuition_why, "contact": contact_why},
    }


def mdx_links(path: Path) -> Counter:
    text = path.read_text(encoding="utf-8")
    return Counter(re.findall(r"\]\((https?://[^)\s]+)\)", text) + re.findall(r"source: '(https?://[^']+)'", text))


def html_strings(doc: dict) -> list[str]:
    out = [doc["stale"]["html"]] if doc["stale"] else []
    for section in doc["sections"]:
        for b in section["blocks"]:
            out += [b[k] for k in ("html",) if k in b]
            out += b.get("items", []) + b.get("paras", [])
            out += [cell for row in b.get("rows", []) if isinstance(row, list) for cell in row]
            out += [r["html"] for r in b.get("refs", []) if r and "html" in r]
    return out


def kept_links(doc: dict) -> Counter:
    kept = Counter(html.unescape(url) for h in html_strings(doc) for url in re.findall(r'<a href="([^"]+)"', h))
    for section in doc["sections"]:
        for b in section["blocks"]:
            if b["t"] == "table":
                kept.update(r["url"] for r in b["refs"] if r and "url" in r)
                if b["sharedRef"]:
                    kept.update([b["sharedRef"]["url"]] * len(b["rows"]))
            if b["t"] == "sources":
                kept.update(link["url"] for link in b["links"])
            if b["t"] == "faculty":
                kept.update(r["source"] for r in b["rows"] if r.get("source"))
    return kept


def strip_internal(doc: dict) -> dict:
    for section in doc["sections"]:
        for b in section["blocks"]:
            b.pop("raw", None)
            b.pop("md", None)
    doc.pop("why", None)
    return doc


def sidebar(sync: Path, year: str, locale: str) -> list[dict]:
    items = []
    for path in sorted(doc_path(sync, year, locale, "x").parent.glob("*.mdx")):
        fm, _ = split_frontmatter(path.read_text(encoding="utf-8"))
        items.append({"slug": path.stem, "label": fm.get("sidebar_label", path.stem), "position": int(fm.get("sidebar_position", 99))})
    return sorted(items, key=lambda x: (x["position"], x["slug"]))


def money_text(t: dict) -> str:
    fmt = lambda v: f"{t['currency']}{v:,.0f}"
    return fmt(t["min"]) if t["min"] == t["max"] else f"{fmt(t['min'])}–{fmt(t['max'])}"


def report(sync: Path, year: str, rules: list[dict], deadlines: list[dict]) -> None:
    print("| University | Locale | Programs | Application fee | Tuition per credit | Deadline status | Contact |")
    print("|---|---|---|---|---|---|---|")
    for item in sidebar(sync, year, "en"):
        for locale in LOCALES:
            path = doc_path(sync, year, locale, item["slug"])
            if not path.exists():
                continue
            d = build_doc(path, item["slug"], locale, year, rules, deadlines)
            f, why = d["facts"], d["why"]
            fee = f["fee"]["value"] if f["fee"] else f"— ({why['fee']})"
            tuition = money_text(f["tuition"]) + (" + notes" if f["tuition"]["notes"] else "") if f["tuition"] else f"— ({why['tuition']})"
            deadline = "curated entry" if f["deadline"] else "— (none curated)"
            contact = (f["contact"]["email"] or f["contact"]["phone"]) if f["contact"] else f"— ({why['contact']})"
            print(f"| {item['label']} | {locale} | {f['programs']['count']} | {fee} | {tuition} | {deadline} | {contact} |")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("sync", type=Path)
    parser.add_argument("--year", default="2026-2027")
    parser.add_argument("--slugs", default="", help="comma-separated; default: every university in the sync")
    parser.add_argument("--out", type=Path, default=HERE / "assets" / "content.js")
    parser.add_argument("--report", action="store_true")
    args = parser.parse_args()

    rules, deadlines, logos = load_rules(), load_deadlines(), load_logos()
    if args.report:
        report(args.sync, args.year, rules, deadlines)
        return 0

    slugs = args.slugs.split(",") if args.slugs else [item["slug"] for item in sidebar(args.sync, args.year, "en")]
    docs, problems = {}, []
    for slug in slugs:
        docs[slug] = {"logo": logos.get(slug)}
        for locale in LOCALES:
            path = doc_path(args.sync, args.year, locale, slug)
            doc = build_doc(path, slug, locale, args.year, rules, deadlines)
            lost = mdx_links(path) - kept_links(doc)
            if lost:
                problems.append(f"{slug}/{locale}: {sum(lost.values())} links dropped: {', '.join(lost)}")
            docs[slug][locale] = strip_internal(doc)
    payload = {
        "snapshot": {"synced": date.today().isoformat(), "version": args.year, "source": "python -m drive_sync (Google Drive, v2 tree)"},
        "sidebar": {locale: sidebar(args.sync, args.year, locale) for locale in LOCALES},
        "docs": docs,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    args.out.write_text("// Generated by build_content.py from drive_sync output. Do not edit.\nwindow.UNIVERSITY_MOCKUP = " + body + ";\n", encoding="utf-8")
    print(f"wrote {args.out} ({len(slugs)} universities, {len(body) // 1024} KB)")
    for problem in problems:
        print("link check:", problem, file=sys.stderr)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
