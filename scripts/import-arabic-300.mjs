import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const archive = 'imports/RocketPenDigital_300_LongArticles_Complete.zip';
if (!fs.existsSync(archive)) {
  console.error('Missing import archive: ' + archive + '. Upload the provided ZIP to this path, then rerun this workflow.');
  process.exit(2);
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rocketpen-ar-'));
execFileSync('unzip', ['-q', archive, '-d', temp]);
const inputFiles = fs.readdirSync(temp)
  .filter(n => /^RocketPen_LongArticle_\d+\.md$/i.test(n))
  .sort((a,b) => Number(a.match(/(\d+)/)[1]) - Number(b.match(/(\d+)/)[1]));
if (inputFiles.length !== 300) throw new Error('Expected 300 Markdown articles; found ' + inputFiles.length);

const outDir = 'blog/ar/articles';
fs.mkdirSync(outDir, { recursive: true });
const existing = new Set(fs.readdirSync(outDir).filter(n => n.endsWith('.html')));
const slugMap = {'ا':'a','أ':'a','إ':'i','آ':'aa','ء':'','ؤ':'w','ئ':'y','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','ة':'h','و':'w','ى':'a','ي':'y','پ':'p','چ':'ch','گ':'g'};
const escapeHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const inline = s => escapeHtml(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/\x60([^\x60]+)\x60/g,'<code>$1</code>');
const plain = s => String(s || '').replace(/\*\*/g,'').replace(/\*/g,'').replace(/\x60/g,'').replace(/^\s*[-*+]\s+/,'').replace(/^\s*\d+\.\s+/,'').replace(/\s+/g,' ').trim();
function slugify(title, n) {
  let slug = title.normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g,'').toLowerCase()
    .replace(/[ابتثجحخدذرزسشصضطظعغفقكلمنهةوىءأإآؤئيپچگ]/g, c => slugMap[c] ?? '')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-+/g,'-').slice(0,110).replace(/-+$/g,'');
  if (!slug) slug = 'arabic-long-guide';
  let candidate = slug + '.html';
  if (existing.has(candidate)) candidate = slug + '-arabic-guide-' + n + '.html';
  let k = 2;
  while (existing.has(candidate)) candidate = slug + '-import-' + n + '-' + k++ + '.html';
  existing.add(candidate);
  return candidate;
}
function markdownToHtml(md) {
  const lines = md.replace(/\r/g,'').split('\n');
  const out = [];
  let para = [], listType = null;
  const closeList = () => { if (listType) { out.push('</' + listType + '>'); listType = null; } };
  const flushPara = () => { if (para.length) { out.push('<p>' + inline(para.join(' ').trim()) + '</p>'); para = []; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushPara(); closeList(); continue; }
    if (/^---+$/.test(line)) { flushPara(); closeList(); continue; }
    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) { flushPara(); closeList(); const level = Math.min(Math.max(h[1].length, 2), 4); out.push('<h' + level + '>' + inline(h[2]) + '</h' + level + '>'); continue; }
    const ol = line.match(/^\d+\.\s+(.+)$/);
    const ul = line.match(/^[-*+]\s+(.+)$/);
    if (ol || ul) {
      flushPara();
      const wanted = ol ? 'ol' : 'ul';
      if (listType !== wanted) { closeList(); out.push('<' + wanted + '>'); listType = wanted; }
      out.push('<li>' + inline((ol || ul)[1]) + '</li>');
      continue;
    }
    flushPara(); closeList(); para.push(line);
  }
  flushPara(); closeList();
  return out.join('\n');
}
const articles = [];
for (const inputFile of inputFiles) {
  const raw = fs.readFileSync(path.join(temp,inputFile),'utf8').replace(/^\uFEFF/,'');
  const title = plain((raw.match(/^#\s+(.+)$/m) || [,'دليل التسويق الرقمي'])[1]);
  const first = raw.split('\n').find((l,idx) => idx > 0 && l.trim() && !l.trim().startsWith('#'));
  const description = plain(first || title).slice(0,250);
  const sourceNum = Number(inputFile.match(/(\d+)/)[1]);
  const filename = slugify(title, sourceNum);
  const url = '/blog/ar/articles/' + filename;
  const content = markdownToHtml(raw.replace(/^#\s+.+\n?/,''));
  articles.push({title,description,filename,url,content,sourceNum});
}
const sharedCss = [
  ':root{--yellow:#ffeb00;--pad:clamp(22px,5.5vw,88px);--font:"DM Sans",Tahoma,Arial,sans-serif;--display:"DM Sans",Tahoma,Arial,sans-serif}',
  '*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f7f7f5;color:#15171d;font-family:var(--font);line-height:1.9;direction:rtl;text-align:right}',
  '.article-site-header{direction:rtl;position:sticky;top:0;z-index:1000;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px var(--pad);background:rgba(7,9,13,.96);color:#fff;border-bottom:1px solid rgba(255,255,255,.14);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}',
  '.article-site-header .brand-link{display:flex;align-items:center;min-width:0;line-height:0;text-decoration:none}.article-site-header .logo-image{display:block;width:clamp(210px,24vw,320px);max-width:100%;max-height:52px;height:auto;object-fit:contain;filter:drop-shadow(0 0 5px rgba(255,255,255,.32)) drop-shadow(0 0 13px rgba(255,255,255,.16))}',
  '.article-site-header .nav-right{display:flex;align-items:center;flex:0 0 auto}.article-site-header .language-picker{position:relative;z-index:30}.article-site-header .language-picker summary{list-style:none;display:flex;align-items:center;gap:9px;padding:10px 13px;border:1px solid rgba(255,255,255,.24);border-radius:4px;background:rgba(255,255,255,.045);color:#fff;font-size:11px;cursor:pointer}.article-site-header .language-picker summary::-webkit-details-marker{display:none}.article-site-header .lang-globe,.article-site-header .lang-code{color:#ffeb00}.article-site-header .lang-label{font-size:8px;color:#aeb3bd;border-right:1px solid rgba(255,255,255,.18);padding-right:9px}.article-site-header .lang-chevron{width:7px;height:7px;border-right:1px solid #ffeb00;border-bottom:1px solid #ffeb00;transform:rotate(45deg)}',
  '.article-site-header .language-menu{position:absolute;top:calc(100% + 10px);left:0;width:190px;padding:7px;background:rgba(12,15,21,.98);border:1px solid rgba(255,255,255,.16);border-radius:8px;box-shadow:0 18px 55px rgba(0,0,0,.42)}.article-site-header .language-option{display:grid;grid-template-columns:34px 1fr 14px;gap:9px;align-items:center;padding:12px 10px;color:#f7f7f5;text-decoration:none;font-size:12px}.article-site-header .language-option-code{color:#ffeb00;font-size:10px}.article-site-header .language-check{color:#ffeb00}',
  '.main{padding:clamp(35px,6vw,80px) 22px}.article{max-width:900px;margin:auto}.crumb{font-size:12px;color:#707580;margin-bottom:24px}.crumb a{color:#a30e1c}.article h1{font:700 clamp(32px,5vw,56px)/1.35 var(--display);margin:16px 0 20px}.standfirst{font-size:clamp(17px,2vw,21px);color:#4d535d}.article h2{font-size:clamp(23px,3.3vw,31px);line-height:1.5;margin:34px 0 12px}.article h3{font-size:20px;line-height:1.5}.article p,.article li{font-size:16px;line-height:2;color:#3d424b}.article ul,.article ol{padding-right:26px}.meta{display:flex;gap:14px;flex-wrap:wrap;color:#777c85;font-size:12px;padding:15px 0 25px;border-bottom:1px solid #ddd}.article .faq,.article .related-topics{border-top:1px solid #ddd;padding-top:18px;margin-top:42px}.cta{margin-top:44px;background:#080a0f;color:white;padding:28px 30px;border-right:4px solid var(--yellow)}.cta h2,.cta p{color:white}.cta p{color:#c4c8d0}.cta a,.read{display:inline-block;background:var(--yellow);color:#0a0b0e;padding:12px 17px;font-size:12px;font-weight:700;text-decoration:none}.back{padding:22px var(--pad);background:#080a0f;color:#a9afba;display:flex;justify-content:space-between;gap:16px;font-size:12px}.back a{color:#fff}',
  '@media(max-width:760px){.article-site-header{padding:12px 20px;gap:12px}.article-site-header .logo-image{width:clamp(175px,54vw,235px);max-height:48px}.article-site-header .lang-label{display:none}.main{padding:35px 20px}.article p,.article li{font-size:15px}.back{flex-direction:column}}'
].join('\n');
function header() {
  return '<header class="top article-site-header"><a class="brand-link" href="/languages/ar.html#home" aria-label="RocketPen Digital Studio"><img class="logo-image" src="/asset/logo/logo-header.png" alt="RocketPen Digital Studio"></a><div class="nav-right"><details class="language-picker"><summary class="lang" aria-label="اللغة"><span class="lang-globe" aria-hidden="true">◎</span><span class="lang-code">AR</span><span class="lang-label">اللغة</span><span class="lang-chevron" aria-hidden="true"></span></summary><div class="language-menu" aria-label="اللغة"><a href="/" class="language-option"><span class="language-option-code">EN</span><span class="language-option-name">English</span><span class="language-check">✓</span></a><a href="/languages/tr.html" class="language-option"><span class="language-option-code">TR</span><span class="language-option-name">Türkçe</span><span class="language-check">✓</span></a><a href="/languages/ar.html" class="language-option" aria-current="page"><span class="language-option-code">AR</span><span class="language-option-name">العربية</span><span class="language-check">✓</span></a></div></details></div></header>';
}
for (let i=0;i<articles.length;i++) {
  const a=articles[i], related=[articles[(i+1)%articles.length],articles[(i+2)%articles.length],articles[(i+3)%articles.length]];
  const faq = /الأسئلة الشائعة|أسئلة شائعة|FAQ/i.test(a.content) ? '' : '<section class="faq"><h2>الأسئلة الشائعة</h2><h3>ما الخطوة الأولى لتطبيق هذا الدليل؟</h3><p>ابدأ بتحديد هدف واضح والجمهور المستهدف، ثم راجع وضعك الحالي وحدد الأولويات القابلة للتنفيذ والقياس.</p><h3>كيف أقيس النتائج؟</h3><p>حدد مؤشرات أداء مناسبة قبل التنفيذ، وراجع النتائج بانتظام وعدّل الخطة استناداً إلى البيانات الفعلية.</p></section>';
  const rel = '<section class="related-topics"><h2>موضوعات مقترحة للقراءة</h2><ul>' + related.map(x=>'<li><a href="'+x.url+'">'+escapeHtml(x.title)+'</a></li>').join('') + '</ul></section>';
  const cta = '<section class="cta"><h2>هل تريد تطوير حضورك الرقمي؟</h2><p>تواصل مع فريق RocketPen Digital لمناقشة احتياجات نشاطك وتحديد الخطوات المناسبة لتحسين موقعك ومحتواك.</p><a href="/languages/ar.html#contact">تواصل معنا بشأن مشروعك</a></section>';
  const schema = JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting',headline:a.title,description:a.description,inLanguage:'ar',author:{'@type':'Organization',name:'RocketPen Digital Studio'},publisher:{'@type':'Organization',name:'RocketPen Digital Studio'}}).replace(/</g,'\\u003c');
  const body = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escapeHtml(a.title)+' | RocketPen Digital</title><meta name="description" content="'+escapeHtml(a.description)+'"><meta name="robots" content="index,follow"><link rel="icon" type="image/svg+xml" href="/asset/logo/favicon.svg"><meta property="og:type" content="article"><meta property="og:title" content="'+escapeHtml(a.title)+'"><meta property="og:description" content="'+escapeHtml(a.description)+'"><link rel="canonical" href="https://rocketpendigital.com'+a.url+'"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><style>'+sharedCss+'</style><link rel="stylesheet" href="/asset/css/responsive-overrides.css"><link rel="stylesheet" href="/asset/css/site-global-ui.css"><script type="application/ld+json">'+schema+'</script></head><body>'+header()+'<main class="main"><article class="article"><div class="crumb"><a href="/blog/ar/index.html">المدونة الرقمية</a> / دليل عملي</div><h1>'+escapeHtml(a.title)+'</h1><p class="standfirst">'+escapeHtml(a.description)+'</p><div class="meta"><span>فريق RocketPen Digital Studio</span><span>دليل عملي</span></div>'+a.content+faq+rel+cta+'</article></main><footer class="back"><span>© 2026 RocketPen Digital Studio</span><a href="/languages/ar.html">الرئيسية</a><span><a href="/blog/en/index.html">EN</a> · <a href="/blog/tr/index.html">TR</a> · <a href="/blog/ar/index.html">AR</a></span></footer><script src="/asset/js/site-global-ui.js" defer></script></body></html>';
  fs.writeFileSync(path.join(outDir,a.filename),body);
}
function card(a, number) {
  return '<article class="article-card" data-category="long-guide"><div class="article-no">'+String(number).padStart(3,'0')+' / دليل رقمي</div><div><h3><a href="'+a.url+'">'+escapeHtml(a.title)+'</a></h3><p>'+escapeHtml(a.description)+'</p></div><a class="read" href="'+a.url+'">اقرأ الدليل</a></article>';
}
function pagination(page, total) {
  let html = '<nav class="pagination" aria-label="ترقيم صفحات المدونة">';
  for(let p=1;p<=total;p++) {
    const href = p===1 ? '/blog/ar/index.html' : '/blog/ar/page/'+p+'.html';
    html += p===page ? '<span class="current" aria-current="page" aria-label="الصفحة '+p+'">'+p+'</span>' : '<a class="page-number" href="'+href+'" aria-label="الصفحة '+p+'">'+p+'</a>';
  }
  if(page<total) html += '<a class="page-next" href="/blog/ar/page/'+(page+1)+'.html" rel="next">التالي ←</a>';
  if(page>1) html += '<a class="page-next" href="'+(page===2?'/blog/ar/index.html':'/blog/ar/page/'+(page-1)+'.html')+'" rel="prev">→ السابق</a>';
  return html+'</nav>';
}
const totalArticles = 150 + articles.length, totalPages = Math.ceil(totalArticles/15);
let indexHtml = fs.readFileSync('blog/ar/index.html','utf8');
indexHtml = indexHtml.replace(/<!-- PAGINATION_START -->[\s\S]*?<!-- PAGINATION_END -->/, '<!-- PAGINATION_START -->\n'+pagination(1,totalPages)+'\n<!-- PAGINATION_END -->');
fs.writeFileSync('blog/ar/index.html',indexHtml);
for(let p=2;p<=10;p++) {
  const file='blog/ar/page/'+p+'.html';
  let html=fs.readFileSync(file,'utf8');
  html=html.replace(/<!-- PAGINATION_START -->[\s\S]*?<!-- PAGINATION_END -->/, '<!-- PAGINATION_START -->\n'+pagination(p,totalPages)+'\n<!-- PAGINATION_END -->');
  fs.writeFileSync(file,html);
}
const template = fs.readFileSync('blog/ar/page/10.html','utf8');
for(let p=11;p<=totalPages;p++) {
  const start=(p-11)*15, subset=articles.slice(start,start+15);
  let html=template;
  const cards=subset.map((a,i)=>card(a,150+start+i+1)).join('\n');
  html=html.replace(/<!-- POSTS_START -->[\s\S]*?<!-- POSTS_END -->/, '<!-- POSTS_START -->\n'+cards+'\n<!-- POSTS_END -->');
  html=html.replace(/<!-- PAGINATION_START -->[\s\S]*?<!-- PAGINATION_END -->/, '<!-- PAGINATION_START -->\n'+pagination(p,totalPages)+'\n<!-- PAGINATION_END -->');
  fs.writeFileSync('blog/ar/page/'+p+'.html',html);
}
let sitemap=fs.readFileSync('sitemap.xml','utf8');
const currentLocs=new Set(Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g),m=>m[1]));
const today=new Date().toISOString().slice(0,10), additions=[];
for(const a of articles) { const full='https://rocketpendigital.com'+a.url; if(!currentLocs.has(full)) additions.push('  <url><loc>'+full+'</loc><lastmod>'+today+'</lastmod></url>'); }
for(let p=11;p<=totalPages;p++) { const full='https://rocketpendigital.com/blog/ar/page/'+p+'.html'; if(!currentLocs.has(full)) additions.push('  <url><loc>'+full+'</loc><lastmod>'+today+'</lastmod></url>'); }
sitemap=sitemap.replace(/<\/urlset>\s*$/,'  '+additions.join('\n  ')+'\n</urlset>\n');
fs.writeFileSync('sitemap.xml',sitemap);
fs.rmSync(temp,{recursive:true,force:true});
console.log(JSON.stringify({imported:articles.length,totalArticles,totalPages,listingPagesCreated:totalPages-10,sitemapUrlsAdded:additions.length},null,2));
