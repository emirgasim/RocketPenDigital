import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SITE = 'https://rocketpendigital.com';
const issues = [];
const pages = [];
const titles = new Map();
const descriptions = new Map();
const canonicalUrls = new Map();

async function walk(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(full));
    else if (e.isFile() && e.name.endsWith('.html')) out.push(full);
  }
  return out;
}
function match(html, re) { return (html.match(re) || [])[1] || ''; }
function clean(s) { return s.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
function recordDuplicate(map, value, file, type) {
  if (!value) return;
  const key = value.toLowerCase();
  if (map.has(key)) issues.push({severity:'WARN',file,issue:'Duplicate '+type+' also found in '+map.get(key),detail:value});
  else map.set(key,file);
}
const htmlFiles = await walk(ROOT);
for (const file of htmlFiles) {
  const rel = '/' + path.relative(ROOT,file).split(path.sep).join('/');
  const html = await fs.readFile(file,'utf8');
  if (!rel.startsWith('/blog/')) continue;
  const title = clean(match(html,/<title[^>]*>([\s\S]*?)<\/title>/i));
  const description = clean(match(html,/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) || match(html,/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i));
  const canonical = match(html,/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i) || match(html,/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>clean(m[1])).filter(Boolean);
  const article = rel.includes('/articles/');
  if (!title) issues.push({severity:'ERROR',file:rel,issue:'Missing title'});
  else { if (title.length < 20 || title.length > 70) issues.push({severity:'WARN',file:rel,issue:'Title length outside 20–70 characters',detail:String(title.length)}); recordDuplicate(titles,title,rel,'title'); }
  if (!description) issues.push({severity:'ERROR',file:rel,issue:'Missing meta description'});
  else { if (description.length < 70 || description.length > 170) issues.push({severity:'WARN',file:rel,issue:'Description length outside 70–170 characters',detail:String(description.length)}); recordDuplicate(descriptions,description,rel,'description'); }
  if (!canonical) issues.push({severity:'ERROR',file:rel,issue:'Missing canonical'});
  else { if (!canonical.startsWith(SITE+'/')) issues.push({severity:'ERROR',file:rel,issue:'Canonical does not use production origin',detail:canonical}); if(canonicalUrls.has(canonical)) issues.push({severity:'ERROR',file:rel,issue:'Duplicate canonical URL also used by '+canonicalUrls.get(canonical),detail:canonical}); else canonicalUrls.set(canonical,rel); }
  if (article && h1s.length !== 1) issues.push({severity:'WARN',file:rel,issue:'Article should have exactly one H1',detail:String(h1s.length)});
  if (article && !/application\/ld\+json/i.test(html)) issues.push({severity:'WARN',file:rel,issue:'No JSON-LD structured data detected'});
  pages.push({file:rel,title,description,canonical,h1Count:h1s.length,article});
}
let sitemap = '';
try { sitemap = await fs.readFile(path.join(ROOT,'sitemap.xml'),'utf8'); } catch {}
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].trim());
const sitemapSet = new Set(sitemapUrls);
for (const p of pages.filter(p=>p.article)) {
  const url = SITE+p.file;
  if (!sitemapSet.has(url)) issues.push({severity:'WARN',file:p.file,issue:'Article file absent from sitemap'});
}
for (const url of sitemapUrls) {
  if (!url.startsWith(SITE+'/')) issues.push({severity:'ERROR',file:'sitemap.xml',issue:'Sitemap URL uses unexpected origin',detail:url});
}
const counts = {htmlBlogPages:pages.length,articleFiles:pages.filter(p=>p.article).length,sitemapUrls:sitemapUrls.length,errors:issues.filter(i=>i.severity==='ERROR').length,warnings:issues.filter(i=>i.severity==='WARN').length};
const lines = ['# Automated SEO Technical Audit','', 'Generated: '+new Date().toISOString(),'','This report checks HTML metadata and sitemap consistency. It does not measure search volume, ranking, indexing, backlinks, or conversion.','', '## Summary','', ...Object.entries(counts).map(([k,v])=>'- '+k+': **'+v+'**'),'','## Findings',''];
if (!issues.length) lines.push('No configured checks failed.');
else for (const i of issues) lines.push('- **'+i.severity+'** `'+i.file+'` — '+i.issue+(i.detail?' ('+i.detail+')':''));
lines.push('','## Important interpretation','','Metadata length checks are heuristics, not Google ranking rules. Review duplicate-title/description findings for actual intent before editing. Never remove, merge, noindex, or redirect pages solely based on this report.');
await fs.mkdir(path.join(ROOT,'reports'),{recursive:true});
await fs.writeFile(path.join(ROOT,'reports/seo-technical-audit.md'),lines.join('\n')+'\n');
await fs.writeFile(path.join(ROOT,'reports/seo-technical-audit.json'),JSON.stringify({generatedAt:new Date().toISOString(),counts,issues,pages},null,2)+'\n');
console.log(JSON.stringify(counts,null,2));
if (counts.errors) process.exitCode = 1;
