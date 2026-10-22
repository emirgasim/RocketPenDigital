#!/usr/bin/env python3
"""Build a multilingual RocketPen Tech archive index from the supplied Markdown ZIPs."""
import datetime, json, re, zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"news/data/news.json"
ARCHIVES={"tr":ROOT/"RocketPenTech_500_News_Gasim_Piraliyev.zip","ar":ROOT/"RocketPenTech_500_Arapca_Haber.zip","en":ROOT/"RocketPenTech_500_Ingilizce_Haber.zip"}
TR={"ocak":1,"şubat":2,"mart":3,"nisan":4,"mayıs":5,"haziran":6,"temmuz":7,"ağustos":8,"eylül":9,"ekim":10,"kasım":11,"aralık":12}
AR={"يناير":1,"فبراير":2,"مارس":3,"أبريل":4,"ابريل":4,"مايو":5,"يونيو":6,"يوليو":7,"أغسطس":8,"اغسطس":8,"سبتمبر":9,"أكتوبر":10,"اكتوبر":10,"نوفمبر":11,"ديسمبر":12}
EN={m.lower():i for i,m in enumerate(["","January","February","March","April","May","June","July","August","September","October","November","December"]) if m}

def parse_date(raw,lang):
 s=re.sub(r"\\s+"," ",raw.strip())
 try:
  if lang=="tr":
   m=re.search(r"([^\\d]+)\\s+(\\d{4})",s)
   if m and m.group(1).strip().lower() in TR:return f"{int(m.group(2)):04d}-{TR[m.group(1).strip().lower()]:02d}-01",s
  if lang=="en":
   for fmt in ("%B %d, %Y","%b %d, %Y","%B %d %Y","%Y-%m-%d"):
    try:return datetime.datetime.strptime(s,fmt).date().isoformat(),s
    except ValueError:pass
  if lang=="ar":
   m=re.search(r"(\\d{1,2})\\s+([^\\d]+?)\\s+(\\d{4})",s)
   if m and m.group(2).strip() in AR:return f"{int(m.group(3)):04d}-{AR[m.group(2).strip()]:02d}-{int(m.group(1)):02d}",s
 except (ValueError,KeyError):pass
 return None,s

def category(title,body):
 s=(title+" "+body[:1000]).lower()
 rules=[("ai",["artificial intelligence","yapay zek","الذكاء الاصطناعي","machine learning","deepmind","anthropic","openai","gemini","llm"]),("gaming",["gaming","game","oyun","playstation","xbox","nintendo","epic games","unity"]),("security",["cybersecurity","siber güven","güvenlik","الأمن السيبراني","privacy","hack","malware"]),("science",["space","science","uzay","bilim","فضاء","nasa","research"]),("mobility",["electric vehicle","mobility","transport","otomotiv","ulaşım","سيارات","النقل"]),("devices",["phone","smartphone","device","laptop","chip","telefon","cihaz","هاتف","أجهزة","samsung","apple","nvidia","amd"]),("apps",["app","software","platform","application","uygulama","yazılım","تطبيق","برمجيات","windows","android","ios"])]
 for key,terms in rules:
  if any(term in s for term in terms):return key
 return "digital-culture"

def main():
 today=datetime.date.today().isoformat(); stories=[]; counts={}
 for lang,archive in ARCHIVES.items():
  if not archive.exists():raise SystemExit("Missing source archive: "+archive.name)
  n=0
  with zipfile.ZipFile(archive) as z:
   for name in z.namelist():
    if not name.lower().endswith(".md"):continue
    text=z.read(name).decode("utf-8-sig","replace")
    title=re.search(r"^#\\s+(.+?)\\s*$",text,re.M)
    date=re.search(r"^\\s*\\*\\*(?:Tarih|Date|التاريخ):\\*\\*\\s*(.+?)\\s*$",text,re.M)
    author=re.search(r"^\\s*\\*\\*(?:Yazar|Author|الكاتب):\\*\\*\\s*(.+?)\\s*$",text,re.M)
    if not title or not date:print("Skip malformed:",name);continue
    lines=text.replace("\\r\\n","\\n").split("\\n");body=[];skipped=False
    for line in lines:
     if not skipped and line.startswith("# "):skipped=True;continue
     if re.match(r"^\\s*\\*\\*(?:Tarih|Date|التاريخ|Yazar|Author|الكاتب):\\*\\*",line):continue
     body.append(line)
    body="\\n".join(body).strip()
    summary=re.sub(r"^#{1,6}\\s*","",body,flags=re.M)
    summary=re.sub(r"\\*\\*([^*]+)\\*\\*",r"\\1",summary)
    summary=re.sub(r"\\s+"," ",summary).strip()
    if len(summary)>230:summary=summary[:230].rsplit(" ",1)[0]+"…"
    d,display=parse_date(date.group(1),lang)
    m=re.search(r"(\\d+)",Path(name).stem);num=int(m.group(1)) if m else n+1
    stories.append({"id":num,"slug":f"{lang}-{num:03d}","lang":lang,"title":title.group(1).strip(),"summary":summary,"dateISO":d,"dateDisplay":display,"author":author.group(1).strip() if author else "Gasim Piraliyev | RocketPen Tech","category":category(title.group(1),body),"body":body,"status":"scheduled" if d and d>today else "published","dateBasis":"provided-in-source-archive","sourceArchive":archive.name,"sources":[]})
    n+=1
  counts[lang]=n
 stories.sort(key=lambda x:(x["dateISO"] or "0000-00-00",x["id"]),reverse=True)
 OUT.parent.mkdir(parents=True,exist_ok=True)
 OUT.write_text(json.dumps({"schemaVersion":2,"generatedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"sourceNote":"Dates are preserved from supplied files. Future-dated items remain scheduled. No source links are invented.","counts":counts,"stories":stories},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
 print(f"Indexed {len(stories)} stories: {counts}")
if __name__=="__main__":main()
