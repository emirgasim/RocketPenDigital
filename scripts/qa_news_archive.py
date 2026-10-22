#!/usr/bin/env python3
"""Fail deployment when unique cover assets or archive/display invariants do not hold."""
import hashlib,json,re,sys
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/"scripts"));from build_news_archive import visual_topic
data=json.loads((ROOT/"news/data/news.json").read_text(encoding="utf-8"));stories=data.get("stories",[]);errors=[]
if not stories:errors.append("Archive is empty.")
langs=Counter(s.get("lang") for s in stories)
published=Counter(s.get("lang") for s in stories if s.get("status")=="published")
for language in ("tr","en","ar"):
 if langs[language]<1:errors.append("No stories generated for "+language)
 if published[language]<10:errors.append(f"Fewer than 10 published stories available for {language} slider: {published[language]}")
if dict(langs)!=data.get("counts",{}):errors.append(f"Language count mismatch: {dict(langs)} vs {data.get('counts')}")
slugs=set();urls={};hashes={};fingerprints=set()
for s in stories:
 language=s.get("lang","");slug=s.get("slug","")
 if not slug or (language,slug) in slugs:errors.append(f"Duplicate story route: {language}/{slug}")
 slugs.add((language,slug))
 norm=lambda v:re.sub(r"\s+"," ",re.sub(r"[^\w\s]"," ",(v or "").casefold())).strip();fp=(language,norm(s.get("title")),norm(s.get("body")))
 if fp in fingerprints:errors.append(f"Duplicate article content: {language}/{slug}")
 fingerprints.add(fp)
 if not s.get("title") or not s.get("body") or not s.get("category"):errors.append(f"Missing story fields: {language}/{slug}")
 expected=f"/news/assets/generated/{slug}.svg";url=s.get("imageUrl")
 if url!=expected:errors.append(f"Incorrect cover URL: {language}/{slug} => {url}")
 if url in urls:errors.append(f"Cover URL shared by {urls[url]} and {language}/{slug}")
 urls[url]=f"{language}/{slug}";path=ROOT/expected.lstrip("/")
 if not path.is_file():errors.append(f"Missing artwork file: {language}/{slug}")
 else:
  raw=path.read_bytes();digest=hashlib.sha256(raw).hexdigest();svg=raw.decode("utf-8")
  if digest in hashes:errors.append(f"Identical cover content shared by {hashes[digest]} and {language}/{slug}")
  hashes[digest]=f"{language}/{slug}";topic=visual_topic(s)
  if s.get("visualTopic")!=topic:errors.append(f"Visual subject mapping mismatch: {language}/{slug}")
  for token in (f'data-story-slug="{slug}"',f'data-category="{s.get("category")}"',f'data-topic="{topic}"'):
   if token not in svg:errors.append(f"Artwork metadata mismatch {language}/{slug}: {token}")
  if 'width="1200" height="675"' not in svg:errors.append(f"Unexpected image dimensions: {language}/{slug}")
for language in ("tr","en","ar"):
 page=(ROOT/f"news/{language}/index.html").read_text(encoding="utf-8")
 if page.count('id="news-home-slider"')!=1:errors.append(language+": slider section count is not one")
 for ident in ("home-slider-track","home-slider-prev","home-slider-next","home-slider-dots","news-list","news-pagination"):
  if page.count(f'id="{ident}"')!=1:errors.append(f"{language}: element #{ident} count is not one")
js=(ROOT/"news/assets/news.js").read_text(encoding="utf-8")
for token in ("stories.slice(0,10)","setInterval","featured.has(s.slug)","if(!section||!track||selectedCategory)"):
 if token not in js:errors.append("Carousel/dedup logic missing: "+token)
article=(ROOT/"news/article.html").read_text(encoding="utf-8")
if "paras[idx].after(fig)" in article or "s.inlineImages" in article:errors.append("Article template inserts repeated inline fallback images.")
if errors:
 print("NEWS QA FAILED")
 for e in errors[:100]:print(" - "+e)
 print("Total issues:",len(errors));raise SystemExit(1)
print(f"NEWS QA PASSED: {len(stories)} stories; {len(urls)} unique image URLs; {len(hashes)} unique SVG contents; languages={dict(langs)}")
