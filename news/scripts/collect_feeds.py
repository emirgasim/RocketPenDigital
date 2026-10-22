#!/usr/bin/env python3
"""API-free RSS/Atom intake. Stores source-linked metadata for editorial review only."""
import hashlib, html, json, re, sys, urllib.error, urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from email.utils import parsedate_to_datetime

ROOT = Path(__file__).resolve().parents[2]
SOURCE_FILE = ROOT / "news" / "sources.json"
QUEUE_FILE = ROOT / "news" / "queue" / "items.json"
REPORT_FILE = ROOT / "news" / "queue" / "latest-run.md"
USER_AGENT = "RocketPenTechNewsroom/1.0 (+https://rocketpendigital.com/news/)"
def now():
    return datetime.now(timezone.utc).isoformat()
def clean(value):
    value = html.unescape(value or "")
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", value).strip()
def date_value(value):
    if not value: return ""
    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except (TypeError, ValueError, OverflowError):
        return value.strip()
def local(tag):
    return tag.rsplit("}", 1)[-1].lower()
def text_for(node, names):
    for child in node.iter():
        if local(child.tag) in names and child.text and child.text.strip():
            return child.text.strip()
    return ""
def parse_feed(payload, source):
    root = ET.fromstring(payload)
    nodes = [e for e in root.iter() if local(e.tag) in ("item", "entry")]
    out = []
    for node in nodes[:30]:
        title = clean(text_for(node, {"title"}))
        link = ""
        for child in node.iter():
            if local(child.tag) == "link":
                href = child.attrib.get("href", "").strip()
                rel = child.attrib.get("rel", "alternate")
                if href and rel in ("alternate", ""):
                    link = href; break
                if child.text and child.text.strip():
                    link = child.text.strip(); break
        if not link:
            link = clean(text_for(node, {"guid", "id"}))
        if not title or not link.startswith(("https://", "http://")):
            continue
        summary = clean(text_for(node, {"description", "summary", "content", "encoded"}))
        published = date_value(text_for(node, {"pubdate", "published", "updated", "date", "issued"}))
        item_id = hashlib.sha256(link.split("#", 1)[0].rstrip("/").encode()).hexdigest()
        out.append({
            "id": item_id, "title": title[:300],
            "source_name": clean(source.get("name")) or "Unnamed source",
            "source_url": source["url"], "article_url": link,
            "published_at": published, "summary": summary[:1600],
            "language": source.get("language", "und"),
            "category": source.get("category", "technology"),
            "status": "needs_editor_review", "risk": "unassessed",
            "collected_at": now(),
            "note": "Metadata only. Verify facts and rights; do not republish source text verbatim."
        })
    return out
def main():
    try:
        config = json.loads(SOURCE_FILE.read_text(encoding="utf-8"))
        feeds = config.get("feeds", [])
        if not isinstance(feeds, list): raise ValueError("feeds must be a list")
    except Exception as exc:
        print("Invalid source configuration: " + str(exc), file=sys.stderr); return 2
    QUEUE_FILE.parent.mkdir(parents=True, exist_ok=True)
    try:
        old = json.loads(QUEUE_FILE.read_text(encoding="utf-8")) if QUEUE_FILE.exists() else {"items": []}
    except Exception:
        print("Existing queue is invalid; refusing to overwrite.", file=sys.stderr); return 2
    by_id = {x.get("id"): x for x in old.get("items", []) if x.get("id")}
    errors, fetched = [], 0
    for source in feeds:
        url = str(source.get("url", "")).strip()
        if not url.startswith("https://"):
            errors.append("- Skipped " + str(source.get("name", "unnamed source")) + ": URL must use HTTPS.")
            continue
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml"})
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                if response.status != 200: raise ValueError("HTTP " + str(response.status))
                payload = response.read(2_000_000)
            entries = parse_feed(payload, source); fetched += len(entries)
            for entry in entries:
                if entry["id"] not in by_id: by_id[entry["id"]] = entry
        except (urllib.error.URLError, TimeoutError, ValueError, ET.ParseError, OSError) as exc:
            errors.append("- " + (clean(source.get("name")) or url) + ": " + type(exc).__name__ + ": " + str(exc)[:180])
    items = sorted(by_id.values(), key=lambda x: x.get("published_at", ""), reverse=True)
    QUEUE_FILE.write_text(json.dumps({"updated_at": now(), "items": items}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    today = datetime.now(timezone.utc).date().isoformat()
    new_today = sum(1 for item in items if item.get("collected_at", "").startswith(today))
    report = [
        "# RocketPen Tech — feed collection report", "",
        "- Run time (UTC): " + now(), "- Configured feeds: " + str(len(feeds)),
        "- Items fetched this run: " + str(fetched), "- New items collected today (UTC): " + str(new_today),
        "- Total unique queued items: " + str(len(items)),
        "- Publishing: disabled; all items remain in editorial review.",
        "- AI/API dependency: none.", "", "## Feed errors"
    ]
    report.extend(errors or ["- None."])
    if not feeds:
        report.extend(["", "## Setup needed", "Add curated HTTPS RSS/Atom feed URLs to news/sources.json. No sources are silently assumed."])
    REPORT_FILE.write_text("\n".join(report) + "\n", encoding="utf-8")
    print("Fetched %d items; queue contains %d unique items; %d feed errors." % (fetched, len(items), len(errors)))
    return 0
if __name__ == "__main__":
    raise SystemExit(main())
