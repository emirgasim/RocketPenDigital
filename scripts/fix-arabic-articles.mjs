import fs from 'node:fs';
import path from 'node:path';
const dir = 'blog/ar/articles';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
const titleOf = html => ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([\s\S]*?)<\/title>/i) || [,'دليل رقمي'])[1] || 'دليل رقمي').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().replace(/\s*\|\s*RocketPen.*$/i,'');
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const tokens = f => f.replace(/\.html$/,'').split(/[-_]/).filter(t => t.length > 2 && !['guide','plan','checklist','digital','content','website','local','seo'].includes(t));
const data = files.map(file => ({file, title:titleOf(read(file)), tokens:tokens(file)}));
let changedFiles = 0;
for (const item of data) {
  const filePath = path.join(dir, item.file);
  const original = fs.readFileSync(filePath, 'utf8');
  let html = original;
  const header = '<header class="top article-site-header"><a class="brand-link" href="/languages/ar.html#home" aria-label="RocketPen Digital Studio"><img class="logo-image" src="/asset/logo/logo-header.png" alt="RocketPen Digital Studio"></a><div class="nav-right"><details class="language-picker"><summary class="lang" aria-label="اللغة"><span class="lang-globe" aria-hidden="true">◎</span><span class="lang-code">AR</span><span class="lang-label">اللغة</span><span class="lang-chevron" aria-hidden="true"></span></summary><div class="language-menu" aria-label="اللغة"><a href="/" class="language-option"><span class="language-option-code">EN</span><span class="language-option-name">English</span><span class="language-check">✓</span></a><a href="/languages/tr.html" class="language-option"><span class="language-option-code">TR</span><span class="language-option-name">Türkçe</span><span class="language-check">✓</span></a><a href="/languages/ar.html" class="language-option" aria-current="page"><span class="language-option-code">AR</span><span class="language-option-name">العربية</span><span class="language-check">✓</span></a></div></details></div></header>';
  if (/<header\b[\s\S]*?<\/header>/i.test(html)) html = html.replace(/<header\b[\s\S]*?<\/header>/i, header);
  else html = html.replace(/<body[^>]*>/i, m => m + header);
  const css = [
    '/* Standard Arabic article header: shared brand logo and soft white glow. */',
    '.article-site-header{position:sticky;top:0;z-index:1000;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px clamp(18px,5vw,70px);background:rgba(7,9,13,.94);color:#fff;border-bottom:1px solid rgba(255,255,255,.14);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}',
    '.article-site-header .brand-link{display:flex;align-items:center;min-width:0;line-height:0}',
    '.article-site-header .logo-image{display:block;width:clamp(175px,24vw,300px);max-width:100%;max-height:66px;height:auto;object-fit:contain;filter:drop-shadow(0 0 5px rgba(255,255,255,.42)) drop-shadow(0 0 14px rgba(255,255,255,.22))}',
    '.article-site-header .navlinks{display:flex;align-items:center;gap:clamp(10px,2vw,22px);flex-wrap:wrap;font-size:12px}',
    '.article-site-header .navlinks a{color:#fff;text-decoration:none}',
    '.article-site-header .navlinks a:hover,.article-site-header .navlinks a:focus-visible{color:#ffeb00}',
    '@media(max-width:600px){.article-site-header{padding:12px 16px;gap:10px;flex-wrap:wrap}.article-site-header .logo-image{width:clamp(155px,48vw,210px);max-height:48px}.article-site-header .navlinks{gap:12px;font-size:11px}}'
  ].join('\n');
  const sharedHeaderCss = [
    '/* Standard Arabic article header v2: match the Arabic blog top bar. */',
    '.article-site-header{direction:rtl;position:sticky!important;top:0;z-index:1000;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px var(--pad,clamp(22px,5.5vw,88px));background:rgba(7,9,13,.94);color:#fff;border-bottom:1px solid rgba(255,255,255,.14);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}',
    '.article-site-header .brand-link{display:flex;align-items:center;min-width:0;line-height:0;text-decoration:none}',
    '.article-site-header .logo-image{display:block;width:clamp(210px,24vw,320px);max-width:100%;max-height:52px;height:auto;object-fit:contain;filter:drop-shadow(0 0 5px rgba(255,255,255,.32)) drop-shadow(0 0 13px rgba(255,255,255,.16))}',
    '.article-site-header .nav-right{display:flex;align-items:center;justify-content:flex-start;flex:0 0 auto}',
    '.article-site-header .language-picker{position:relative;z-index:30}',
    '.article-site-header .language-picker summary{list-style:none;display:flex;align-items:center;gap:9px;padding:10px 13px;border:1px solid rgba(255,255,255,.24);border-radius:4px;background:rgba(255,255,255,.045);color:#fff;font-size:11px;letter-spacing:1.1px;cursor:pointer;backdrop-filter:blur(12px);box-shadow:inset 0 1px rgba(255,255,255,.06)}',
    '.article-site-header .language-picker summary::-webkit-details-marker{display:none}',
    '.article-site-header .lang-globe{font-size:17px;color:#ffeb00}',
    '.article-site-header .lang-label{font-size:8px;letter-spacing:1.4px;color:#aeb3bd;border-right:1px solid rgba(255,255,255,.18);padding-right:9px}',
    '.article-site-header .lang-chevron{width:7px;height:7px;border-right:1px solid #ffeb00;border-bottom:1px solid #ffeb00;transform:rotate(45deg);transition:transform .2s}',
    '.article-site-header .language-picker[open] .lang-chevron{transform:rotate(225deg)}',
    '.article-site-header .language-menu{position:absolute;top:calc(100% + 10px);left:0;right:auto;width:190px;padding:7px;background:rgba(12,15,21,.97);border:1px solid rgba(255,255,255,.16);border-radius:8px;box-shadow:0 18px 55px rgba(0,0,0,.42),inset 0 1px rgba(255,255,255,.05);backdrop-filter:blur(22px)}',
    '.article-site-header .language-option{display:grid;grid-template-columns:34px 1fr 14px;gap:9px;align-items:center;width:100%;padding:12px 10px;color:#f7f7f5!important;background:transparent;border:0;border-radius:4px;text-align:right;font-size:12px;text-decoration:none}',
    '.article-site-header .language-option:hover,.article-site-header .language-option:focus-visible{background:rgba(255,235,0,.08);color:#ffeb00!important}',
    '.article-site-header .language-option-code{font-size:10px;letter-spacing:1px;color:#ffeb00;font-weight:700}',
    '.article-site-header .language-option-name{color:inherit}',
    '.article-site-header .language-check{color:#ffeb00;opacity:.7}',
    '@media(max-width:760px){.article-site-header{padding:12px 20px;gap:12px}.article-site-header .logo-image{width:clamp(175px,54vw,235px);max-height:48px}.article-site-header .language-picker summary{padding:9px 11px;gap:7px}.article-site-header .lang-label{display:none}}',
    '@media(max-width:380px){.article-site-header{padding:12px 14px}.article-site-header .logo-image{width:clamp(145px,46vw,175px)}.article-site-header .language-picker summary{padding:8px}}'
  ].join('\\n');
  if (!html.includes('Standard Arabic article header v2: match the Arabic blog top bar')) html = html.replace(/<\\/style>/i, sharedHeaderCss + '</style>');
  if (!/<link\s+rel=["']canonical["']/i.test(html)) html = html.replace(/<meta\s+name=["']robots["'][^>]*>/i, m => m + '<link rel="canonical" href="https://rocketpendigital.com/blog/ar/articles/' + item.file + '">');
  const related = data.filter(x => x.file !== item.file).map(x => ({...x, score:x.tokens.reduce((s,t)=>s+(item.tokens.includes(t)?1:0),0)})).sort((a,b)=>b.score-a.score || a.file.localeCompare(b.file)).slice(0,3);
  const relatedHtml = '<section class="related-topics" aria-labelledby="related-topics-title"><h2 id="related-topics-title">موضوعات مقترحة للقراءة</h2><ul>' + related.map(x => '<li><a href="/blog/ar/articles/' + x.file + '">' + esc(x.title) + '</a></li>').join('') + '</ul></section>';
  const relRe = /<section\b[^>]*class=["'][^"']*(?:related-topics|related|recommended)[^"']*["'][\s\S]*?<\/section>/i;
  if (relRe.test(html)) html = html.replace(relRe, relatedHtml);
  else if (html.includes('</article>')) html = html.replace('</article>', relatedHtml + '</article>');
  else html = html.replace(/<\/main>/i, relatedHtml + '</main>');
  if (!/<section\b[^>]*class=["'][^"']*faq[^"']*["']/i.test(html) && !/الأسئلة الشائعة|أسئلة شائعة|الأسئلة المتكررة/.test(html)) {
    const faq = '<section class="faq" aria-labelledby="faq-title"><h2 id="faq-title">الأسئلة الشائعة</h2><div><h3>ما أهم خطوة للبدء في موضوع «' + esc(item.title) + '»؟</h3><p>ابدأ بتحديد هدف النشاط والجمهور المقصود، ثم راجع المعلومات الحالية وحدد الأولويات التي يمكن تنفيذها وقياس أثرها.</p></div><div><h3>كيف أختار الحل المناسب؟</h3><p>قارن الخيارات وفق احتياجات العملاء والموارد المتاحة والنتائج القابلة للقياس، وتجنب اعتماد حل عام لا يناسب طبيعة النشاط.</p></div><div><h3>كيف يمكن تقييم النتائج؟</h3><p>حدد مؤشرات واضحة قبل التنفيذ، وسجل خط الأساس، ثم راجع النتائج بانتظام وعدّل الخطوات بناءً على البيانات الفعلية.</p></div></section>';
    if (html.includes('related-topics-title')) html = html.replace(/<section class="related-topics"/i, faq + '<section class="related-topics"');
    else html = html.replace(/<div class=["']cta["']/i, faq + '<div class="cta"');
  }
  if (!/href=["']\/languages\/ar\.html#contact["']/i.test(html)) {
    const cta = '<div class="cta"><h2>هل ترغب في تطوير حضورك الرقمي؟</h2><p>تواصل مع فريق RocketPen Digital لمناقشة احتياجات نشاطك وتحديد الخطوات المناسبة لتحسين موقعك ومحتواك.</p><a href="/languages/ar.html#contact">تواصل معنا بشأن مشروعك</a></div>';
    html = html.includes('</article>') ? html.replace('</article>', cta + '</article>') : html.replace(/<\/main>/i, cta + '</main>');
  }
  if (html !== original) { fs.writeFileSync(filePath, html); changedFiles++; }
}
console.log(JSON.stringify({articles:files.length, changedFiles}, null, 2));
