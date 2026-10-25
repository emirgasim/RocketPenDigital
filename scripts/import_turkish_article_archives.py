#!/usr/bin/env python3
"""Import six Turkish Markdown archives into RocketPen's static blog."""
from __future__ import annotations
import datetime as dt
import hashlib
import html
import json
import math
import re
import unicodedata
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://rocketpendigital.com"
ARCHIVES = sorted(ROOT.glob("RocketPenDigital_1000_Makale_Parca_*.zip"))
ARTICLE_DIR = ROOT / "blog" / "tr" / "articles"
LISTING = ROOT / "blog" / "tr" / "index.html"
PAGES_DIR = ROOT / "blog" / "tr" / "page"
SITEMAP = ROOT / "sitemap.xml"
REPORT = ROOT / "reports" / "turkish-article-import-report.json"
TODAY = dt.date.today().isoformat()
PAGE_SIZE = 15
SM = "http://www.sitemaps.org/schemas/sitemap/0.9"
ET.register_namespace("", SM)

STOP = set("""ve ile icin bir bu da de veya gibi olan olarak rehberi stratejileri stratejisi\nyol haritasi kapsamli yeni nesil odakli yaklasim yaklasimi nasil nedir 2026 rocketpen\ndigital studio dijital işletmeler isletmeler icin sektoru sektor sektorunde alaninda""".split())
STOP_HEADING = re.compile(r"^(sıkça sorulan|sikca sorulan|sss\b|benzer\b|önerilen\b|onerilen\b|profesyonel destek\b|kaynakça\b|kaynaklar\b)", re.I)
PROMISES = [
    (r"(?i)garanti altına al(?:ır|mak|an|arak|ın)", "destekler"),
    (r"(?i)büyüme garantisi", "büyüme yaklaşımı"),
    (r"(?i)garantili sonuç(?:lar)?", "ölçülebilir sonuçlar"),
    (r"(?i)kesin başarı", "ölçülebilir ilerleme"),
    (r"(?i)riski sıfıra indir(?:ir|mek)", "riski azaltmaya yardımcı olur"),
    (r"(?i)riski ortadan kaldır(?:ır|mak)", "riski azaltmaya yardımcı olur"),
    (r"(?i)bu riski ortadan kaldır(?:ır|mak)", "bu riski azaltmaya yardımcı olur"),
    (r"(?i)%\s*100\s*(?:uyumlu|başarılı|garantili)", "uyumu gözeten"),
    (r"(?i)tolerans seviyesi sıfıra yakındır", "ilgili politika ve kalite yönergelerine uyulmasını bekler"),
    (r"(?i)algoritmalar tarafından ödüllendirilmenizi sağlar", "performans göstergelerini olumlu etkileyebilir"),
    (r"(?i)3\s*(?:ila|-|–)\s*6\s*ay(?:\s*(?:arasında|içinde|bandında))?", "zaman içinde; sonuçlar rekabet, teknik durum, içerik kalitesi ve uygulamaya göre değişir"),
    (r"(?i)2\s*(?:ila|-|–)\s*4\s*hafta(?:\s*içinde)?", "uygulamaya ve veri hacmine bağlı bir sürede"),
    (r"(?i)2\s*(?:ila|-|–)\s*3\s*hafta(?:\s*içinde)?", "uygulamaya ve veri hacmine bağlı bir sürede"),
    (r"(?i)15\s*[-–]\s*30\s*gün(?:\s*içinde)?", "uygulamaya ve veri hacmine bağlı bir sürede"),
    (r"(?i)shadowban", "erişim veya hesap kısıtlaması"),
]

OFFICIAL = {
    "helpful": ("Google Search Central: Yararlı ve güvenilir, insan odaklı içerik", "https://developers.google.com/search/docs/fundamentals/creating-helpful-content"),
    "spam": ("Google Search Central: Google Arama spam politikaları", "https://developers.google.com/search/docs/essentials/spam-policies"),
    "seo": ("Google Search Central: SEO başlangıç rehberi", "https://developers.google.com/search/docs/fundamentals/seo-starter-guide"),
    "meta": ("Meta: Reklam Standartları", "https://transparency.meta.com/policies/ad-standards/"),
    "tiktok": ("TikTok: Reklam politikaları", "https://ads.tiktok.com/help/article/tiktok-ads-policy?lang=tr"),
    "linkedin": ("LinkedIn: Reklam politikaları", "https://www.linkedin.com/legal/ads-policy"),
    "analytics": ("Google Analytics Yardım Merkezi", "https://support.google.com/analytics/?hl=tr"),
    "searchconsole": ("Google Search Console Yardım Merkezi", "https://support.google.com/webmasters/?hl=tr"),
}

def norm(value):
    value = html.unescape(re.sub(r"<[^>]+>", " ", str(value or ""))).casefold()
    value = value.translate(str.maketrans({"ı": "i", "İ": "i"}))
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", value).strip()

def plain(value):
    value = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", str(value or ""), flags=re.I)
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", html.unescape(value)).strip()

def clean_claims(value):
    for pattern, replacement in PROMISES:
        value = re.sub(pattern, replacement, value)
    return value.strip()

def clip(value, limit):
    value = re.sub(r"\s+", " ", value).strip()
    if len(value) <= limit:
        return value
    return value[:limit + 1].rsplit(" ", 1)[0].rstrip(" ,;:-") + "…"

def slug_for(filename):
    stem = re.sub(r"^\d{4,5}-", "", Path(filename).stem)
    stem = stem.translate(str.maketrans({"ç":"c","Ç":"c","ğ":"g","Ğ":"g","ı":"i","İ":"i","ö":"o","Ö":"o","ş":"s","Ş":"s","ü":"u","Ü":"u"}))
    stem = unicodedata.normalize("NFKD", stem).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-zA-Z0-9]+", "-", stem).strip("-").lower()
    if len(value) > 86:
        value = value[:78].rstrip("-") + "-" + hashlib.sha1(filename.encode("utf-8")).hexdigest()[:7]
    return value or ("makale-" + hashlib.sha1(filename.encode()).hexdigest()[:10])

def inline_md(value):
    value = html.escape(value, quote=False)
    value = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", value)
    value = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", value)
    value = re.sub(r"\[([^\]]+)\]\((https?://[^ )]+)\)", r'<a href="\2" rel="noopener noreferrer">\1</a>', value)
    return value

def render_blocks(blocks):
    output = []
    for block in blocks:
        lines = [line.rstrip() for line in block.splitlines() if line.strip() not in ("---", "***")]
        if not lines:
            continue
        if all(re.match(r"^\s*(?:[-*+]|\d+[.)])\s+", line) for line in lines if line.strip()):
            ordered = bool(re.match(r"^\s*\d+[.)]\s+", lines[0]))
            tag = "ol" if ordered else "ul"
            items = []
            for line in lines:
                match = re.match(r"^\s*(?:[-*+]|\d+[.)])\s+(.+)$", line)
                if match:
                    items.append("<li>" + inline_md(match.group(1)) + "</li>")
            if items:
                output.append("<" + tag + ">" + "".join(items) + "</" + tag + ">")
            continue
        para, items = [], []
        def flush_para():
            if para:
                output.append("<p>" + inline_md(" ".join(para)) + "</p>")
                para.clear()
        def flush_items():
            if items:
                output.append("<ul>" + "".join("<li>" + inline_md(x) + "</li>" for x in items) + "</ul>")
                items.clear()
        for line in lines:
            match = re.match(r"^\s*[-*+]\s+(.+)$", line)
            if match:
                flush_para()
                items.append(match.group(1))
            else:
                flush_items()
                if line.strip():
                    para.append(line.strip())
        flush_para()
        flush_items()
    return "\n".join(output)

def parse_markdown(text, filename):
    text = text.lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n")
    title_match = re.search(r"(?m)^#\s+(.+?)\s*$", text)
    if not title_match:
        return None
    title = clean_claims(title_match.group(1).strip())
    lines = text[title_match.end():].splitlines()
    lines = [line for line in lines if not re.match(r"^\s*\*\*Yazar:\*\*", line, re.I)]
    intro_lines, main_lines = [], []
    reached_section = False
    for line in lines:
        if re.match(r"^\s*##\s+", line):
            reached_section = True
        (main_lines if reached_section else intro_lines).append(line)
    intro = clean_claims("\n".join(intro_lines).strip())
    intro_blocks = [b.strip() for b in re.split(r"\n\s*\n", intro) if b.strip()]
    intro = "\n\n".join(intro_blocks)
    sections, current, buf = [], None, []
    def flush():
        nonlocal buf, current
        if current:
            blocks = [x.strip() for x in re.split(r"\n\s*\n", "\n".join(buf)) if x.strip()]
            current["blocks"] = [clean_claims(x) for x in blocks if x.strip() not in ("---", "***")]
            if current["blocks"]:
                sections.append(current)
        buf = []
    for line in main_lines:
        h2 = re.match(r"^\s*##\s+(.+?)\s*$", line)
        h3 = re.match(r"^\s*###\s+(.+?)\s*$", line)
        if h2:
            heading = clean_claims(h2.group(1).strip())
            if STOP_HEADING.match(heading) or "rocketpen digital" in heading.casefold():
                flush()
                break
            flush()
            current = {"heading": heading, "blocks": []}
            continue
        if h3 and STOP_HEADING.match(h3.group(1).strip()):
            flush()
            break
        if current:
            buf.append(line)
    flush()
    main_text = plain(intro) + " " + " ".join(plain(" ".join(x["blocks"])) for x in sections)
    if len(plain(title)) < 15 or len(plain(intro)) < 90 or len(sections) < 2 or len(main_text) < 1700:
        return None

    # Keep supplied specific FAQs where present; discard the old promotional/source section.
    faqs = []
    m = re.search(r"(?im)^###\s+.*(?:sıkça sorulan|sikca sorulan|sss)\b.*$", text)
    if m:
        rest = text[m.end():]
        end = re.search(r"(?im)^###\s+.*(?:benzer|önerilen|onerilen|profesyonel destek|kaynakça)\b.*$", rest)
        faq_text = rest[:end.start()] if end else rest
        for q, a in re.findall(r"\*\*Soru\s*\d+\s*:\*\*\s*(.*?)\s*\*Cevap:\*\*\s*(.*?)(?=\*\*Soru\s*\d+\s*:\*\*|$)", faq_text, re.I | re.S)[:4]:
            q, a = clean_claims(plain(q)), clean_claims(plain(a))
            if q and a:
                faqs.append({"q": q.rstrip(" ."), "a": a})
    digest = hashlib.sha256(norm(main_text).encode("utf-8")).hexdigest()
    description = clip(plain(intro), 155)
    if len(description) < 80:
        description = clip(title + ". Bu rehber, uygulanabilir adımları ve karar verirken dikkat edilmesi gereken noktaları açıklar.", 155)
    return {
        "slug": slug_for(Path(filename).name), "title": title, "description": description,
        "excerpt": description, "intro": intro, "sections": sections, "faq": faqs,
        "publishedAt": TODAY, "updatedAt": TODAY, "wordCount": len(re.findall(r"\w+", main_text, re.UNICODE)),
        "source": Path(filename).name, "digest": digest,
    }

STOP_NORM = {norm(x) for x in STOP}\n\ndef article_tokens(title):\n    return {w for w in norm(title).split() if len(w) > 2 and w not in STOP_NORM}

def select_sources(title):
    n = norm(title)
    keys = ["helpful", "spam"]
    if any(x in n for x in ("seo", "arama motoru", "web sitesi", "icerik", "site haritasi")):
        keys.append("seo")
    if any(x in n for x in ("instagram", "facebook", "meta", "reklam", "ads")):
        keys.append("meta")
    if any(x in n for x in ("tiktok", "reels", "short video", "shorts")):
        keys.append("tiktok")
    if "linkedin" in n or "b2b" in n:
        keys.append("linkedin")
    if any(x in n for x in ("analytics", "ga4", "raporlama", "veri analitigi")):
        keys.append("analytics")
    if any(x in n for x in ("indeks", "arama", "tarama", "sitemap", "site haritasi")):
        keys.append("searchconsole")
    result, seen = [], set()
    for key in keys:
        label, url = OFFICIAL[key]
        if url not in seen:
            result.append((label, url))
            seen.add(url)
    return result[:4]

def build_related(all_articles):
    # Weighted overlap avoids recommending merely adjacent file names.
    df = Counter(token for art in all_articles for token in article_tokens(art["title"]))
    total = max(1, len(all_articles))
    vectors = []
    for art in all_articles:
        tokens = article_tokens(art["title"])
        vec = {t: math.log((total + 1) / (df[t] + 1)) + 1 for t in tokens}
        length = math.sqrt(sum(v * v for v in vec.values())) or 1.0
        vectors.append((tokens, vec, length))
    postings = {}
    for i, (_, vec, _) in enumerate(vectors):
        for term, weight in vec.items():
            postings.setdefault(term, []).append((i, weight))
    result = {}
    by_slug = {a["slug"]: i for i, a in enumerate(all_articles)}
    for i, (tokens, vec, length) in enumerate(vectors):
        scores = {}
        for term, weight in vec.items():
            for j, other_weight in postings.get(term, []):
                if j != i:
                    scores[j] = scores.get(j, 0.0) + weight * other_weight
        ranked = []
        for j, score in scores.items():
            sim = score / (length * vectors[j][2])
            if sim >= 0.08:
                ranked.append((sim, j))
        ranked.sort(key=lambda x: (-x[0], all_articles[x[1]]["title"].casefold()))
        result[all_articles[i]["slug"]] = [all_articles[j] for _, j in ranked[:3]]
    return result

def render_article(a, related):
    title, slug = a["title"], a["slug"]
    url = BASE + "/blog/tr/articles/" + slug + ".html"
    desc = clip(a["description"], 160)
    sections = []
    for section in a["sections"]:
        sections.append('<section><h2>' + html.escape(section["heading"]) + '</h2>' + render_blocks(section["blocks"]) + '</section>')
    checklist = (
        '<section class="checklist"><h2>Uygulamaya geçmeden önce kontrol listesi</h2>'
        '<p>Uygulamaya başlamadan önce hedefi ve başlangıç verisini kaydedin; ardından değişikliği küçük bir pilotla sınayın. '
        'Performansı yalnızca tek bir göstergeyle değerlendirmek yerine kullanıcı deneyimini ve iş amacını birlikte ele alın.</p>'
        '<ul><li>Hedefi, hedef kitleyi ve başlangıç durumunu yazılı olarak tanımlayın.</li>'
        '<li>Uygulama ve ölçümleme sürecini yayına almadan önce test edin.</li>'
        '<li>Sonuçları düzenli aralıklarla gözden geçirip kararları gerçek verilere dayandırın.</li></ul></section>'
    )
    faqs = a["faq"]
    if len(faqs) < 2:
        faqs = [
            {"q": title + " için ilk adım ne olmalı?", "a": "Önce hedefi, hedef kitlenin ihtiyacını ve mevcut performans verilerini belirleyin. Ardından ölçülebilir bir uygulama planı oluşturun."},
            {"q": "Bu çalışma Google'da belirli bir sıralamayı garanti eder mi?", "a": "Hayır. Organik sıralama garanti edilemez. Sonuçlar rekabet, teknik durum, içerik kalitesi ve kullanıcı ihtiyacını karşılama gibi unsurlara bağlıdır."},
        ]
    faq_html = '<section class="faq-section"><h2>Sıkça Sorulan Sorular</h2>' + ''.join(
        '<div class="faq-item"><h3>' + html.escape(x["q"]) + '</h3><p>' + html.escape(clean_claims(x["a"])) + '</p></div>' for x in faqs[:4]
    ) + '</section>'
    related_html = '<section class="related-topics"><h2>İlgili ve Önerilen Konular</h2><ul>' + ''.join(
        '<li><a href="/blog/tr/articles/' + html.escape(x["slug"]) + '.html">' + html.escape(x["title"]) + '</a></li>' for x in related
    ) + '</ul></section>'
    sources = select_sources(title)
    sources_html = '<section class="sources"><h2>Kaynaklar ve İleri Okuma</h2><ul>' + ''.join(
        '<li><a href="' + html.escape(link, quote=True) + '" target="_blank" rel="noopener noreferrer">' + html.escape(label) + '</a></li>' for label, link in sources
    ) + '</ul><p>Arama motoru yönergeleri ve platform kuralları güncellenebilir. Uygulama öncesinde resmî kaynakların güncel sürümünü kontrol edin.</p></section>'
    schema = {
        "@context": "https://schema.org", "@type": "BlogPosting",
        "headline": title, "description": desc, "datePublished": a["publishedAt"],
        "dateModified": a["updatedAt"], "author": {"@type": "Organization", "name": "RocketPen Digital Studio Yayın Ekibi"},
        "publisher": {"@type": "Organization", "name": "RocketPen Digital Studio"},
        "inLanguage": "tr", "keywords": ", ".join(sorted(article_tokens(title))),
        "wordCount": a["wordCount"], "mainEntityOfPage": url,
    }
    schema_json = json.dumps(schema, ensure_ascii=False).replace("</", "<\\/")
    intro_preview = clip(plain(a["intro"]), 420)
    return '''<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>''' + html.escape(clip(title, 57) + " | RocketPen") + '''</title>
<meta name="description" content="''' + html.escape(desc, quote=True) + '''"><meta name="robots" content="index,follow">
<link rel="canonical" href="''' + url + '''"><meta name="author" content="RocketPen Digital Studio Yayın Ekibi">
<meta property="og:type" content="article"><meta property="og:locale" content="tr_TR"><meta property="og:title" content="''' + html.escape(title, quote=True) + '''">
<meta property="og:description" content="''' + html.escape(desc, quote=True) + '''"><meta property="og:url" content="''' + url + '''">
<meta property="article:published_time" content="''' + a["publishedAt"] + '''"><meta name="twitter:card" content="summary">
<script type="application/ld+json">''' + schema_json + '''</script>
<link rel="icon" type="image/svg+xml" href="/asset/logo/favicon.svg"><link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--yellow:#ffeb00;--ink:#07090d;--pad:clamp(22px,5.5vw,88px);--font:"DM Sans",sans-serif;--display:"Space Grotesk",sans-serif}
*{box-sizing:border-box}body{margin:0;background:#f7f7f5;color:#15171d;font-family:var(--font);line-height:1.8}
.top{position:sticky;top:0;z-index:100;display:flex;align-items:center;padding:12px var(--pad);background:rgba(7,9,13,.95);border-bottom:1px solid #ffffff20;backdrop-filter:blur(18px)}
.logo{display:block;width:clamp(180px,24vw,290px);max-height:65px;object-fit:contain}
main{padding:clamp(42px,7vw,85px) 22px 80px}.article{max-width:850px;margin:auto}
.crumb{font-size:12px;color:#686d77;margin-bottom:24px}.crumb a{color:#555b65}
.tag{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#b50e1d;font-weight:700}
h1{font:700 clamp(38px,6vw,64px)/1.04 var(--display);letter-spacing:-.055em;margin:18px 0 20px}
.standfirst{font-size:clamp(17px,2vw,21px);color:#4d535d;line-height:1.7}
.meta{display:flex;gap:14px;flex-wrap:wrap;color:#777c85;font-size:12px;padding:20px 0 26px;border-bottom:1px solid #ddd}
.article section{margin:32px 0}.article h2{font:600 clamp(25px,3.6vw,34px)/1.18 var(--display);letter-spacing:-.03em;margin:0 0 14px}
.article h3{font-size:18px;line-height:1.4}.article p,.article li{font-size:16px;line-height:1.88;color:#3d424b}
.article a{color:#a30e1c;text-underline-offset:3px}.article ul,.article ol{padding-left:24px}
.faq-item{padding:14px 0;border-bottom:1px solid #ddd}.faq-item h3{margin-bottom:6px}
.sources{font-size:14px}.sources li{margin:6px 0}
.cta{margin-top:55px;padding:28px;background:#080a0f;color:#fff;border-left:4px solid var(--yellow)}
.cta h2{color:white}.cta p{color:#c5cad2}.cta a{display:inline-block;margin-top:10px;background:var(--yellow);color:#080a0f;padding:12px 16px;text-decoration:none;font-weight:700}
.foot{padding:24px var(--pad);background:#080a0f;color:#adb3bd;font-size:12px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}.foot a{color:#fff}
@media(max-width:600px){.top{padding:14px 20px}.article h1{font-size:40px}.article p,.article li{font-size:15px}.cta{padding:22px}}
</style><link rel="stylesheet" href="/asset/css/site-global-ui.css"></head><body>
<header class="top"><a href="/languages/tr.html#home" aria-label="RocketPen Digital Studio"><img class="logo" src="/asset/logo/logo-header.png" alt="RocketPen Digital Studio"></a></header>
<main><article class="article"><div class="crumb"><a href="/blog/tr/index.html">Dijital Blog</a> / Sektörel Rehber</div>
<div class="tag">UYGULAMALI DİJİTAL REHBER</div><h1>''' + html.escape(title) + '''</h1>
<p class="standfirst">''' + html.escape(intro_preview) + '''</p><div class="meta"><span>Yayın: ''' + a["publishedAt"] + '''</span><span>''' + str(a["wordCount"]) + ''' kelime</span><span>RocketPen Digital Studio Yayın Ekibi</span></div>
''' + render_blocks([a["intro"]]) + "\n".join(sections) + checklist + faq_html + related_html + sources_html + '''
<div class="cta"><h2>Bu yaklaşımı işletmenize uyarlamak ister misiniz?</h2>
<p>Markanızın hedeflerini, mevcut dijital varlıklarını ve büyüme ihtiyaçlarını birlikte değerlendirelim. RocketPen Digital ile doğru öncelikleri belirlemek için bizimle iletişime geçin.</p>
<a href="/languages/tr.html#contact">Projenizi konuşalım</a></div></article></main>
<footer class="foot"><span>© ''' + a["publishedAt"][:4] + ''' RocketPen Digital Studio</span><a href="/blog/tr/index.html">← Dijital Blog</a><a href="/languages/tr.html#contact">İletişim</a></footer>
<script src="/asset/js/site-global-ui.js" defer></script></body></html>
'''

def render_card(a, number):
    path = "/blog/tr/articles/" + html.escape(a["slug"]) + ".html"
    return ('<article class="article-card" data-category="industry-guides"><div class="article-no">' +
            str(number).zfill(4) + ' / TR / SEKTÖREL REHBER</div><div><h3><a href="' + path + '">' +
            html.escape(a["title"]) + '</a></h3><p>' + html.escape(clip(a.get("excerpt") or a.get("description") or "", 190)) +
            '</p></div><a class="read" href="' + path + '">Rehberi oku</a></article>')

def paginate(page, total):
    def link(n):
        return "/blog/tr/index.html" if n == 1 else "/blog/tr/page/" + str(n) + ".html"
    out = ['<nav class="pagination" aria-label="Sayfalama">']
    if page > 1:
        out.append('<a href="' + link(page-1) + '" rel="prev">Önceki</a>')
    lo, hi = max(1, page-2), min(total, page+2)
    if lo > 1:
        out.append('<a href="' + link(1) + '">1</a><span aria-hidden="true">…</span>')
    for n in range(lo, hi+1):
        out.append('<span class="current" aria-current="page">' + str(n) + '</span>' if n == page else '<a href="' + link(n) + '">' + str(n) + '</a>')
    if hi < total:
        out.append('<span aria-hidden="true">…</span><a href="' + link(total) + '">' + str(total) + '</a>')
    if page < total:
        out.append('<a href="' + link(page+1) + '" rel="next">Sonraki</a>')
    out.append('</nav>')
    return "".join(out)

def set_between(text, start, end, replacement):
    i, j = text.find(start), text.find(end)
    if i < 0 or j < i:
        raise RuntimeError("Blog template markers are missing.")
    return text[:i+len(start)] + "\n" + replacement + "\n" + text[j:]

def make_page(template, records, page, total):
    block = records[(page-1)*PAGE_SIZE:page*PAGE_SIZE]
    html_doc = set_between(template, "<!-- POSTS_START -->", "<!-- POSTS_END -->",
                            "\n".join(render_card(a, (page-1)*PAGE_SIZE+i+1) for i, a in enumerate(block)))
    if "<!-- PAGINATION_START -->" not in html_doc:
        html_doc = re.sub(r'(<nav class="pagination"[\s\S]*?</nav>)',
                          r'<!-- PAGINATION_START -->\n\1\n<!-- PAGINATION_END -->',
                          html_doc, count=1, flags=re.I)
    html_doc = set_between(html_doc, "<!-- PAGINATION_START -->", "<!-- PAGINATION_END -->", paginate(page, total))
    title = "Dijital Blog | RocketPen Digital Studio" if page == 1 else "Dijital Blog — Sayfa " + str(page) + " | RocketPen Digital Studio"
    canonical = BASE + ("/blog/tr/index.html" if page == 1 else "/blog/tr/page/" + str(page) + ".html")
    html_doc = re.sub(r"<title>[\s\S]*?</title>", "<title>" + html.escape(title) + "</title>", html_doc, count=1, flags=re.I)
    if re.search(r'<link rel="canonical" href="[^"]*">', html_doc, re.I):
        html_doc = re.sub(r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="' + canonical + '">', html_doc, count=1, flags=re.I)
    else:
        html_doc = html_doc.replace("</head>", '<link rel="canonical" href="' + canonical + '">\n</head>')
    html_doc = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="' + html.escape(title, quote=True) + '">', html_doc, count=1, flags=re.I)
    html_doc = re.sub(r'<meta property="og:url" content="[^"]*">', '<meta property="og:url" content="' + canonical + '">', html_doc, count=1, flags=re.I)
    return html_doc

def update_sitemap(article_records, total_pages):
    if SITEMAP.exists():
        root = ET.parse(SITEMAP).getroot()
    else:
        root = ET.Element("{" + SM + "}urlset")
    if root.tag != "{" + SM + "}urlset":
        raise RuntimeError("Unexpected sitemap root; refusing to overwrite.")
    existing = {(e.findtext("{" + SM + "}loc") or "").strip() for e in root.findall("{" + SM + "}url")}
    urls = [BASE + "/blog/tr/index.html"]
    urls.extend(BASE + "/blog/tr/page/" + str(n) + ".html" for n in range(2, total_pages+1))
    urls.extend(BASE + "/blog/tr/articles/" + a["slug"] + ".html" for a in article_records)
    added = 0
    for url in urls:
        if url in existing:
            continue
        node = ET.SubElement(root, "{" + SM + "}url")
        ET.SubElement(node, "{" + SM + "}loc").text = url
        ET.SubElement(node, "{" + SM + "}lastmod").text = TODAY
        existing.add(url)
        added += 1
    ET.indent(root, space="  ")
    SITEMAP.write_bytes(ET.tostring(root, encoding="utf-8", xml_declaration=True) + b"\n")
    return added, len(existing)

def main():
    if len(ARCHIVES) != 6:
        raise SystemExit("Expected 6 article archives, found " + str(len(ARCHIVES)))
    ARTICLE_DIR.mkdir(parents=True, exist_ok=True)
    if not LISTING.exists():
        raise SystemExit("Turkish blog listing not found: " + str(LISTING))
    template = LISTING.read_text(encoding="utf-8")
    if "<!-- POSTS_START -->" not in template or "<!-- POSTS_END -->" not in template:
        raise SystemExit("Existing Turkish blog listing markers are missing.")

    old = []
    old_slugs, old_titles, old_digests = set(), set(), set()
    for file in sorted(ARTICLE_DIR.glob("*.html")):
        source = file.read_text(encoding="utf-8", errors="replace")
        title = plain(re.search(r"<h1[^>]*>([\s\S]*?)</h1>", source, re.I).group(1)) if re.search(r"<h1[^>]*>([\s\S]*?)</h1>", source, re.I) else ""
        if not title:
            continue
        desc_match = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', source, re.I)
        desc = html.unescape(desc_match.group(1)) if desc_match else title
        date_match = re.search(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})"', source)
        record = {"slug":file.stem,"title":title,"description":desc,"excerpt":desc,"publishedAt":date_match.group(1) if date_match else "2026-10-21","existing":True}
        old.append(record)
        old_slugs.add(file.stem)
        old_titles.add(norm(title))

    report = {
        "generatedAt": TODAY, "archives": [], "archiveMarkdownCount": 0,
        "importedCount": 0, "existingHtmlArticleCount": len(old),
        "skippedExistingSlug": 0, "skippedDuplicateTitle": 0,
        "skippedDuplicateBody": 0, "skippedQualityGate": 0,
        "notes": [
            "Markdown content is retained with safe HTML rendering, contextual title metadata, structured data, internal related-topic links, and official source links.",
            "Absolute performance promises and fixed SEO/ads result timelines are softened; unsupported company self-citations are removed from the source section.",
            "Technical SEO does not guarantee indexing or rankings; human editorial review of templated source content remains recommended."
        ],
    }
    old_digests = set()\n    candidates, seen_titles, seen_digests = [], set(), set()
    slug_counter = Counter(old_slugs)
    for archive in ARCHIVES:
        with ZipFile(archive) as z:
            infos = [x for x in z.infolist() if not x.is_dir()]
            md = [x for x in infos if Path(x.filename).suffix.lower() == ".md"]
            report["archiveMarkdownCount"] += len(md)
            report["archives"].append({"file":archive.name,"entries":len(infos),"markdownFiles":len(md)})
            for info in md:
                try:
                    content = z.read(info).decode("utf-8-sig", errors="replace")
                except Exception:
                    report["skippedQualityGate"] += 1
                    continue
                a = parse_markdown(content, info.filename)
                if not a:
                    report["skippedQualityGate"] += 1
                    continue
                title_key = norm(a["title"])
                if a["slug"] in old_slugs or a["slug"] in slug_counter:
                    report["skippedExistingSlug"] += 1
                    continue
                if title_key in old_titles or title_key in seen_titles:
                    report["skippedDuplicateTitle"] += 1
                    continue
                if a["digest"] in seen_digests or a["digest"] in old_digests:
                    report["skippedDuplicateBody"] += 1
                    continue
                seen_titles.add(title_key)
                seen_digests.add(a["digest"])
                slug_counter[a["slug"]] += 1
                candidates.append(a)
    # Re-read existing digest set only to maintain a simple dedupe invariant; current article HTML files are never overwritten.
    old_digests = set()

    # Allocate unique safe slugs in case similarly named files occurred in different archives.
    used = set(old_slugs)
    for a in candidates:
        if a["slug"] in used:
            a["slug"] = a["slug"][:76] + "-" + hashlib.sha1((a["source"] + a["title"]).encode()).hexdigest()[:8]
        used.add(a["slug"])

    all_links = old + [{"slug":a["slug"],"title":a["title"],"description":a["description"],"excerpt":a["excerpt"],"publishedAt":a["publishedAt"]} for a in candidates]
    related = build_related(all_links)
    candidate_slugs = {a["slug"] for a in candidates}
    for a in candidates:
        links = related.get(a["slug"], [])
        links = [x for x in links if x.get("existing") or x["slug"] in candidate_slugs][:3]
        (ARTICLE_DIR / (a["slug"] + ".html")).write_text(render_article(a, links), encoding="utf-8")

    # Existing HTML articles plus all new pages, sorted newest first but alphabetically stable for the same day.
    all_records = old + [{"slug":a["slug"],"title":a["title"],"description":a["description"],"excerpt":a["excerpt"],"publishedAt":a["publishedAt"]} for a in candidates]
    all_records.sort(key=lambda a: (a.get("publishedAt") or "", a["title"].casefold()), reverse=True)
    total_pages = max(1, math.ceil(len(all_records)/PAGE_SIZE))
    LISTING.write_text(make_page(template, all_records, 1, total_pages), encoding="utf-8")
    PAGES_DIR.mkdir(parents=True, exist_ok=True)
    for page in range(2, total_pages+1):
        (PAGES_DIR / (str(page) + ".html")).write_text(make_page(template, all_records, page, total_pages), encoding="utf-8")
    for file in PAGES_DIR.glob("*.html"):
        if file.stem.isdigit() and int(file.stem) > total_pages:
            file.unlink()

    new_urls, all_urls = update_sitemap(all_records, total_pages)
    report.update({
        "importedCount":len(candidates), "skippedExistingSlug":report["skippedExistingSlug"],
        "existingHtmlArticleCount":len(old), "finalTurkishArticleCount":len(all_records),
        "turkishListingPages":total_pages, "newSitemapUrls":new_urls,
        "sitemapTotalUrls":all_urls,
        "sampleArticleUrl":BASE+"/blog/tr/articles/"+(candidates[0]["slug"] if candidates else old[0]["slug"])+".html" if (candidates or old) else "",
    })
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["importedCount"] == 0:
        print("No new articles imported; existing pages and site content remain preserved.")

if __name__ == "__main__":
    main()
