#!/usr/bin/env python3
"""Generate crawlable multilingual news articles and refresh the root sitemap before deployment."""
import datetime, html, json, re
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE="https://rocketpendigital.com"
NEWS=ROOT/"news"
SITEMAP=ROOT/"sitemap.xml"
LANGS=("tr","en","ar")
SM="http://www.sitemaps.org/schemas/sitemap/0.9"
XHTML="http://www.w3.org/1999/xhtml"
ET.register_namespace("",SM)
ET.register_namespace("xhtml",XHTML)

LABELS={
"en":{"back":"← Back to news","published":"Published","author":"Author","sources":"Sources & transparency","none":"No source links were supplied with this archive item.","categories":{"ai":"AI & Machine Learning","devices":"Phones & Devices","apps":"Apps & Software","gaming":"Gaming","science":"Science & Space","security":"Cybersecurity","mobility":"Mobility & Transport","digital-culture":"Digital Culture"}},
"tr":{"back":"Haberlere dön →","published":"Yayın tarihi","author":"Yazar","sources":"Kaynaklar ve şeffaflık","none":"Bu arşiv kaydında kaynak bağlantısı bulunmuyor.","categories":{"ai":"Yapay zekâ ve makine öğrenmesi","devices":"Telefonlar ve cihazlar","apps":"Uygulamalar ve yazılım","gaming":"Oyun","science":"Bilim ve uzay","security":"Siber güvenlik","mobility":"Mobilite ve ulaşım","digital-culture":"Dijital kültür"}},
"ar":{"back":"العودة إلى الأخبار ←","published":"تاريخ النشر","author":"الكاتب","sources":"المصادر والشفافية","none":"لا توجد روابط مصادر مرفقة بهذا الخبر في الأرشيف.","categories":{"ai":"الذكاء الاصطناعي والتعلم الآلي","devices":"الهواتف والأجهزة","apps":"التطبيقات والبرمجيات","gaming":"الألعاب","science":"العلوم والفضاء","security":"الأمن السيبراني","mobility":"التنقل والنقل","digital-culture":"الثقافة الرقمية"}}}

def ok(story):
 return story.get("status")=="published" and story.get("approved") is not False and story.get("editorialApproved") is not False and story.get("editorialApproval")!="pending"

def slug_of(story):
 slug=str(story.get("slug",""))
 if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*",slug): raise ValueError("Unsafe or missing news slug: "+repr(slug))
 if story.get("lang") not in LANGS: raise ValueError("Unsupported language for "+slug)
 return slug

def e(value): return html.escape(str(value or ""),quote=True)

def inline_md(value):
 text=e(value)
 text=re.sub(r"\[([^\]]+)\]\((https?://[^ )]+)\)",r'<a href="\2" target="_blank" rel="noopener noreferrer">\1</a>',text)
 text=re.sub(r"\*\*(.+?)\*\*",r"<strong>\1</strong>",text)
 text=re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)",r"<em>\1</em>",text)
 return text

def render_body(markdown):
 out=[];para=[];items=[];list_kind=None
 def flush_para():
  nonlocal para
  if para: out.append("<p>"+inline_md(" ".join(para))+"</p>");para=[]
 def flush_list():
  nonlocal items,list_kind
  if items:
   tag="ol" if list_kind=="ol" else "ul"
   out.append("<"+tag+">"+"".join("<li>"+inline_md(x)+"</li>" for x in items)+"</"+tag+">")
   items=[];list_kind=None
 for raw in str(markdown or "").splitlines():
  line=raw.strip()
  if not line: flush_para();flush_list();continue
  h=re.match(r"^(#{1,4})\s+(.+)$",line)
  if h:
   flush_para();flush_list();level=min(len(h.group(1))+1,5);out.append(f"<h{level}>"+inline_md(h.group(2))+f"</h{level}>")
  elif re.match(r"^[-*]\s+",line):
   flush_para()
   if list_kind not in (None,"ul"): flush_list()
   list_kind="ul";items.append(re.sub(r"^[-*]\s+","",line))
  elif re.match(r"^\d+[.)]\s+",line):
   flush_para()
   if list_kind not in (None,"ol"): flush_list()
   list_kind="ol";items.append(re.sub(r"^\d+[.)]\s+","",line))
  else: flush_list();para.append(line)
 flush_para();flush_list()
 return "\n".join(out) if out else "<p></p>"

def desc(story):
 text=re.sub(r"\s+"," ",str(story.get("summary") or story.get("title") or "")).strip()
 return text[:157].rstrip()+("…" if len(text)>157 else "")

def url_of(story):
 return BASE+"/news/"+story["lang"]+"/articles/"+story["slug"]+".html"

def family(story):
 m=re.fullmatch(r"(rpt-.+)-(tr|en|ar)",story["slug"])
 return m.group(1) if m and m.group(2)==story["lang"] else None

def build_html(s,alts):
 lang=s["lang"];labels=LABELS[lang];title=str(s.get("title") or "RocketPen Tech")
 description=desc(s);canonical=url_of(s);direction="rtl" if lang=="ar" else "ltr"
 image=str(s.get("imageUrl") or "");category=labels["categories"].get(s.get("category",""),s.get("category",""))
 date_display=s.get("dateDisplay") or s.get("dateISO") or "";published=s.get("publishedAt") or s.get("dateISO") or ""
 author=s.get("author") or "Gasim Piraliyev"
 locale={"en":"en_US","tr":"tr_TR","ar":"ar_AE"}[lang]
 alternate=[]
 for alt_lang,alt_url in sorted(alts.items()): alternate.append(f'<link rel="alternate" hreflang="{alt_lang}" href="{e(alt_url)}">')
 if alts: alternate.append(f'<link rel="alternate" hreflang="x-default" href="{e(alts.get("en") or canonical)}">')
 img=""
 if image.startswith(("https://","http://")):
  img='<figure class="article-hero"><img class="story-image" src="'+e(image)+'" alt="'+e(s.get("imageAlt") or title)+'" loading="eager"><figcaption>'+e(s.get("imageCredit") or "")+"</figcaption></figure>"
 src=s.get("sources") if isinstance(s.get("sources"),list) else []
 if not src and s.get("sourceUrl"): src=[{"name":s.get("sourceName") or s.get("source") or "Source","url":s["sourceUrl"]}]
 links=[]
 for source in src:
  if not isinstance(source,dict): continue
  href=str(source.get("url") or source.get("href") or "")
  if href.startswith(("https://","http://")): links.append('<li><a href="'+e(href)+'" target="_blank" rel="noopener noreferrer">'+e(source.get("name") or source.get("publisher") or href)+"</a></li>")
 source_markup="".join(links) if links else "<li>"+e(labels["none"])+"</li>"
 schema={"@context":"https://schema.org","@type":"NewsArticle","headline":title,"description":description,"inLanguage":lang,"mainEntityOfPage":{"@type":"WebPage","@id":canonical},"author":{"@type":"Person","name":author},"publisher":{"@type":"Organization","name":"RocketPen Tech","logo":{"@type":"ImageObject","url":BASE+"/asset/logo/RocketPenTech-Logo.png"}},"datePublished":published,"articleSection":category}
 if img and image: schema["image"]=[image]
 jsonld=json.dumps(schema,ensure_ascii=False).replace("<","\\u003c").replace(">","\\u003e").replace("&","\\u0026")
 return f'''<!doctype html>
<html lang="{lang}" dir="{direction}" data-generated-news-seo="true">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="index,follow,max-image-preview:large"><meta name="description" content="{e(description)}"><meta name="author" content="{e(author)}">
<meta name="theme-color" content="#080b12"><link rel="canonical" href="{e(canonical)}">
{chr(10).join(alternate)}
<link rel="icon" type="image/svg+xml" href="/asset/logo/favicon.svg">
<link rel="stylesheet" href="/news/assets/news.css?v=20261023-9"><link rel="stylesheet" href="/news/assets/news-images.css?v=20261023-8">
<title>{e(title)} | RocketPen Tech</title>
<meta property="og:type" content="article"><meta property="og:site_name" content="RocketPen Tech"><meta property="og:locale" content="{locale}">
<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(description)}"><meta property="og:url" content="{e(canonical)}">
{('<meta property="og:image" content="'+e(image)+'">') if img else ''}
<meta property="article:published_time" content="{e(published)}"><meta property="article:section" content="{e(category)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(title)}"><meta name="twitter:description" content="{e(description)}">
{('<meta name="twitter:image" content="'+e(image)+'">') if img else ''}
<script type="application/ld+json">{jsonld}</script>
</head>
<body>
<header class="site-header"><a class="brand" href="/news/" aria-label="RocketPen Tech home"><img src="/asset/logo/RocketPenTech-Logo.png" alt="RocketPen Tech"></a>
<nav class="language-nav" aria-label="Language"><a href="/news/en/" lang="en">EN</a><a href="/news/tr/" lang="tr">TR</a><a href="/news/ar/" lang="ar">العربية</a></nav></header>
<main><nav class="news-nav" aria-label="Breadcrumb"><a href="/news/{lang}/">{e(labels["back"])}</a></nav>
<div class="page-intro"><p class="eyebrow">{e(category)}</p><h1>{e(title)}</h1><p>{e(s.get("summary") or "")}</p>
<p class="meta">{e(labels["published"])}: {e(date_display)} · {e(labels["author"])}: {e(author)}</p></div>
{img}
<div class="article-layout"><article class="article-body">{render_body(s.get("body"))}</article>
<aside class="article-aside"><h2>{e(labels["sources"])}</h2><p>{e(s.get("sourceDisclosure") or labels["none"])}</p><ul class="source-list">{source_markup}</ul></aside></div></main>
<footer><span>© {datetime.datetime.now(datetime.timezone.utc).year} RocketPen Tech</span><nav><a href="/news/editorial-policy.html">Editorial policy</a><a href="/news/contact.html">Contact</a></nav></footer>
</body></html>
'''

def main():
 archive=json.loads((NEWS/"data/news.json").read_text(encoding="utf-8"))
 headlines=json.loads((NEWS/"data/headlines.json").read_text(encoding="utf-8"))
 selected=[];seen=set()
 for story in list(headlines.get("stories",[]))+list(archive.get("stories",[])):
  if story.get("lang") not in LANGS or not ok(story): continue
  slug=slug_of(story);key=(story["lang"],slug)
  if key in seen: raise ValueError("Duplicate published story URL: "+"/".join(key))
  seen.add(key);selected.append(story)
 page_map={(s["lang"],s["slug"]):url_of(s) for s in selected}
 families=defaultdict(dict)
 for story in selected:
  key=family(story)
  if key: families[key][story["lang"]]=story["slug"]
 def alts_for(story):
  key=family(story);variants=families.get(key,{}) if key else {}
  if len(variants)<2:return {}
  return {lang:page_map[(lang,slug)] for lang,slug in variants.items()}
 counts={lang:0 for lang in LANGS}
 for lang in LANGS:
  output=NEWS/lang/"articles";output.mkdir(parents=True,exist_ok=True)
  for old in output.glob("*.html"):
   try: generated='data-generated-news-seo="true"' in old.read_text(encoding="utf-8")
   except (OSError,UnicodeDecodeError): generated=False
   if generated: old.unlink()
 for story in selected:
  target=NEWS/story["lang"]/"articles"/(story["slug"]+".html")
  if target.exists(): raise FileExistsError("Refusing to overwrite non-generated article "+str(target.relative_to(ROOT)))
  target.write_text(build_html(story,alts_for(story)),encoding="utf-8")
  counts[story["lang"]]+=1

 # Replace only /news URLs; retain the existing main-site and blog sitemap entries.
 tree=ET.parse(SITEMAP);root=tree.getroot()
 for node in list(root.findall(f"{{{SM}}}url")):
  loc_node=node.find(f"{{{SM}}}loc")
  loc=loc_node.text if loc_node is not None and loc_node.text else ""
  if loc.startswith(BASE+"/news"): root.remove(node)
 home={lang:BASE+"/news/"+lang+"/" for lang in LANGS}
 home_alts=dict(home);home_alts["x-default"]=BASE+"/news/"
 def add(loc,lastmod=None,alts=None):
  node=ET.SubElement(root,f"{{{SM}}}url")
  ET.SubElement(node,f"{{{SM}}}loc").text=loc
  if lastmod and re.fullmatch(r"\d{4}-\d{2}-\d{2}",str(lastmod)):
   ET.SubElement(node,f"{{{SM}}}lastmod").text=str(lastmod)
  for language,href in sorted((alts or {}).items()):
   ET.SubElement(node,f"{{{XHTML}}}link",{"rel":"alternate","hreflang":language,"href":href})
 today=datetime.datetime.now(datetime.timezone.utc).date().isoformat()
 add(BASE+"/news/",today)
 for lang in LANGS:add(home[lang],today,home_alts)
 for story in selected:add(url_of(story),story.get("dateISO"),alts_for(story))
 SITEMAP.write_bytes(ET.tostring(root,encoding="utf-8",xml_declaration=True))

 check=ET.parse(SITEMAP).getroot()
 locs=[n.findtext(f"{{{SM}}}loc",default="") for n in check.findall(f"{{{SM}}}url")]
 if len(locs)!=len(set(locs)):raise SystemExit("Sitemap contains duplicate URLs.")
 if any(home[lang] not in locs for lang in LANGS):raise SystemExit("Sitemap is missing newsroom landing page.")
 for lang in LANGS:
  actual=sum(1 for loc in locs if f"/news/{lang}/articles/" in loc)
  if actual!=counts[lang] or actual<10:raise SystemExit(f"Sitemap/article count mismatch for {lang}: {counts[lang]} pages; {actual} URLs")
 print("Generated static article pages:",counts)
 print("Validated sitemap URLs:",len(locs),"; existing non-news URLs preserved.")

if __name__=="__main__":main()
