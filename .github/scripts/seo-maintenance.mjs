import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SITE = 'https://rocketpendigital.com';
const LANGS = ['tr', 'en', 'ar'];
const changed = [];

async function walk(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch { return []; }
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function canonicalize(html, url) {
  const canonical = '<link rel="canonical" href="' + url + '">';
  const oldHost = 'https://rocketpendigital.qasimm2012.workers.dev';
  let out = html.replaceAll(oldHost, SITE);
  const canonicalRe = /<link\b[^>]*\brel=(["'])canonical\1[^>]*>/i;
  if (canonicalRe.test(out)) {
    out = out.replace(canonicalRe, canonical);
  } else if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, canonical + '\n</head>');
  } else {
    return { html: out, ok: false };
  }
  const ogUrl = /<meta\b[^>]*\bproperty=(["'])og:url\1[^>]*>/i;
  if (ogUrl.test(out)) {
    out = out.replace(ogUrl, '<meta property="og:url" content="' + url + '">');
  }
  return { html: out, ok: true };
}

for (const lang of LANGS) {
  const files = await walk(path.join(ROOT, 'blog', lang, 'articles'));
  for (const file of files) {
    const rel = '/' + path.relative(ROOT, file).split(path.sep).join('/');
    const original = await fs.readFile(file, 'utf8');
    const result = canonicalize(original, SITE + rel);
    if (!result.ok) {
      console.error('Could not add canonical; missing head close:', rel);
      process.exitCode = 1;
      continue;
    }
    if (result.html !== original) {
      await fs.writeFile(file, result.html);
      changed.push(rel);
    }
  }
  const index = path.join(ROOT, 'blog', lang, 'index.html');
  try {
    const original = await fs.readFile(index, 'utf8');
    const result = canonicalize(original, SITE + '/' + path.relative(ROOT, index).split(path.sep).join('/'));
    if (result.html !== original) { await fs.writeFile(index, result.html); changed.push('/' + path.relative(ROOT, index).split(path.sep).join('/')); }
  } catch {}
  const pages = await walk(path.join(ROOT, 'blog', lang, 'page'));
  for (const file of pages) {
    const rel = '/' + path.relative(ROOT, file).split(path.sep).join('/');
    const original = await fs.readFile(file, 'utf8');
    const result = canonicalize(original, SITE + rel);
    if (result.html !== original) { await fs.writeFile(file, result.html); changed.push(rel); }
  }
}

const sitemapPath = path.join(ROOT, 'sitemap.xml');
try {
  const original = await fs.readFile(sitemapPath, 'utf8');
  const updated = original.replaceAll('https://rocketpendigital.qasimm2012.workers.dev', SITE);
  if (updated !== original) { await fs.writeFile(sitemapPath, updated); changed.push('/sitemap.xml'); }
} catch {}

const robotsPath = path.join(ROOT, 'robots.txt');
try {
  const original = await fs.readFile(robotsPath, 'utf8');
  const lines = original.split(/\r?\n/).filter(line => !/^\s*Sitemap:/i.test(line));
  lines.push('Sitemap: ' + SITE + '/sitemap.xml');
  const updated = lines.join('\n').replace(/\n+$/, '') + '\n';
  if (updated !== original) { await fs.writeFile(robotsPath, updated); changed.push('/robots.txt'); }
} catch {}

console.log('SEO canonical maintenance complete.');
console.log('Updated files: ' + changed.length);
for (const file of changed) console.log(file);
