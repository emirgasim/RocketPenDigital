#!/usr/bin/env python3
"""Validate multilingual news metadata, internal originality, article routes and image licensing."""
import json,re,sys,unicodedata
from collections import Counter
from datetime import date,timedelta
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from build_news_archive import visual_topic

archive_path=ROOT/"news/data/news.json"
headline_path=ROOT/"news/data/headlines.json"
data=json.loads(archive_path.read_text(encoding="utf-8"))
headlines=json.loads(headline_path.read_text(encoding="utf-8"))
stories=data.get("stories",[])
headline_stories=headlines.get("stories",[])
errors=[]

def norm(value):
    value=unicodedata.normalize("NFKC",str(value or "")).casefold()
    value=re.sub(r"[^\w\s]"," ",value,flags=re.UNICODE)
    return re.sub(r"\s+"," ",value).strip()

if not stories:
    errors.append("Archive is empty after the build.")
langs=Counter(s.get("lang") for s in stories)
published=Counter(s.get("lang") for s in stories if s.get("status")=="published")
for language in ("tr","en","ar"):
    if langs[language]<1:
        errors.append("No stories generated for "+language)
    if published[language]<10:
        errors.append(f"Fewer than 10 published archive stories available for {language}: {published[language]}")
if dict(langs)!=data.get("counts",{}):
    errors.append(f"Language count mismatch: {dict(langs)} vs {data.get('counts')}")

# Check exact duplicate titles and article bodies independently, not just exact title/body pairs.
# The language is part of each key so legitimate translations are not compared as duplicates.
all_stories=[("archive",s) for s in stories]+[("headlines",s) for s in headline_stories]
title_owner={}
body_owner={}
slugs=set()
image_urls={}
for origin,s in all_stories:
    language=s.get("lang","")
    slug=s.get("slug","")
    route=(language,slug)
    if not slug or route in slugs:
        errors.append(f"Duplicate or missing article route: {origin} {language}/{slug}")
    slugs.add(route)
    title_key=(language,norm(s.get("title")))
    body_key=(language,norm(s.get("body")))
    if title_key[1]:
        if title_key in title_owner:
            old=title_owner[title_key]
            errors.append(f"Duplicate normalized title ({language}): {old[0]}/{old[1]} and {origin}/{slug} — {s.get('title','')}")
        else:
            title_owner[title_key]=(origin,slug)
    if body_key[1]:
        if body_key in body_owner:
            old=body_owner[body_key]
            errors.append(f"Duplicate normalized article body ({language}): {old[0]}/{old[1]} and {origin}/{slug}")
        else:
            body_owner[body_key]=(origin,slug)

    if not s.get("title") or not s.get("body") or not s.get("category"):
        errors.append(f"Missing story fields: {origin} {language}/{slug}")
    if s.get("author")!="Gasim Piraliyev":
        errors.append(f"Wrong author for {origin} {language}/{slug}: {s.get('author')!r}")
    if not (s.get("dateDisplay") or s.get("dateISO")):
        errors.append(f"Missing publication date for {origin} {language}/{slug}")
    if s.get("dateISO") and not re.fullmatch(r"\d{4}-\d{2}-\d{2}",str(s["dateISO"])):
        errors.append(f"Invalid ISO publication date for {origin} {language}/{slug}: {s.get('dateISO')!r}")

    url=s.get("imageUrl","")
    if url:
        image_urls[url]=f"{origin} {language}/{slug}"
    if origin=="archive":
        is_recent=bool(s.get("dateISO") and (date.today()-timedelta(days=int(data.get("recentPhotoWindowDays",90)))).isoformat()<=s["dateISO"]<=date.today().isoformat())
        if is_recent and s.get("imageType")=="photograph":
            if not url.startswith("https://upload.wikimedia.org/"):
                errors.append(f"Invalid photo URL for recent story: {language}/{slug} => {url}")
            if not s.get("imageSourceUrl") or not s.get("imageLicense") or not s.get("imageCredit"):
                errors.append(f"Missing photo source/license/credit metadata for recent story: {language}/{slug}")
        elif is_recent:
            if s.get("imageType")!="missing" or url:
                errors.append(f"Recent story must have a verified photo or remain text-only: {language}/{slug}")
        elif s.get("imageType")!="archive" or url:
            errors.append(f"Historical archive story must be text-only: {language}/{slug}")

for s in headline_stories:
    if s.get("editorialOriginal") is not True:
        errors.append(f"Headline not marked as original editorial content: {s.get('slug')}")
    if not isinstance(s.get("sources"),list) or not s["sources"]:
        errors.append(f"Original headline has no verification sources: {s.get('slug')}")

for language in ("tr","en","ar"):
    page=ROOT/f"news/{language}/index.html"
    html=page.read_text(encoding="utf-8")
    if html.count('id="news-home-slider"')!=1:
        errors.append(language+": slider section count is not one")
    for ident in ("home-slider-track","home-slider-prev","home-slider-next","home-slider-dots","news-list","news-pagination"):
        if html.count(f'id="{ident}"')!=1:
            errors.append(f"{language}: element #{ident} count is not one")
    if "news.js?v=20261023-6" not in html:
        errors.append(f"{language}: news JS cache version is stale")

js=(ROOT/"news/assets/news.js").read_text(encoding="utf-8")
for token in ("published","Yayın tarihi","Gasim Piraliyev","featured.has(s.slug)"):
    if token not in js:
        errors.append("News listing missing expected metadata/dedup logic: "+token)
article=(ROOT/"news/article.html").read_text(encoding="utf-8")
for token in ("date:'Published'","date:'Yayın tarihi'","date:'تاريخ النشر'","Gasim Piraliyev","story-meta"):
    if token not in article:
        errors.append("Article template missing publication metadata: "+token)
if "credit.hidden=!required" not in article:
    errors.append("Article image credits are not conditional on attribution requirements.")

if errors:
    print("NEWS QA FAILED")
    for error in errors[:100]:
        print(" - "+error)
    print("Total issues:",len(errors))
    raise SystemExit(1)
print(f"NEWS QA PASSED: archive={len(stories)} headlines={len(headline_stories)} language_counts={dict(langs)}; exact normalized duplicate title/body check passed; every story has publication date and author Gasim Piraliyev; image source/license metadata retained.")
