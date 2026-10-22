import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
const archive='RocketPenDigital_300_Turkish_SEO_Articles.zip';
if(!fs.existsSync(archive)) throw new Error('Turkish ZIP not found.');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rocketpen-tr-'));
execFileSync('unzip',['-q',archive,'-d',temp]);
const inputs=fs.readdirSync(temp).filter(n=>/^RocketPen_TR_Makale_\d+\.md$/i.test(n)).sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0]));
if(inputs.length!==300) throw new Error('Expected 300 Markdown articles; found '+inputs.length);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const plain=s=>String(s||'').replace(/\*\*/g,'').replace(/\*/g,'').replace(new RegExp(String.fromCharCode(96),'g'),'').replace(/^\s*[-+]\s+/,'').replace(/^\s*\d+[.)]\s+/,'').replace(/\s+/g,' ').trim();
const slug=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100)||'turkce-dijital-rehber';
function convert(md){
 const out=[];let para=[],list=null;
 const inline=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
 const flush=()=>{if(para.length){out.push('<p>'+inline(para.join(' '))+'</p>');para=[];}};
 const close=()=>{if(list){out.push('</'+list+'>');list=null;}};
 for(const raw of md.replace(/\r/g,'').split('\n')){const line=raw.trim();if(!line){flush();close();continue;}const h=line.match(/^(#{1,4})\s+(.+)$/);if(h){flush();close();const n=Math.min(4,Math.max(2,h[1].length));out.push('<h'+n+'>'+inline(h[2])+'</h'+n+'>');continue;}const li=line.match(/^[-*+]\s+(.+)$/)||line.match(/^\d+[.)]\s+(.+)$/);if(li){flush();const wanted=/^\d/.test(line)?'ol':'ul';if(list!==wanted){close();out.push('<'+wanted+'>');list=wanted;}out.push('<li>'+inline(li[1])+'</li>');continue;}if(/^---+$/.test(line)){flush();close();continue;}close();para.push(line);}
 flush();close();return out.join('\n');
}
const outDir='blog/tr/articles';fs.mkdirSync(outDir,{recursive:true});const existing=new Set(fs.readdirSync(outDir).filter(n=>n.endsWith('.html')));
const template=fs.readFileSync(path.join(outDir,'teknik-seo-kontrol-listesi.html'),'utf8');const imported=[];
for(const file of inputs){
 const raw=fs.readFileSync(path.join(temp,file),'utf8').replace(/^\uFEFF/,'');const m=raw.match(/^#\s+(.+)$/m);if(!m)throw new Error('Missing title in '+file);
 const title=plain(m[1]),body=raw.replace(/^#\s+.+\n?/m,'').trim(),first=body.split('\n').find(x=>x.trim()&&!x.trim().startsWith('#'))||title,description=plain(first).slice(0,155);
 const base=slug(title);let name=base+'.html',k=2;while(existing.has(name))name=base+'-'+(k++)+'.html';existing.add(name);const url='/blog/tr/articles/'+name;
 let html=template;
 html=html.replace(/<title>[\s\S]*?<\/title>/i,'<title>'+esc(title)+' | RocketPen Digital Studio</title>');
 html=html.replace(/<meta name="description" content="[^"]*"/i,'<meta name="description" content="'+esc(description)+'"');
 html=html.replace(/<meta property="og:title" content="[^"]*"/i,'<meta property="og:title" content="'+esc(title)+'"');
 html=html.replace(/<meta property="og:description" content="[^"]*"/i,'<meta property="og:description" content="'+esc(description)+'"');
 html=html.replace(/<link rel="canonical" href="[^"]*"/i,'<link rel="canonical" href="https://rocketpendigital.com'+url+'"');
 html=html.replace(/"headline":"[^"]*"/,'"headline":'+JSON.stringify(title));html=html.replace(/"description":"[^"]*"/,'"description":'+JSON.stringify(description));
 html=html.replace(/<div class="crumb">[\s\S]*?<\/div>/,'<div class="crumb"><a href="/blog/tr/index.html">Dijital Blog</a> / Uygulama rehberi</div>');
 html=html.replace(/<div class="tag">[\s\S]*?<\/div>/,'<div class="tag">ROCKETPEN DIGITAL REHBERİ</div>').replace(/<h1>[\s\S]*?<\/h1>/,'<h1>'+esc(title)+'</h1>').replace(/<p class="standfirst">[\s\S]*?<\/p>/,'<p class="standfirst">'+esc(description)+'</p>');
 html=html.replace(/<div class="meta">[\s\S]*?<\/div>/,'<div class="meta"><span>RocketPen Digital Studio Yayın Ekibi</span><span>Uygulama rehberi</span></div>');
 html=html.replace(/(<div class="meta">[\s\S]*?<\/div>)[\s\S]*?(?=<section class="faq">)/,'$1'+convert(body));
 const related='<section class="related-topics"><h2>Önerilen konular</h2><ul><li><a href="/blog/tr/index.html">Dijital pazarlama ve SEO rehberleri</a></li><li><a href="/blog/tr/index.html">Web sitesi ve içerik stratejileri</a></li><li><a href="/blog/tr/index.html">Dijital büyüme için uygulama önerileri</a></li></ul></section>';
 html=html.replace(/<section class="cta">/,related+'<section class="cta">');fs.writeFileSync(path.join(outDir,name),html);imported.push({title,description,url});
}
const all=[];for(const name of fs.readdirSync(outDir).filter(n=>n.endsWith('.html'))){const h=fs.readFileSync(path.join(outDir,name),'utf8');const title=(h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]?.replace(/<[^>]+>/g,'').trim()||name.replace(/\.html$/,'').replace(/-/g,' ');const description=(h.match(/<meta name="description" content="([^"]*)"/i)||[])[1]||title;all.push({title,description,url:'/blog/tr/articles/'+name});}
all.sort((a,b)=>a.title.localeCompare(b.title,'tr'));const perPage=15,totalPages=Math.ceil(all.length/perPage);
const card=a=>'<article class="article-card" data-category="digital-growth"><div class="article-no">TR / REHBER</div><div><h3><a href="'+a.url+'">'+esc(a.title)+'</a></h3><p>'+esc(a.description)+'</p></div><a class="read" href="'+a.url+'">Rehberi oku</a></article>';
const pagination=p=>{let s='<nav class="pagination" aria-label="Sayfalama">';for(let i=1;i<=totalPages;i++){const href=i===1?'/blog/tr/index.html':'/blog/tr/page/'+i+'.html';s+=i===p?'<span class="current" aria-current="page" aria-label="Sayfa '+i+'">'+i+'</span>':'<a class="page-number" href="'+href+'" aria-label="Sayfa '+i+'">'+i+'</a>';}if(p<totalPages)s+='<a class="page-next" href="/blog/tr/page/'+(p+1)+'.html" rel="next">Sonraki →</a>';if(p>1)s+='<a class="page-next" href="'+(p===2?'/blog/tr/index.html':'/blog/tr/page/'+(p-1)+'.html')+'" rel="prev">← Önceki</a>';return s+'</nav>';};
const indexPath='blog/tr/index.html';let index=fs.readFileSync(indexPath,'utf8');index=index.replace(/<!-- POSTS_START -->[\s\S]*?<!-- POSTS_END -->/,'<!-- POSTS_START -->\n'+all.slice(0,perPage).map(card).join('\n')+'\n<!-- POSTS_END -->');index=index.replace(/<nav class="pagination" aria-label="Sayfalama">[\s\S]*?<\/nav>/,pagination(1));fs.writeFileSync(indexPath,index);
const templatePath=fs.existsSync('blog/tr/page/2.html')?'blog/tr/page/2.html':'blog/tr/index.html';const listingTemplate=fs.readFileSync(templatePath,'utf8');
for(let p=2;p<=totalPages;p++){let page=listingTemplate;page=page.replace(/<!-- POSTS_START -->[\s\S]*?<!-- POSTS_END -->/,'<!-- POSTS_START -->\n'+all.slice((p-1)*perPage,p*perPage).map(card).join('\n')+'\n<!-- POSTS_END -->');page=page.replace(/<nav class="pagination" aria-label="Sayfalama">[\s\S]*?<\/nav>/,pagination(p));page=page.replace(/<title>[\s\S]*?<\/title>/i,'<title>Dijital Blog — Sayfa '+p+' | RocketPen Digital Studio</title>');page=page.replace(/<link rel="canonical" href="[^"]*"/i,'<link rel="canonical" href="https://rocketpendigital.com/blog/tr/page/'+p+'.html"');fs.mkdirSync('blog/tr/page',{recursive:true});fs.writeFileSync('blog/tr/page/'+p+'.html',page);}
let sitemap=fs.readFileSync('sitemap.xml','utf8');const locs=new Set(Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g),m=>m[1]));const date=new Date().toISOString().slice(0,10),additions=[];
for(const a of imported){const loc='https://rocketpendigital.com'+a.url;if(!locs.has(loc))additions.push('<url><loc>'+loc+'</loc><lastmod>'+date+'</lastmod></url>');}
for(let p=2;p<=totalPages;p++){const loc='https://rocketpendigital.com/blog/tr/page/'+p+'.html';if(!locs.has(loc))additions.push('<url><loc>'+loc+'</loc><lastmod>'+date+'</lastmod></url>');}
sitemap=sitemap.replace(/<\/urlset>\s*$/,'  '+additions.join('\n  ')+'\n</urlset>\n');fs.writeFileSync('sitemap.xml',sitemap);fs.rmSync(archive,{force:true});fs.rmSync(temp,{recursive:true,force:true});
console.log(JSON.stringify({imported:imported.length,totalTurkishArticles:all.length,totalListingPages:totalPages,sitemapUrlsAdded:additions.length},null,2));
