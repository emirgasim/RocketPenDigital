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
  const header = '<header class="top article-site-header"><a class="brand-link" href="/languages/ar.html#home" aria-label="RocketPen Digital Studio"><img class="logo-image" src="/asset/logo/logo-header.png" alt="RocketPen Digital Studio"></a><nav class="navlinks" aria-label="التنقل الرئيسي"><a href="/blog/ar/index.html">المدونة</a><a href="/languages/ar.html#services">الخدمات</a><a href="/languages/ar.html#contact">تواصل معنا</a></nav></header>';
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
  if (!html.includes('Standard Arabic article header: shared brand logo')) html = html.replace(/<\/style>/i, css + '</style>');
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
