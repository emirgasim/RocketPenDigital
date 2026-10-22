#!/usr/bin/env python3
"""Build multilingual news data and a unique original editorial illustration for every story."""
import datetime,hashlib,html,json,random,re,shutil,zipfile,urllib.parse,urllib.request,concurrent.futures
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/"news/data/news.json";IMAGE_DIR=ROOT/"news/assets/generated"
ARCHIVES={"tr":ROOT/"RocketPenTech_500_News_Gasim_Piraliyev.zip","ar":ROOT/"RocketPenTech_500_Arapca_Haber.zip","en":ROOT/"RocketPenTech_500_Ingilizce_Haber.zip"}
TR={"ocak":1,"şubat":2,"mart":3,"nisan":4,"mayıs":5,"haziran":6,"temmuz":7,"ağustos":8,"eylül":9,"ekim":10,"kasım":11,"aralık":12}
AR={"يناير":1,"فبراير":2,"مارس":3,"أبريل":4,"ابريل":4,"مايو":5,"يونيو":6,"يوليو":7,"أغسطس":8,"اغسطس":8,"سبتمبر":9,"أكتوبر":10,"اكتوبر":10,"نوفمبر":11,"ديسمبر":12}
PALETTES={"ai":("#071b2a","#0c3850","#18b8dd","#ffe06a"),"devices":("#101a35","#273e78","#62d3ff","#ffe06a"),"apps":("#151a35","#3a2b70","#b0a3ff","#65e6d4"),"gaming":("#170e32","#4b2177","#fa65b7","#ffcf5d"),"science":("#071e36","#104b75","#6ce1ff","#f9d56e"),"security":("#101a2b","#213a50","#53e0ca","#ffcf69"),"mobility":("#111f2f","#14536a","#59e0e0","#ffd260"),"digital-culture":("#171a32","#303e6c","#5bd8f0","#ffa8c8")}
LABELS={"en":{"ai":"AI & MACHINE LEARNING","devices":"DEVICES & HARDWARE","apps":"APPS & SOFTWARE","gaming":"GAMING","science":"SCIENCE & SPACE","security":"CYBERSECURITY","mobility":"MOBILITY","digital-culture":"DIGITAL CULTURE"},"tr":{"ai":"YAPAY ZEKÂ","devices":"CİHAZLAR & DONANIM","apps":"UYGULAMA & YAZILIM","gaming":"OYUN","science":"BİLİM & UZAY","security":"SİBER GÜVENLİK","mobility":"MOBİLİTE","digital-culture":"DİJİTAL KÜLTÜR"},"ar":{"ai":"الذكاء الاصطناعي","devices":"الأجهزة والتقنيات","apps":"التطبيقات والبرمجيات","gaming":"الألعاب","science":"العلوم والفضاء","security":"الأمن السيبراني","mobility":"التنقل","digital-culture":"الثقافة الرقمية"}}
def parse_date(raw,lang):
 s=re.sub(r"\s+"," ",raw.strip())
 try:
  if lang=="tr":
   m=re.search(r"([^\d]+)\s+(\d{4})",s)
   if m and m.group(1).strip().lower() in TR:return f"{int(m.group(2)):04d}-{TR[m.group(1).strip().lower()]:02d}-01",s
  if lang=="en":
   for fmt in ("%B %d, %Y","%b %d, %Y","%B %d %Y","%Y-%m-%d"):
    try:return datetime.datetime.strptime(s,fmt).date().isoformat(),s
    except ValueError:pass
  if lang=="ar":
   m=re.search(r"(\d{1,2})\s+([^\d]+?)\s+(\d{4})",s)
   if m and m.group(2).strip() in AR:return f"{int(m.group(3)):04d}-{AR[m.group(2).strip()]:02d}-{int(m.group(1)):02d}",s
 except (ValueError,KeyError):pass
 return None,s
def category(title,body):
 title=title.casefold();s=(title+" "+body[:1800]).casefold()
 rules=[("ai",["artificial intelligence","yapay zek","الذكاء الاصطناعي","machine learning","deepmind","anthropic","openai","chatgpt","gemini","llm","neural network","robotics"]),("gaming",["gaming","game","oyun","playstation","xbox","nintendo","epic games","unity","steam","esports"]),("security",["cybersecurity","siber güven","siber guven","güvenlik","guvenlik","الأمن السيبراني","privacy","hack","malware","ransomware","data breach"]),("science",["space","science","uzay","bilim","فضاء","nasa","research","satellite","mars","moon","telescope"]),("mobility",["electric vehicle","mobility","transport","otomotiv","ulaşım","ulasim","سيارات","النقل","ev charging","autonomous driving"]),("devices",["phone","smartphone","device","laptop","tablet","chip","telefon","cihaz","هاتف","أجهزة","samsung","apple","nvidia","amd","iphone","pixel"]),("apps",["app","software","platform","application","uygulama","yazılım","yazilim","تطبيق","برمجيات","windows","android","ios","browser"])]
 for key,terms in rules:
  if any(term in title for term in terms):return key
 for key,terms in rules:
  if any(term in s for term in terms):return key
 return "digital-culture"
def visual_topic(story):
 title=story.get("title","").casefold();body=story.get("body","")[:2000].casefold()
 checks=[("smartphone",["iphone","smartphone","phone","pixel","galaxy","samsung","telefon","هاتف"]),("laptop",["laptop","notebook","macbook","chromebook","bilgisayar","لابتوب"]),("game-console",["gaming","playstation","xbox","nintendo","steam","oyun","esports"]),("orbital-science",["space","nasa","mars","moon","satellite","telescope","uzay","bilim","فضاء"]),("shield-security",["security","cyber","malware","hack","ransomware","privacy","siber","güvenlik","guvenlik","الأمن السيبراني"]),("electric-mobility",["electric vehicle","ev charging","automotive","mobility","transport","otomobil","araç","arac","ulasim","ulaşım","سيارات"]),("software-ui",["software","application","browser","windows","android","ios","app","uygulama","yazılım","yazilim","تطبيق","برمجيات"]),("robotics",["robot","robotics","robotik","humanoid"]),("ai-network",["artificial intelligence","yapay zek","الذكاء الاصطناعي","machine learning","neural","openai","chatgpt","gemini","llm"]),("digital-network",["social media","tiktok","instagram","creator","influencer","sosyal medya","dijital kültür","digital culture"])]
 for text in (title,body):
  for key,terms in checks:
   if any(term in text for term in terms):return key
 return {"ai":"ai-network","devices":"hardware-lab","apps":"software-ui","gaming":"game-console","science":"orbital-science","security":"shield-security","mobility":"electric-mobility","digital-culture":"digital-network"}.get(story.get("category"),"digital-network")
def illustration_svg(story):
 slug=story["slug"];topic=story["visualTopic"];cat=story["category"];digest=hashlib.sha256((slug+"|"+story["title"]+"|"+topic+"|"+story["body"][:180]).encode()).digest();r=random.Random(int.from_bytes(digest[:8],"big"));c1,c2,accent,glow=PALETTES.get(cat,PALETTES["digital-culture"]);label=html.escape(LABELS.get(story["lang"],LABELS["en"]).get(cat,cat.upper()));gid="g-"+re.sub(r"[^a-zA-Z0-9_-]","-",slug)
 p=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-labelledby="title desc" data-story-slug="{html.escape(slug)}" data-category="{html.escape(cat)}" data-topic="{html.escape(topic)}">','<title id="title">RocketPen Tech original editorial illustration</title>',f'<desc id="desc">{label}; original themed artwork for story {html.escape(slug)}</desc>',f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient><radialGradient id="glow-{gid}"><stop offset="0" stop-color="{accent}" stop-opacity=".32"/><stop offset="1" stop-color="{accent}" stop-opacity="0"/></radialGradient></defs>',f'<rect width="1200" height="675" fill="url(#{gid})"/>',f'<circle cx="{r.randint(730,1000)}" cy="{r.randint(160,480)}" r="{r.randint(230,350)}" fill="url(#glow-{gid})"/>',f'<path d="M0 {r.randint(480,610)} Q310 {r.randint(350,600)} 610 675 H0Z" fill="{accent}" opacity=".07"/>']
 for _ in range(24):
  x,y,rad=r.randint(20,1180),r.randint(20,650),r.choice([1.5,2,3.5,5]);p.append(f'<circle cx="{x}" cy="{y}" r="{rad}" fill="{glow}" opacity="{r.uniform(.25,.8):.2f}"/>')
 if topic in ("ai-network","robotics","digital-network"):
  nodes=[(r.randint(750,1085),r.randint(150,520)) for _ in range(9)]
  for i,(x,y) in enumerate(nodes):
   for j,(xx,yy) in enumerate(nodes):
    if j>i and (abs(x-xx)+abs(y-yy)<260 or r.random()<.13):p.append(f'<path d="M{x} {y} L{xx} {yy}" stroke="{accent}" stroke-width="2" opacity=".34"/>')
  for x,y in nodes:p.append(f'<circle cx="{x}" cy="{y}" r="{r.randint(7,15)}" fill="{accent}" stroke="{glow}" stroke-width="5"/>')
  if topic=="robotics":p.append(f'<rect x="842" y="220" width="205" height="204" rx="48" fill="{c1}" stroke="{accent}" stroke-width="8"/><circle cx="895" cy="300" r="16" fill="{glow}"/><circle cx="992" cy="300" r="16" fill="{glow}"/><path d="M890 358 Q943 386 996 358" fill="none" stroke="{accent}" stroke-width="10" stroke-linecap="round"/>')
 elif topic in ("smartphone","hardware-lab","laptop"):
  if topic=="laptop":p.extend([f'<rect x="790" y="185" width="310" height="218" rx="20" fill="{c1}" stroke="{accent}" stroke-width="8"/>',f'<rect x="810" y="205" width="270" height="176" rx="9" fill="{c2}"/>',f'<path d="M760 425 H1130 L1080 455 H810Z" fill="{accent}"/>'])
  else:
   x=825 if topic=="hardware-lab" else 850;p.extend([f'<rect x="{x}" y="145" width="230" height="370" rx="32" fill="{c1}" stroke="{accent}" stroke-width="8"/>',f'<rect x="{x+19}" y="178" width="192" height="302" rx="15" fill="{c2}"/>',f'<circle cx="{x+115}" cy="494" r="7" fill="{glow}"/>'])
  for _ in range(3):p.append(f'<rect x="{r.randint(875,980)}" y="{r.randint(245,410)}" width="{r.randint(30,70)}" height="{r.randint(10,20)}" rx="5" fill="{accent}" opacity="{r.uniform(.45,.9):.2f}"/>')
 elif topic=="software-ui":
  p.extend([f'<rect x="760" y="160" width="360" height="300" rx="18" fill="{c1}" stroke="{accent}" stroke-width="7"/>',f'<path d="M760 210 H1120" stroke="{accent}" stroke-width="5"/>'])
  for i in range(3):p.append(f'<circle cx="{790+i*20}" cy="185" r="5" fill="{glow}"/>')
  for i in range(3):
   for j in range(2):p.append(f'<rect x="{790+i*100}" y="{245+j*88}" width="78" height="65" rx="10" fill="{accent if (i+j)%2 else glow}" opacity=".72"/>')
 elif topic=="game-console":p.extend([f'<path d="M790 315 Q800 265 850 275 L900 288 H985 L1035 275 Q1088 266 1097 320 L1116 400 Q1120 437 1086 441 Q1068 442 1047 420 L1010 388 H875 L839 420 Q815 444 794 431 Q770 418 777 390Z" fill="{c1}" stroke="{accent}" stroke-width="8"/>',f'<path d="M846 328 V375 M824 351 H868" stroke="{glow}" stroke-width="12" stroke-linecap="round"/>',f'<circle cx="1030" cy="333" r="13" fill="{accent}"/><circle cx="1063" cy="365" r="13" fill="{glow}"/>'])
 elif topic=="orbital-science":p.extend([f'<circle cx="930" cy="335" r="77" fill="{accent}" opacity=".88"/>',f'<ellipse cx="930" cy="335" rx="200" ry="90" fill="none" stroke="{glow}" stroke-width="8" transform="rotate(-28 930 335)"/>',f'<ellipse cx="930" cy="335" rx="250" ry="140" fill="none" stroke="{accent}" stroke-width="3" opacity=".55" transform="rotate(36 930 335)"/>',f'<circle cx="1080" cy="265" r="22" fill="{glow}"/>',f'<circle cx="790" cy="420" r="13" fill="{accent}"/>'])
 elif topic=="shield-security":p.extend([f'<path d="M930 140 L1080 200 V320 Q1070 430 930 510 Q790 430 780 320 V200Z" fill="{c1}" stroke="{accent}" stroke-width="10"/>',f'<rect x="883" y="300" width="94" height="83" rx="14" fill="{accent}"/>',f'<path d="M900 300 V273 A30 30 0 0 1 960 273 V300" fill="none" stroke="{glow}" stroke-width="13"/>',f'<circle cx="930" cy="338" r="9" fill="{c1}"/>'])
 elif topic=="electric-mobility":p.extend([f'<path d="M760 385 L800 315 Q815 290 850 290 H1017 Q1045 292 1065 330 L1100 370 L1112 420 H760Z" fill="{c1}" stroke="{accent}" stroke-width="8"/>',f'<path d="M839 305 H914 V365 H801Z M935 305 H1010 Q1030 311 1044 365 H935Z" fill="{glow}"/>',f'<circle cx="840" cy="421" r="34" fill="{c1}" stroke="{accent}" stroke-width="9"/><circle cx="1037" cy="421" r="34" fill="{c1}" stroke="{accent}" stroke-width="9"/>'])
 else:p.extend([f'<path d="M780 220 H1060 Q1090 220 1090 250 V365 Q1090 395 1060 395 H930 L870 445 V395 H780 Q750 395 750 365 V250 Q750 220 780 220Z" fill="{c1}" stroke="{accent}" stroke-width="8"/>',f'<circle cx="820" cy="307" r="11" fill="{accent}"/><circle cx="870" cy="307" r="11" fill="{glow}"/><circle cx="920" cy="307" r="11" fill="{accent}"/>'])
 p.extend([f'<path d="M70 70 H130" stroke="{accent}" stroke-width="6" stroke-linecap="round"/>',f'<text x="70" y="112" fill="{glow}" font-family="Arial,sans-serif" font-size="23" font-weight="800" letter-spacing="3">ROCKETPEN TECH</text>',f'<text x="70" y="154" fill="{accent}" font-family="Arial,sans-serif" font-size="17" font-weight="700" letter-spacing="2">{label}</text>',f'<text x="70" y="606" fill="{glow}" font-family="Arial,sans-serif" font-size="15" letter-spacing="3">ORIGINAL EDITORIAL ILLUSTRATION</text>',f'<text x="1125" y="606" text-anchor="end" fill="{accent}" font-family="Arial,sans-serif" font-size="16" font-weight="700">{html.escape(slug.upper())}</text>','</svg>']);return "".join(p)
def main():
 today=datetime.date.today().isoformat();stories=[];counts={};seen_titles=set();seen_bodies=set();used=set();duplicates=0
 for lang,archive in ARCHIVES.items():
  if not archive.exists():raise SystemExit("Missing source archive: "+archive.name)
  count=0
  with zipfile.ZipFile(archive) as z:
   for name in z.namelist():
    if not name.lower().endswith(".md"):continue
    source=z.read(name).decode("utf-8-sig","replace");title=re.search(r"^#\s+(.+?)\s*$",source,re.M);date=re.search(r"^\s*\*\*(?:Tarih|Date|التاريخ):\*\*\s*(.+?)\s*$",source,re.M);author=re.search(r"^\s*\*\*(?:Yazar|Author|الكاتب):\*\*\s*(.+?)\s*$",source,re.M)
    if not title or not date:print("Skip malformed:",name);continue
    lines=source.replace("\r\n","\n").split("\n");body=[];skipped=False
    for line in lines:
     if not skipped and line.startswith("# "):skipped=True;continue
     if re.match(r"^\s*\*\*(?:Tarih|Date|التاريخ|Yazar|Author|الكاتب):\*\*",line):continue
     body.append(line)
    body="\n".join(body).strip();norm=lambda v:re.sub(r"\s+"," ",re.sub(r"[^\w\s]"," ",v.casefold())).strip();title_fp=(lang,norm(title.group(1)));body_fp=(lang,norm(body))
    if title_fp in seen_titles or body_fp in seen_bodies:duplicates+=1;continue
    seen_titles.add(title_fp);seen_bodies.add(body_fp);summary=re.sub(r"^#{1,6}\s*","",body,flags=re.M);summary=re.sub(r"\*\*([^*]+)\*\*",r"\1",summary);summary=re.sub(r"\s+"," ",summary).strip()
    if len(summary)>230:summary=summary[:230].rsplit(" ",1)[0]+"…"
    d,display=parse_date(date.group(1),lang);m=re.search(r"(\d+)",Path(name).stem);num=int(m.group(1)) if m else count+1;slug=f"{lang}-{num:03d}";suffix=2
    while slug in used:slug=f"{lang}-{num:03d}-v{suffix}";suffix+=1
    used.add(slug);stories.append({"id":num,"slug":slug,"lang":lang,"title":title.group(1).strip(),"summary":summary,"dateISO":d,"dateDisplay":display,"author":"Gasim Piraliyev","category":category(title.group(1),body),"body":body,"status":"scheduled" if d and d>today else "published","dateBasis":"provided-in-source-archive","sourceArchive":archive.name,"sources":[]});count+=1
  counts[lang]=count
 def find_photo(story):
  cat_terms={"ai":"artificial intelligence technology","devices":"smartphone technology","apps":"software technology","gaming":"video game technology","science":"science space research","security":"cybersecurity computer","mobility":"electric vehicle transport","digital-culture":"digital technology"}
  queries=[re.sub(r"[^\w\s-]"," ",story["title"],flags=re.UNICODE)[:100],cat_terms.get(story["category"],"technology news")]
  headers={"User-Agent":"RocketPenDigitalNews/1.0 (editorial photo sourcing; rocketpendigital@gmail.com)"}
  for query in queries:
   params={"action":"query","format":"json","generator":"search","gsrnamespace":6,"gsrsearch":query+" filetype:bitmap","gsrlimit":10,"prop":"imageinfo","iiprop":"url|extmetadata","iiurlwidth":1200}
   req=urllib.request.Request("https://commons.wikimedia.org/w/api.php?"+urllib.parse.urlencode(params),headers=headers)
   try:
    with urllib.request.urlopen(req,timeout=10) as response:data=json.load(response)
    pages=(data.get("query",{}).get("pages",{}) or {}).values()
    for page in pages:
     info=(page.get("imageinfo") or [{}])[0];meta=info.get("extmetadata") or {}
     image=info.get("thumburl") or info.get("url","");file=page.get("title","");mime=info.get("mime","")
     license_name=re.sub(r"<[^>]+>","",meta.get("LicenseShortName",{}).get("value","")).strip()
     license_url=re.sub(r"<[^>]+>","",meta.get("LicenseUrl",{}).get("value","")).strip()
     artist=re.sub(r"<[^>]+>","",meta.get("Artist",{}).get("value","")).strip()
     if not image.startswith("https://upload.wikimedia.org/") or not mime.startswith("image/") or not license_name:continue
     if not (license_url or "public domain" in license_name.casefold() or "cc0" in license_name.casefold()):continue
     return {"url":image,"file":file,"sourceUrl":"https://commons.wikimedia.org/wiki/"+urllib.parse.quote(file.replace(" ","_"),safe=":/"),"license":license_name,"licenseUrl":license_url,"credit":artist or "Wikimedia Commons"}
   except Exception:
    continue
  return None
 # Historical archive entries remain text-only. Only stories dated within the
 # last 90 days are treated as recent and receive verified, licensed photographs.
 # Search each recent story by its own headline; category search is a fallback.
 cutoff=(datetime.date.today()-datetime.timedelta(days=90)).isoformat()
 recent=[s for s in stories if s.get("dateISO") and cutoff<=s["dateISO"]<=today]
 photo_cache={};missing=0
 for story in stories:
  story["visualTopic"]=visual_topic(story)
  is_recent=story in recent;story["isArchive"]=not is_recent
  if not is_recent:
   story["imageUrl"]="";story["imageType"]="archive";story["imageSource"]="";story["imageSourceUrl"]="";story["imageLicense"]="";story["imageLicenseUrl"]="";story["imageCredit"]=""
   continue
  cache_key=story["title"].casefold();photo=photo_cache.get(cache_key)
  if photo is None:
   photo=find_photo(story)
   if photo:photo_cache[cache_key]=photo
  if photo:
   story["imageUrl"]=photo["url"];story["imageType"]="photograph";story["imageSource"]="Wikimedia Commons";story["imageSourceUrl"]=photo["sourceUrl"];story["imageLicense"]=photo["license"];story["imageLicenseUrl"]=photo["licenseUrl"];story["imageCredit"]=photo["credit"]
  else:
   story["imageUrl"]="";story["imageType"]="missing";story["imageSource"]="";story["imageSourceUrl"]="";story["imageLicense"]="";story["imageLicenseUrl"]="";story["imageCredit"]="";missing+=1
 if missing:
  print(f"Photo sourcing notice: {missing} recent stories could not be matched to a verified licensed photograph; those stories will remain text-only rather than use an unverified image.")
 stories.sort(key=lambda x:(x["dateISO"] or "0000-00-00",x["id"]),reverse=True);OUT.parent.mkdir(parents=True,exist_ok=True)
 OUT.write_text(json.dumps({"schemaVersion":3,"generatedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"sourceNote":"Archive entries are deduplicated by normalized title and body within each language. Every story is credited to Gasim Piraliyev; original source-provided publication dates are preserved. Historical stories are text-only; recent photographs retain source and license metadata.","recentPhotoWindowDays":90,"counts":counts,"duplicateSourceItemsRemoved":duplicates,"stories":stories},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
 print(f"Indexed {len(stories)} stories: {counts}; duplicate-title/body source entries removed: {duplicates}; verified licensed real photographs: {sum(1 for story in stories if story.get("imageType")=="photograph")}")
 status_counts={language:{status:sum(1 for story in stories if story["lang"]==language and story["status"]==status) for status in ("published","scheduled")} for language in ARCHIVES}
 topic_counts={topic:sum(1 for story in stories if story["visualTopic"]==topic) for topic in sorted({story["visualTopic"] for story in stories})}
 print(f"Publication status by language: {status_counts}")
 print(f"Verified licensed real photographs: {sum(1 for story in stories if story.get('imageType')=='photograph')}")
if __name__=="__main__":main()
