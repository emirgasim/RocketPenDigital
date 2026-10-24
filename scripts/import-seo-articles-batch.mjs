import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_PATH = process.argv[2] || '/tmp/rocketpen-tr-101-140.json';
const ARTICLE_DIR = path.join(ROOT, 'blog/tr/articles');
const LISTING_DIR = path.join(ROOT, 'blog/tr');
const PAGE_DIR = path.join(LISTING_DIR, 'page');
const TEMPLATE_PATH = path.join(ARTICLE_DIR, 'teknik-seo-kontrol-listesi.html');
const PUBLISHED = '2026-10-24';
const DISPLAY_DATE = '24 Ekim 2026';
const PER_PAGE = 15;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function jsonForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
function splitParagraphs(value) {
  return String(value || '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
}
function articleCard(article) {
  return '<article class="article-card" data-category="digital-growth">' +
    '<div class="article-no">TR / ' + esc(article.number) + '</div>' +
    '<div><h3><a href="/blog/tr/articles/' + esc(article.slug) + '.html">' + esc(article.title) + '</a></h3>' +
    '<p>' + esc(article.description) + '</p></div>' +
    '<a class="read" href="/blog/tr/articles/' + esc(article.slug) + '.html">Rehberi oku</a></article>';
}
function pagination(current, total) {
  let out = '<nav class="pagination" aria-label="Sayfalama">';
  for (let p = 1; p <= total; p++) {
    const href = p === 1 ? '/blog/tr/index.html' : '/blog/tr/page/' + p + '.html';
    out += p === current
      ? '<span class="current" aria-current="page" aria-label="Sayfa ' + p + '">' + p + '</span>'
      : '<a class="page-number" href="' + href + '" aria-label="Sayfa ' + p + '">' + p + '</a>';
  }
  if (current < total) out += '<a class="page-next" href="/blog/tr/page/' + (current + 1) + '.html" rel="next">Sonraki →</a>';
  if (current > 1) out += '<a class="page-next" href="' + (current === 2 ? '/blog/tr/index.html' : '/blog/tr/page/' + (current - 1) + '.html') + '" rel="prev">← Önceki</a>';
  return out + '</nav>';
}

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const articles = data.articles;
assert(Array.isArray(articles) && articles.length === 40, 'Batch must contain exactly 40 articles.');
assert(articles.map(a => a.number).join(',') === Array.from({ length: 40 }, (_, i) => i + 101).join(','), 'Article numbers must be 101–140 in order.');
assert(new Set(articles.map(a => a.slug)).size === 40, 'Batch has duplicate slugs.');
for (const a of articles) {
  assert(a.slug && /^[a-z0-9-]+$/.test(a.slug), 'Invalid slug for article ' + a.number);
  assert(a.title && a.seo_title && a.description && a.intro, 'Missing title/SEO fields for article ' + a.number);
  assert(Array.isArray(a.sections) && a.sections.length >= 4, 'Insufficient sections for article ' + a.number);
  assert(Array.isArray(a.faq) && a.faq.length >= 3 && a.faq.every(q => q.question && q.answer), 'FAQ incomplete for article ' + a.number);
  assert(a.keywords?.length && a.services, 'Keywords/services missing for article ' + a.number);
}

const existingPaths = new Set(fs.readdirSync(ARTICLE_DIR).filter(x => x.endsWith('.html')));
for (const a of articles) {
  const filename = a.slug + '.html';
  assert(!existingPaths.has(filename), 'Refusing to overwrite existing article: ' + filename);
}
const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
const batchByNumber = new Map(articles.map(a => [a.number, a]));
const relatedGroups = [
  [101, 102, 103, 113, 114, 117, 119, 120, 123, 137, 140],
  [104, 105, 118, 124, 126, 130, 133, 134, 135, 138, 139],
  [106, 107, 108, 115, 116, 121, 122, 128, 129, 136],
  [109, 110, 111, 112, 125, 127, 131, 132]
];
function serviceLinks(number) {
  const map = {
    101:['web-design','digital-growth'],102:['web-design','digital-growth'],103:['digital-growth','web-design'],
    104:['digital-growth'],105:['digital-growth','social-content'],106:['social-content'],107:['brand-strategy'],
    108:['brand-strategy'],109:['digital-growth'],110:['digital-growth'],111:['digital-growth','web-design'],
    112:['digital-growth'],113:['web-design'],114:['web-design'],115:['digital-growth'],116:['digital-growth'],
    117:['web-design'],118:['digital-growth'],119:['web-design'],120:['web-design','digital-growth'],121:['video-motion','social-content'],
    122:['digital-growth','social-content'],123:['digital-growth'],124:['digital-growth'],125:['web-design','digital-growth'],
    126:['digital-growth'],127:['web-design','digital-growth'],128:['brand-strategy','social-content'],129:['social-content'],
    130:['digital-growth'],131:['digital-growth'],132:['brand-strategy'],133:['web-design','digital-growth'],134:['digital-growth'],
    135:['digital-growth','web-design'],136:['social-content'],137:['web-design','digital-growth'],138:['digital-growth'],
    139:['digital-growth'],140:['web-design']
  };
  const labels = {
    'brand-strategy':'Marka stratejisi', 'creative-design':'Yaratıcı tasarım',
    'digital-growth':'Dijital büyüme ve performans', 'social-content':'Sosyal medya ve içerik',
    'video-motion':'Video ve hareketli içerik', 'web-design':'Web tasarımı'
  };
  return (map[number] || ['digital-growth']).map(s => '<li><a href="/services/tr/' + s + '.html">' + labels[s] + '</a></li>').join('');
}
function relatedArticleLinks(article) {
  const group = relatedGroups.find(g => g.includes(article.number)) || [];
  return group.filter(n => n !== article.number).slice(0, 3).map(n => {
    const target = batchByNumber.get(n);
    return target ? '<li><a href="/blog/tr/articles/' + esc(target.slug) + '.html">' + esc(target.title) + '</a></li>' : '';
  }).join('');
}
function articleMarkup(a) {
  const sections = a.sections.map(s => '<section><h2>' + esc(s.heading) + '</h2>' +
    s.paragraphs.map(p => '<p>' + esc(p) + '</p>').join('') + '</section>').join('');
  const intro = splitParagraphs(a.intro).map(p => '<p>' + esc(p) + '</p>').join('');
  const faq = a.faq.map(q => '<div><h3>' + esc(q.question) + '</h3><p>' + esc(q.answer) + '</p></div>').join('');
  const services = a.services.split(';').map(x => x.trim()).filter(Boolean).map(x => '<li>' + esc(x) + '</li>').join('');
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: a.title,
        description: a.description,
        keywords: a.keywords.join(', '),
        datePublished: PUBLISHED,
        dateModified: PUBLISHED,
        inLanguage: 'tr',
        mainEntityOfPage: 'https://rocketpendigital.com/blog/tr/articles/' + a.slug + '.html',
        author: { '@type': 'Organization', name: 'RocketPen Digital Studio Yayın Ekibi' },
        publisher: { '@type': 'Organization', name: 'RocketPen Digital Studio' }
      },
      {
        '@type': 'FAQPage',
        mainEntity: a.faq.map(q => ({
          '@type': 'Question', name: q.question,
          acceptedAnswer: { '@type': 'Answer', text: q.answer }
        }))
      }
    ]
  };
  return '<article class="article">' +
    '<div class="crumb"><a href="/blog/tr/index.html">Dijital Blog</a> / SEO ve dijital büyüme rehberi</div>' +
    '<div class="tag">ROCKETPEN DIGITAL REHBERİ · ' + esc(a.number) + '</div>' +
    '<h1>' + esc(a.title) + '</h1>' +
    '<p class="standfirst">' + esc(a.description) + '</p>' +
    '<div class="meta"><span>RocketPen Digital Studio Yayın Ekibi</span><span>Yayın: ' + DISPLAY_DATE + '</span><span>Türkçe rehber</span></div>' +
    '<section class="article-intro">' + intro + '</section>' + sections +
    '<section class="faq"><h2>Sık sorulan sorular</h2>' + faq + '</section>' +
    '<section class="related-topics"><h2>İlgili RocketPen Hizmetleri</h2><p>Bu konuda işletmenizin ihtiyacına göre değerlendirilebilecek hizmet alanları:</p><ul>' + services + '</ul><ul>' + serviceLinks(a.number) + '</ul></section>' +
    '<section class="related-topics"><h2>İlgili ve Önerilen Konular</h2><ul>' + relatedArticleLinks(a) + '<li><a href="/blog/tr/index.html">Türkçe dijital blog arşivinin tamamı</a></li></ul></section>' +
    '<div class="cta"><h2>Bu rehberi projenize uyarlamak ister misiniz?</h2><p>İş hedefinizi ve mevcut durumu paylaşın; uygun dijital adımları birlikte değerlendirelim.</p><a href="/languages/tr.html#contact">İletişime geçin</a></div>' +
    '<script type="application/ld+json">' + jsonForScript(schema) + '</script>' +
    '</article>';
}

for (const a of articles) {
  let html = template;
  const title = esc(a.seo_title);
  const description = esc(a.description);
  const canonical = 'https://rocketpendigital.com/blog/tr/articles/' + a.slug + '.html';
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + title + '</title>');
  html = html.replace(/<meta name="description" content="[^"]*"\s*\/?\s*>/i, '<meta name="description" content="' + description + '">');
  if (/<meta name="keywords"/i.test(html)) {
    html = html.replace(/<meta name="keywords" content="[^"]*"\s*\/?\s*>/i, '<meta name="keywords" content="' + esc(a.keywords.join(', ')) + '">');
  } else {
    html = html.replace(/(<meta name="description" content="[^"]*"\s*\/?\s*>)/i, '$1<meta name="keywords" content="' + esc(a.keywords.join(', ')) + '">');
  }
  html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/?\s*>/i, '<meta property="og:title" content="' + title + '">');
  html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/?\s*>/i, '<meta property="og:description" content="' + description + '">');
  html = html.replace(/<meta property="article:published_time" content="[^"]*"\s*\/?\s*>/i, '<meta property="article:published_time" content="' + PUBLISHED + '">');
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?\s*>/i, '<link rel="canonical" href="' + canonical + '">');
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, '');
  assert(/<article class="article">[\s\S]*?<\/article>/i.test(html), 'Article shell not found in template.');
  html = html.replace(/<article class="article">[\s\S]*?<\/article>/i, articleMarkup(a));
  assert(html.includes('<h1>' + esc(a.title) + '</h1>'), 'H1 missing for article ' + a.number);
  assert(html.includes('rel="canonical" href="' + canonical + '"'), 'Canonical missing for article ' + a.number);
  assert(html.includes('FAQPage'), 'FAQ schema missing for article ' + a.number);
  fs.writeFileSync(path.join(ARTICLE_DIR, a.slug + '.html'), html, 'utf8');
}

// Preserve the existing 400-card order and append these new articles to the end.
const indexPath = path.join(LISTING_DIR, 'index.html');
const indexTemplate = fs.readFileSync(indexPath, 'utf8');
const oldPageNumbers = fs.readdirSync(PAGE_DIR).filter(n => /^\d+\.html$/.test(n)).map(n => Number(n.replace('.html', ''))).sort((a, b) => a - b);
assert(oldPageNumbers.length > 0 && oldPageNumbers[0] === 2, 'Existing archive pagination is incomplete.');
const oldMaxPage = Math.max(...oldPageNumbers);
const page2Path = path.join(PAGE_DIR, '2.html');
const pageTemplate = fs.readFileSync(page2Path, 'utf8');
const existingCards = [];
for (const p of [1, ...oldPageNumbers]) {
  const file = p === 1 ? indexPath : path.join(PAGE_DIR, p + '.html');
  const text = p === 1 ? indexTemplate : fs.readFileSync(file, 'utf8');
  const region = text.match(/<!-- POSTS_START -->([\s\S]*?)<!-- POSTS_END -->/);
  assert(region, 'POSTS markers not found in ' + file);
  const cards = [...region[1].matchAll(/<article class="article-card"[\s\S]*?<\/article>/g)].map(m => m[0]);
  existingCards.push(...cards);
}
assert(existingCards.length === 400, 'Expected 400 existing Turkish article cards; found ' + existingCards.length + '. Refusing to rewrite archive.');
const newCards = articles.map(articleCard);
const allCards = [...existingCards, ...newCards];
const totalPages = Math.ceil(allCards.length / PER_PAGE);
assert(totalPages === 30 && allCards.length === 440, 'Archive count/pagination mismatch.');

function renderListing(templateText, p) {
  let page = templateText;
  const cards = allCards.slice((p - 1) * PER_PAGE, p * PER_PAGE).join('\n');
  page = page.replace(/<!-- POSTS_START -->[\s\S]*?<!-- POSTS_END -->/, '<!-- POSTS_START -->\n' + cards + '\n<!-- POSTS_END -->');
  page = page.replace(/<nav class="pagination" aria-label="Sayfalama">[\s\S]*?<\/nav>/, pagination(p, totalPages));
  if (p === 1) {
    page = page.replace(/<title>[\s\S]*?<\/title>/i, '<title>Dijital Blog | RocketPen Digital Studio</title>');
    page = page.replace(/<link rel="canonical" href="[^"]*"\s*\/?\s*>/i, '<link rel="canonical" href="https://rocketpendigital.com/blog/tr/index.html">');
  } else {
    page = page.replace(/<title>[\s\S]*?<\/title>/i, '<title>Dijital Blog — Sayfa ' + p + ' | RocketPen Digital Studio</title>');
    page = page.replace(/<link rel="canonical" href="[^"]*"\s*\/?\s*>/i, '<link rel="canonical" href="https://rocketpendigital.com/blog/tr/page/' + p + '.html">');
    page = page.replace(/<meta name="description" content="[^"]*"\s*\/?\s*>/i, '<meta name="description" content="RocketPen Digital Türkçe dijital pazarlama ve SEO rehberleri — sayfa ' + p + '.">');
    page = page.replace(/<meta property="og:title" content="[^"]*"\s*\/?\s*>/i, '<meta property="og:title" content="Dijital Blog — Sayfa ' + p + ' | RocketPen Digital Studio">');
  }
  const count = [...(page.match(/<!-- POSTS_START -->([\s\S]*?)<!-- POSTS_END -->/) || ['', ''])[1].matchAll(/<article class="article-card"[\s\S]*?<\/article>/g)].length;
  assert(count === Math.min(PER_PAGE, allCards.length - (p - 1) * PER_PAGE), 'Listing page ' + p + ' has incorrect card count ' + count);
  assert(page.includes('aria-label="Sayfa ' + p + '"'), 'Current pagination page marker missing for ' + p);
  return page;
}
fs.writeFileSync(indexPath, renderListing(indexTemplate, 1), 'utf8');
fs.mkdirSync(PAGE_DIR, { recursive: true });
for (let p = 2; p <= totalPages; p++) {
  fs.writeFileSync(path.join(PAGE_DIR, p + '.html'), renderListing(pageTemplate, p), 'utf8');
}
for (const p of oldPageNumbers) {
  if (p > totalPages) fs.rmSync(path.join(PAGE_DIR, p + '.html'), { force: true });
}

// Add all new articles and page 28–30 to the sitemap without duplicating existing URLs.
const sitemapPath = path.join(ROOT, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
assert(sitemap.includes('</urlset>'), 'Invalid sitemap.xml: missing </urlset>.');
const requiredUrls = [
  'https://rocketpendigital.com/blog/tr/index.html',
  ...Array.from({ length: totalPages - 1 }, (_, i) => 'https://rocketpendigital.com/blog/tr/page/' + (i + 2) + '.html'),
  ...articles.map(a => 'https://rocketpendigital.com/blog/tr/articles/' + a.slug + '.html')
];
const additions = [];
const urlBlocks = [...sitemap.matchAll(/<url>[\s\S]*?<\/url>/g)].map(m => m[0]);
const existingLocs = new Set(urlBlocks.map(block => (block.match(/<loc>([\s\S]*?)<\/loc>/) || [])[1]).filter(Boolean));
const updateLocs = new Set(requiredUrls);
sitemap = sitemap.replace(/<url>[\s\S]*?<\/url>/g, block => {
  const loc = (block.match(/<loc>([\s\S]*?)<\/loc>/) || [])[1];
  if (!loc || !updateLocs.has(loc)) return block;
  if (/<lastmod>/.test(block)) return block.replace(/<lastmod>[\s\S]*?<\/lastmod>/, '<lastmod>' + PUBLISHED + '</lastmod>');
  return block.replace('</url>', '<lastmod>' + PUBLISHED + '</lastmod></url>');
});
for (const url of requiredUrls) {
  if (!existingLocs.has(url)) additions.push('  <url><loc>' + url + '</loc><lastmod>' + PUBLISHED + '</lastmod></url>');
}
if (additions.length) sitemap = sitemap.replace(/<\/urlset>\s*$/, additions.join('\n') + '\n</urlset>\n');
fs.writeFileSync(sitemapPath, sitemap, 'utf8');

// Remove the one-time source package from the repository after successful import.
fs.rmSync(path.join(ROOT, 'data/rocketpen-tr-101-140'), { recursive: true, force: true });

// Final local QA: all 440 cards, 30 pages, 40 unique URLs and sitemap coverage.
const finalArticleFiles = fs.readdirSync(ARTICLE_DIR).filter(x => x.endsWith('.html'));
assert(finalArticleFiles.length === 440, 'Expected 440 Turkish HTML article pages; found ' + finalArticleFiles.length);
const sitemapAfter = fs.readFileSync(sitemapPath, 'utf8');
for (const url of requiredUrls) assert(sitemapAfter.includes('<loc>' + url + '</loc>'), 'Sitemap missing ' + url);
const dupeLocs = [...sitemapAfter.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map(m => m[1]);
assert(new Set(dupeLocs).size === dupeLocs.length, 'Duplicate URLs detected in sitemap.xml');
console.log(JSON.stringify({
  importedArticles: articles.length,
  previousArticles: existingCards.length,
  totalArticles: finalArticleFiles.length,
  listingPages: totalPages,
  firstNewArticle: '/blog/tr/articles/' + articles[0].slug + '.html',
  lastNewArticle: '/blog/tr/articles/' + articles[articles.length - 1].slug + '.html',
  sitemapUrlsAdded: additions.length,
  pagesAppended: [28, 29, 30],
  archiveOrderPreserved: true
}, null, 2));
