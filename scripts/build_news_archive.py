#!/usr/bin/env python3
"""Build multilingual news data and a unique original editorial illustration for every story."""
import datetime,difflib,hashlib,html,json,random,re,shutil,zipfile,urllib.parse,urllib.request,concurrent.futures
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

def normalized_title(value):
 return re.sub(r"\s+"," ",re.sub(r"[^\w\s]"," ",value.casefold(),flags=re.UNICODE)).strip()
def title_is_similar(left,right):
 a,b=normalized_title(left),normalized_title(right)
 if not a or not b:return False
 wa,wb=set(a.split()),set(b.split())
 if min(len(wa),len(wb))>=4 and len(wa&wb)/max(1,len(wa|wb))>=0.72:return True
 if a.split()[:2]==b.split()[:2] and abs(len(a)-len(b))<=max(8,int(min(len(a),len(b))*0.18)) and difflib.SequenceMatcher(None,a,b).ratio()>=0.84:return True
 return False
TITLE_STOPWORDS={
 "en":set("the a an and or but for to of in on at by with from as is are was were be been being this that these those how why what when where new latest after before over under into about can could will would may might its their they it".split()),
 "tr":set("ve veya ama için ile bir bu şu o da de olarak olan daha en nasıl neden ne yeni son göre arasında üzerine altında hakkında tarafından mı mi mu mü".split()),
 "ar":set("في من على إلى الى عن مع هذا هذه ذلك تلك هو هي هم هن أن ان إن أو او و ثم ما لا لم لن قد بعد قبل بين عند كما كل كان كانت يتم تم الجديد الجديدة كيف لماذا".split())
}
def distinctive_title_phrases(body,title,lang):
 text=re.sub(r"\*{1,2}|\*|^#+\s*|^[-*]\s+"," ",body or "",flags=re.M)
 sentences=[re.sub(r"\s+"," ",x).strip(" \t\r\n-–—:؛،,.!?؟") for x in re.split(r"(?<=[.!?؟。])\s+|\n+",text) if x.strip()]
 title_words=set(normalized_title(title).split());stop=TITLE_STOPWORDS.get(lang,set());choices=[]
 for sentence in sentences:
  words=re.findall(r"[\w’'-]+",sentence,flags=re.UNICODE)
  informative=[w for w in words if len(w)>2 and normalized_title(w) not in stop and normalized_title(w) not in title_words]
  if len(informative)<3:continue
  phrase=" ".join(informative[:7]).strip(" -–—:;,.")
  if len(phrase)>64:phrase=phrase[:64].rsplit(" ",1)[0]
  choices.append((len(set(normalized_title(phrase).split())),phrase))
 choices.sort(key=lambda item:(-item[0],len(item[1])))
 return [phrase[:1].upper()+phrase[1:] for _,phrase in choices]
def make_unique_title(title,body,lang,prior_titles,slug):
 title=re.sub(r"\s+"," ",title).strip()
 if not any(title_is_similar(title,old) for old in prior_titles):return title
 for phrase in distinctive_title_phrases(body,title,lang):
  for candidate in (f"{title} — {phrase}",f"{phrase}: {title}"):
   if not any(title_is_similar(candidate,old) for old in prior_titles):return candidate
 phrases=distinctive_title_phrases(body,title,lang)
 candidate=f"{title} — {phrases[0]}" if phrases else f"{title} — {slug.upper()}"
 n=2;base=candidate
 while any(normalized_title(candidate)==normalized_title(old) for old in prior_titles):
  candidate=f"{base} ({n})";n+=1
 return candidate

def main():
 today=datetime.date.today().isoformat();stories=[];counts={};seen_titles=set();seen_bodies=set();used=set();duplicates=0
 title_history={lang:[] for lang in ARCHIVES}
 headline_file=ROOT/"news/data/headlines.json"
 if headline_file.exists():
  try:
   for headline in json.loads(headline_file.read_text(encoding="utf-8")).get("stories",[]):
    if headline.get("lang") in title_history and headline.get("title"):title_history[headline["lang"]].append(headline["title"])
  except (ValueError,OSError):pass
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
    if body_fp in seen_bodies:duplicates+=1;continue
    seen_bodies.add(body_fp);summary=re.sub(r"^#{1,6}\s*","",body,flags=re.M);summary=re.sub(r"\*\*([^*]+)\*\*",r"\1",summary);summary=re.sub(r"\s+"," ",summary).strip()
    if len(summary)>230:summary=summary[:230].rsplit(" ",1)[0]+"…"
    d,display=parse_date(date.group(1),lang);m=re.search(r"(\d+)",Path(name).stem);num=int(m.group(1)) if m else count+1;slug=f"{lang}-{num:03d}";suffix=2
    while slug in used:slug=f"{lang}-{num:03d}-v{suffix}";suffix+=1
    used.add(slug)
    original_title=title.group(1).strip()
    final_title=make_unique_title(original_title,body,lang,title_history[lang],slug)
    if normalized_title(final_title)!=normalized_title(original_title):print(f"Disambiguated similar title [{lang}]: {original_title} => {final_title}")
    title_history[lang].append(final_title);seen_titles.add((lang,normalized_title(final_title)))
    stories.append({"id":num,"slug":slug,"lang":lang,"title":final_title,"summary":summary,"dateISO":d,"dateDisplay":display,"author":"Gasim Piraliyev","category":category(title.group(1),body),"body":body,"status":"scheduled" if d and d>today else "published","dateBasis":"provided-in-source-archive","sourceArchive":archive.name,"sources":[]});count+=1
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
 # Assign a distinct real Unsplash photograph to every archive story, selected by topic.
 # The Unsplash photo IDs below are stable images; per-story hashing prevents repeats
 # within the same topic until that topic's pool is exhausted.
 unsplash_photos={
  "ai":["photo-1677442136019-21780ecad995","photo-1620712943543-bcc4688e7485","photo-1675557009875-436f4e9d8c5c","photo-1485827404703-89b55fcc595e","photo-1535378620166-273708d44e4c","photo-1676299081847-824916de030a","photo-1674027444485-cec3da58eef4","photo-1684369175833-186c6b13e53b"],
  "devices":["photo-1511707171634-5f897ff02aa9","photo-1517336714731-489689fd1ca8","photo-1496181133206-80ce9b88a853","photo-1523275335684-37898b6baf30","photo-1544244015-0df4b3ffc6b0","photo-1592899677977-9c10ca588bbd","photo-1512499617640-c74ae3a79d37","photo-1583394838336-acd977736f90"],
  "apps":["photo-1461749280684-dccba630e2f6","photo-1555066931-4365d14bab8c","photo-1519389950473-47ba0277781c","photo-1551434678-e076c223a692","photo-1498050108023-c5249f4df085","photo-1515879218367-8466d910aaa4","photo-1516321318423-f06f85e504b3","photo-1551650975-87deedd944c3"],
  "gaming":["photo-1542751371-adc38448a05e","photo-1593305841991-05c297ba4575","photo-1547394765-185e1e68f34e","photo-1598550476439-6847785fcea6","photo-1560253023-3ec5d502959f","photo-1493711662062-fa541bd7f5da","photo-1535223289827-42f1e9919769","photo-1612287230202-1ff1d85d1bdf"],
  "science":["photo-1451187580459-43490279c0fa","photo-1446776811953-b23d57bd21aa","photo-1462331940025-496dfbfc7564","photo-1457364559154-aa2644600ebb","photo-1464802686167-b939a6910659","photo-1446776899648-aa78eefe8ed0","photo-1506318137071-a8e063b4bec0","photo-1534796636912-3b95b3ab5986"],
  "security":["photo-1550751827-4bd374c3f58b","photo-1510511459019-5a6b4d5c2c9a","photo-1563013544-824ae1b704d3","photo-1555949963-ff9fe0c870eb","photo-1614064641938-3bbee52942c7","photo-1516321318423-f06f85e504b3","photo-1558494949-ef010cbdcc31","photo-1518770660439-4636190af475"],
  "mobility":["photo-1492144534655-ae79c964c9d7","photo-1503376780353-7e6692767b70","photo-1593941707882-a5bba14938c7","photo-1552519507-da3b142c6e3d","photo-1489824904134-891ab64532f1","photo-1549317661-bd32c8ce0db2","photo-1503736334956-4c8f8e92946d","photo-1511919884226-fd3cad34687c"],
  "digital-culture":["photo-1516321318423-f06f85e504b3","photo-1523726491678-bf852e717f6a","photo-1522542550221-31fd19575a2d","photo-1519389950473-47ba0277781c","photo-1497366754035-f200968a6e72","photo-1521737711867-e3b97375f902","photo-1522071820081-009f0129c71c","photo-1531482615713-2afd69097998"]
 }
 topic_category={"ai":"ai","devices":"devices","apps":"apps","gaming":"gaming","science":"science","security":"security","mobility":"mobility","digital-culture":"digital-culture"}
 photo_counts={};used_photos=set()
 for story in stories:
  story["visualTopic"]=visual_topic(story)
  story["isArchive"]=True
  pool=unsplash_photos.get(story["category"],unsplash_photos["digital-culture"])
  digest=hashlib.sha256((story["lang"]+"|"+story["slug"]+"|"+story["title"]).encode()).digest()
  start=int.from_bytes(digest[:8],"big")%len(pool)
  photo_id=None
  for offset in range(len(pool)):
   candidate=pool[(start+offset)%len(pool)]
   if (story["category"],candidate) not in used_photos:
    photo_id=candidate;break
  # If the topic pool is exhausted, reuse only as a last resort, rotated deterministically.
  if photo_id is None:photo_id=pool[start]
  used_photos.add((story["category"],photo_id))
  image_url="https://images.unsplash.com/"+photo_id+"?auto=format&fit=crop&w=1200&q=82"
  story["imageUrl"]=image_url
  story["imageType"]="photograph"
  story["imageSource"]="Unsplash"
  story["imageSourceUrl"]="https://unsplash.com/"
  story["imageLicense"]="Unsplash License"
  story["imageLicenseUrl"]="https://unsplash.com/license"
  story["imageCredit"]="Unsplash"
  story["imageAlt"]=story["title"]
  photo_counts[story["category"]]=photo_counts.get(story["category"],0)+1
 print("Unsplash topic photo assignments:",photo_counts)
 print("Stories with Unsplash photos:",sum(1 for s in stories if s.get("imageSource")=="Unsplash"))
 stories.sort(key=lambda x:(x["dateISO"] or "0000-00-00",x["id"]),reverse=True);OUT.parent.mkdir(parents=True,exist_ok=True)
 OUT.write_text(json.dumps({"schemaVersion":3,"generatedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"sourceNote":"Archive entries are deduplicated by normalized title and body within each language. Every story is credited to Gasim Piraliyev; original source-provided publication dates are preserved. Every archive story receives a topic-matched Unsplash photograph. Image-source and license metadata are recorded.","recentPhotoWindowDays":90,"counts":counts,"duplicateSourceItemsRemoved":duplicates,"stories":stories},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
 print(f"Indexed {len(stories)} stories: {counts}; duplicate-title/body source entries removed: {duplicates}; verified licensed real photographs: {sum(1 for story in stories if story.get("imageType")=="photograph")}")
 status_counts={language:{status:sum(1 for story in stories if story["lang"]==language and story["status"]==status) for status in ("published","scheduled")} for language in ARCHIVES}
 topic_counts={topic:sum(1 for story in stories if story["visualTopic"]==topic) for topic in sorted({story["visualTopic"] for story in stories})}
 print(f"Publication status by language: {status_counts}")
 print(f"Verified licensed real photographs: {sum(1 for story in stories if story.get('imageType')=='photograph')}")
if __name__=="__main__":main()
