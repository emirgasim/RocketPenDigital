import fs from 'node:fs';
import path from 'node:path';

const root = 'blog/en/articles';
const indexPath = 'blog/en/index.html';
const pageDir = 'blog/en/page';
const pageSize = 24;
const files = fs.readdirSync(root).filter(name => name.endsWith('.html')).sort();
const esc = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const strip = value => String(value || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/\s+/g,' ').trim();
function attr(html, name) {
  const tags = html.match(/<meta\\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const key = (tag.match(/\\b(?:name|property)=["']([^"']+)["']/i) || [])[1];
    if (key === name) return (tag.match(/\\bcontent=["']([^"']*)["']/i) || [])[1] || '';
  }
  return '';
}
function category(slug) {
  if (/(brand|positioning|messag|identity|naming|voice)/.test(slug)) return 'brand strategy';
  if (/(seo|website|web-|websites|canonical|accessib|landing-page|conversion-rate|core-web-vitals|ecommerce)/.test(slug)) return 'web seo';
  if (/(social|content|video|email|community|webinar|editorial|copywriting|storytelling)/.test(slug)) return 'social content';
  if (/(analytics|marketing|agency|operations|crm|lead|sales|account-based|customer|retention|growth|pricing|campaign|advertising|paid-media)/.test(slug)) return 'digital growth';
  return 'digital growth';
}
function extractArticle(file) {
  const slug = file.replace(/\.html$/,'');
  const html = fs.readFileSync(path.join(root,file),'utf8');
  const h1 = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||[])[1];
  const titleTag = (html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1];
  const title = strip(h1 || titleTag || slug.replace(/-/g,' ')).replace(/\s*\|\s*RocketPen Digital Studio\s*$/i,'');
  const main = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)||[])[1] || html;
  const firstSection = (main.match(/<section\b[^>]*>([\s\S]*?)<\/section>/i)||[])[1] || main;
  const paras = [...firstSection.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>strip(m[1])).filter(Boolean);
  let description = paras.find(p => p.length > 65 && !/^a practical, evidence-led guide to/i.test(p)) || paras[0] || strip(attr(html,'description'));
  if (!description || description.length < 35) description = 'A practical guide to '+title.toLowerCase()+', with useful steps, quality checks and ways to evaluate progress.';
  if (description.length > 185) description = description.slice(0,182).replace(/\s+\S*$/,'')+'…';
  const cat = category(slug);
  return {slug,title,description,cat};
}
const articles = files.map(extractArticle);
const seen = new Set();
const unique = articles.filter(a => !seen.has(a.slug) && seen.add(a.slug));
const indexTemplate = fs.readFileSync(indexPath,'utf8');
const oldOrder = [...indexTemplate.matchAll(/class="article-card" id="([^"]+)"/g)].map(m=>m[1]);
const bySlug = new Map(unique.map(a=>[a.slug,a]));
const ordered = [...oldOrder.map(slug=>bySlug.get(slug)).filter(Boolean)];
const already = new Set(ordered.map(a=>a.slug));
ordered.push(...unique.filter(a=>!already.has(a.slug)));
const totalPages = Math.ceil(ordered.length/pageSize);
function card(a,i) {
  const url = '/blog/en/articles/'+a.slug+'.html';
  const label = a.cat.toUpperCase().replace(/\bSEO\b/g,'SEO');
  return '<article class="article-card" id="'+esc(a.slug)+'" data-category="'+esc(a.cat)+'"><div class="article-no">'+String(i+1).padStart(3,'0')+' / '+esc(label)+'</div><div><h3><a href="'+url+'">'+esc(a.title)+'</a></h3><p>'+esc(a.description)+'</p></div><a class="read" href="'+url+'">Read the guide</a></article>';
}
function pagination(page) {
  let html = '<nav class="pagination" aria-label="Blog pagination">';
  if (page > 1) html += '<a href="'+(page===2?'/blog/en/index.html':'/blog/en/page/'+(page-1)+'.html')+'" aria-label="Previous page">← Previous</a>';
  for (let n=1;n<=totalPages;n++) {
    const href = n===1?'/blog/en/index.html':'/blog/en/page/'+n+'.html';
    html += n===page?'<span class="current" aria-current="page">'+n+'</span>':'<a href="'+href+'" aria-label="Page '+n+'">'+n+'</a>';
  }
  if (page < totalPages) html += '<a href="/blog/en/page/'+(page+1)+'.html" aria-label="Next page">Next →</a>';
  return html+'</nav>';
}
function replaceBlock(html,start,end,body) {
  const a=html.indexOf(start), b=html.indexOf(end);
  if(a<0||b<a) throw new Error('Missing markers '+start+' / '+end);
  return html.slice(0,a+start.length)+'\n'+body+'\n'+html.slice(b);
}
const firstPageCards = ordered.slice(0,pageSize).map(card).join('\n');
let first = replaceBlock(indexTemplate,'<!-- POSTS_START -->','<!-- POSTS_END -->',firstPageCards);
first = replaceBlock(first,'<!-- PAGINATION_START -->','<!-- PAGINATION_END -->',pagination(1));
fs.writeFileSync(indexPath,first);
const pageTemplatePath = path.join(pageDir,'2.html');
if (!fs.existsSync(pageTemplatePath)) throw new Error('Missing pagination template: '+pageTemplatePath);
const pageTemplate = fs.readFileSync(pageTemplatePath,'utf8');
for(let page=2;page<=totalPages;page++) {
  const filePath = path.join(pageDir,page+'.html');
  let template = fs.existsSync(filePath)?fs.readFileSync(filePath,'utf8'):pageTemplate;
  template = template.replace(/<title>[\s\S]*?<\/title>/i,'<title>The Digital Blog — Page '+page+' | RocketPen Digital Studio</title>');
  template = template.replace(/<meta name="description" content="[^"]*">/i,'<meta name="description" content="Browse practical digital marketing, SEO, website and brand strategy guides — page '+page+' of '+totalPages+'.">');
  const start=(page-1)*pageSize;
  const cards=ordered.slice(start,start+pageSize).map(card).join('\n');
  template=replaceBlock(template,'<!-- POSTS_START -->','<!-- POSTS_END -->',cards);
  template=replaceBlock(template,'<!-- PAGINATION_START -->','<!-- PAGINATION_END -->',pagination(page));
  fs.writeFileSync(filePath,template);
}
for(let page=totalPages+1;page<=100;page++) {
  const p=path.join(pageDir,page+'.html');
  if(fs.existsSync(p)) fs.unlinkSync(p);
}
fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/english-blog-listing-sync.txt',ordered.map((a,i)=>String(i+1).padStart(3,'0')+' '+a.slug+' | '+a.title).join('\n')+'\n');
if (ordered.length !== files.length) throw new Error('Listing mismatch: '+ordered.length+' listed vs '+files.length+' article files');
console.log('Listed '+ordered.length+' unique English articles across '+totalPages+' pages (24 per page maximum).');
