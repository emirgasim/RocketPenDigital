import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const API_KEY = process.env.OPENAI_API_KEY;
const SITE_URL = (process.env.SITE_URL || '').trim().replace(/\/+$/, '');
const MODEL = process.env.OPENAI_MODEL || 'gpt-6-astra';
const TODAY = new Date().toISOString().slice(0, 10);
const DAY = Math.floor(Date.now() / 86400000);
const LANGS = ['en', 'tr', 'ar'];
const CATS = ['brand-strategy', 'web-seo', 'creative-video', 'social-content', 'digital-growth', 'industry-guides'];
const CAT = {
 en: {'brand-strategy':'Brand strategy','web-seo':'Websites & SEO','creative-video':'Creative & video','social-content':'Social media & content','digital-growth':'Digital growth','industry-guides':'Industry guides'},
 tr: {'brand-strategy':'Marka stratejisi','web-seo':'Web siteleri ve SEO','creative-video':'Yaratıcı içerik ve video','social-content':'Sosyal medya ve içerik','digital-growth':'Dijital büyüme','industry-guides':'Sektör rehberleri'},
 ar: {'brand-strategy':'استراتيجية العلامة','web-seo':'المواقع وSEO','creative-video':'الإبداع والفيديو','social-content':'التواصل والمحتوى','digital-growth':'النمو الرقمي','industry-guides':'أدلة القطاعات'}
};
const L = {
 en:{name:'English',direction:'ltr',region:'United States, United Kingdom and international English-speaking markets',home:'/index.html',blog:'/blog/en/index.html',read:'min read',homeLabel:'Home',blogLabel:'Digital Blog',contact:'Discuss your project',faq:'Frequently asked questions',sources:'Sources and further reading',cta:'Tell us what you are building and we will help define the right next step.'},
 tr:{name:'Türkçe',direction:'ltr',region:'Türkiye; use natural Turkish terminology and examples relevant to local service businesses',home:'/languages/tr.html',blog:'/blog/tr/index.html',read:'dk okuma',homeLabel:'Ana sayfa',blogLabel:'Dijital Blog',contact:'Projenizi konuşalım',faq:'Sık sorulan sorular',sources:'Kaynaklar ve ileri okuma',cta:'Ne geliştirmek istediğinizi anlatın; doğru sonraki adımı birlikte netleştirelim.'},
 ar:{name:'العربية',direction:'rtl',region:'United Arab Emirates and Qatar; use clear Modern Standard Arabic and business-relevant Gulf context without assuming the two markets are identical',home:'/languages/ar.html',blog:'/blog/ar/index.html',read:'دقيقة قراءة',homeLabel:'الرئيسية',blogLabel:'المدونة الرقمية',contact:'ناقش مشروعك',faq:'الأسئلة الشائعة',sources:'مصادر إضافية',cta:'أخبرنا بما تخطط لبنائه، وسنساعدك في تحديد الخطوة التالية المناسبة.'}
};
const TOPICS = {
 en:[
 ['brand-positioning','Brand positioning for growing service businesses','brand-strategy'],
 ['brand-message','Writing a brand message customers understand quickly','brand-strategy'],
 ['visual-identity','Creating a flexible visual identity system','brand-strategy'],
 ['brand-consistency','Keeping brand consistency across digital touchpoints','brand-strategy'],
 ['rebrand-planning','Planning a rebrand without losing customer trust','brand-strategy'],
 ['website-brief','Preparing a useful brief for a website design project','web-seo'],
 ['landing-page','Designing landing pages around a clear customer decision','web-seo'],
 ['technical-seo','A technical SEO checklist for small and midsize businesses','web-seo'],
 ['local-seo','Improving local search visibility for service businesses','web-seo'],
 ['site-architecture','Structuring website pages and internal links around intent','web-seo'],
 ['core-web-vitals','Practical website performance improvements for users','web-seo'],
 ['accessibility','Making business websites easier to use and understand','web-seo'],
 ['case-studies','Turning project work into useful and credible case studies','brand-strategy'],
 ['short-video','Building a repeatable short-form video content system','creative-video'],
 ['product-video','Planning product and service videos around customer questions','creative-video'],
 ['creative-testing','Testing creative concepts without confusing results','creative-video'],
 ['social-calendar','Building a social media calendar around business goals','social-content'],
 ['content-repurposing','Repurposing one strong idea across multiple formats','social-content'],
 ['b2b-content','Planning useful content for B2B decision makers','social-content'],
 ['community-management','Building a consistent and helpful social brand voice','social-content'],
 ['ai-workflow','Using AI in marketing workflows while protecting quality','digital-growth'],
 ['campaign-brief','Writing a campaign brief that connects creative work to results','digital-growth'],
 ['marketing-measurement','Choosing digital marketing metrics that support decisions','digital-growth'],
 ['conversion-review','Running a practical conversion review of a service website','digital-growth'],
 ['lead-funnel','Designing a clear lead journey for professional services','digital-growth'],
 ['ecommerce-trust','Improving trust and product information on ecommerce pages','industry-guides'],
 ['hospitality-brand','Digital brand experience for hospitality businesses','industry-guides'],
 ['real-estate-content','Building useful digital content for real estate businesses','industry-guides'],
 ['clinic-website','Website clarity and responsible communication for clinics','industry-guides'],
 ['professional-services','Explaining complex professional services simply online','industry-guides']
 ],
 tr:[
 ['marka-konumlandirma','Büyüyen işletmeler için marka konumlandırma rehberi','brand-strategy'],
 ['marka-mesaji','Müşterinin hızlıca anlayacağı marka mesajı oluşturmak','brand-strategy'],
 ['gorsel-kimlik','Tutarlı ve esnek bir görsel kimlik sistemi kurmak','brand-strategy'],
 ['marka-tutarliligi','Dijital temas noktalarında marka tutarlılığını korumak','brand-strategy'],
 ['yeniden-markalama','Müşteri güvenini koruyarak yeniden markalama planlamak','brand-strategy'],
 ['web-tasarim-briefi','Web sitesi projesi için doğru brief hazırlamak','web-seo'],
 ['landing-page','Müşteri kararına odaklanan açılış sayfası tasarlamak','web-seo'],
 ['teknik-seo','Küçük ve orta ölçekli işletmeler için teknik SEO kontrol listesi','web-seo'],
 ['yerel-seo','Hizmet işletmeleri için yerel arama görünürlüğünü geliştirmek','web-seo'],
 ['site-mimarisi','Web sayfalarını arama niyetine göre düzenlemek','web-seo'],
 ['site-hizi','Kullanıcı deneyimi için web sitesi performansını iyileştirmek','web-seo'],
 ['erisilebilir-web','İşletme web sitesini erişilebilir ve anlaşılır yapmak','web-seo'],
 ['vaka-calismasi','Proje çalışmalarını güven veren vaka incelemelerine dönüştürmek','brand-strategy'],
 ['kisa-video','Sürdürülebilir kısa video içerik sistemi kurmak','creative-video'],
 ['urun-hizmet-videosu','Müşteri sorularını yanıtlayan ürün ve hizmet videoları planlamak','creative-video'],
 ['yaratici-test','Reklam yaratıcılarını sonuçları karıştırmadan test etmek','creative-video'],
 ['sosyal-medya-takvimi','İş hedeflerine bağlı sosyal medya içerik takvimi kurmak','social-content'],
 ['icerik-yeniden-kullanim','Tek bir fikri farklı içerik formatlarına uyarlamak','social-content'],
 ['b2b-icerik','B2B karar vericiler için yararlı içerik planlamak','social-content'],
 ['marka-dili','Sosyal medyada tutarlı ve yardımcı marka dili oluşturmak','social-content'],
 ['yapay-zeka-pazarlama','Pazarlamada yapay zekâ kullanırken kaliteyi korumak','digital-growth'],
 ['kampanya-briefi','Yaratıcı çalışmayı sonuçlarla bağlayan kampanya briefi','digital-growth'],
 ['pazarlama-olcumu','Karar vermeye yardımcı dijital pazarlama metrikleri','digital-growth'],
 ['donusum-analizi','Hizmet web sitesi için dönüşüm analizi yapmak','digital-growth'],
 ['potansiyel-musteri','Profesyonel hizmetler için müşteri adayı yolculuğu','digital-growth'],
 ['eticaret-guveni','E-ticaret sayfalarında güveni ve ürün bilgisini iyileştirmek','industry-guides'],
 ['konaklama-markasi','Konaklama işletmeleri için dijital marka deneyimi','industry-guides'],
 ['gayrimenkul-icerigi','Gayrimenkul işletmeleri için yararlı dijital içerik','industry-guides'],
 ['klinik-web-sitesi','Klinik web sitelerinde açıklık ve etik iletişim','industry-guides'],
 ['profesyonel-hizmet','Karmaşık profesyonel hizmetleri internette sade anlatmak','industry-guides']
 ],
 ar:[
 ['gulf-brand-positioning','استراتيجية تموضع العلامة للشركات الخدمية في الإمارات وقطر','brand-strategy'],
 ['arabic-brand-message','صياغة رسالة علامة تجارية واضحة للجمهور العربي','brand-strategy'],
 ['arabic-visual-identity','بناء هوية بصرية مرنة ومتسقة للعلامة التجارية','brand-strategy'],
 ['gulf-brand-consistency','الحفاظ على اتساق العلامة عبر القنوات الرقمية في الخليج','brand-strategy'],
 ['rebrand-gulf','تخطيط إعادة العلامة التجارية مع الحفاظ على ثقة العملاء','brand-strategy'],
 ['website-design-brief-gulf','إعداد موجز واضح لمشروع تصميم موقع إلكتروني','web-seo'],
 ['landing-page-gulf','تصميم صفحة هبوط تساعد العميل على اتخاذ القرار','web-seo'],
 ['technical-seo-arabic','قائمة مراجعة SEO تقنية للشركات الصغيرة والمتوسطة','web-seo'],
 ['local-seo-gulf','تحسين الظهور المحلي في البحث للشركات الخدمية','web-seo'],
 ['arabic-site-architecture','تنظيم صفحات الموقع والروابط الداخلية وفق نية البحث','web-seo'],
 ['site-speed-gulf','تحسين أداء الموقع لتجربة أفضل على الهاتف','web-seo'],
 ['arabic-accessibility','جعل المواقع التجارية أوضح وأسهل للاستخدام','web-seo'],
 ['case-studies-gulf','تحويل المشاريع السابقة إلى دراسات حالة موثوقة','brand-strategy'],
 ['short-video-gulf','بناء نظام محتوى مستمر للفيديو القصير','creative-video'],
 ['service-video-arabic','تخطيط فيديوهات الخدمات وفق أسئلة العملاء','creative-video'],
 ['creative-testing-gulf','اختبار الأفكار الإعلانية وتحليل النتائج بوضوح','creative-video'],
 ['social-calendar-arabic','إعداد تقويم محتوى للتواصل الاجتماعي مرتبط بالأهداف','social-content'],
 ['content-reuse-arabic','إعادة تقديم الفكرة الواحدة في صيغ محتوى متعددة','social-content'],
 ['b2b-content-gulf','تخطيط محتوى مفيد لصنّاع القرار في قطاع الأعمال','social-content'],
 ['arabic-brand-voice','بناء صوت ثابت ومفيد للعلامة على وسائل التواصل','social-content'],
 ['ai-marketing-gulf','استخدام الذكاء الاصطناعي في التسويق مع الحفاظ على الجودة','digital-growth'],
 ['campaign-brief-arabic','إعداد موجز حملة يربط الإبداع بنتائج الأعمال','digital-growth'],
 ['marketing-metrics-arabic','اختيار مؤشرات تسويق رقمي تدعم القرارات','digital-growth'],
 ['conversion-audit-arabic','إجراء مراجعة عملية لتحويل الزوار إلى استفسارات','digital-growth'],
 ['lead-journey-gulf','تصميم رحلة استفسار بسيطة للخدمات المهنية','digital-growth'],
 ['ecommerce-trust-gulf','تحسين الثقة ومعلومات المنتجات في التجارة الإلكترونية','industry-guides'],
 ['hospitality-digital-brand','التجربة الرقمية للعلامات التجارية في قطاع الضيافة الخليجي','industry-guides'],
 ['real-estate-content-gulf','إعداد محتوى رقمي مفيد لشركات العقارات في الخليج','industry-guides'],
 ['clinic-website-gulf','الوضوح والتواصل المسؤول في مواقع العيادات','industry-guides'],
 ['professional-services-arabic','شرح الخدمات المهنية المعقدة بلغة واضحة عبر الإنترنت','industry-guides']
 ]
};
const schema = {type:'object',additionalProperties:false,properties:{
 slug:{type:'string'},title:{type:'string'},description:{type:'string'},excerpt:{type:'string'},category:{type:'string',enum:CATS},intro:{type:'string'},
 sections:{type:'array',items:{type:'object',additionalProperties:false,properties:{heading:{type:'string'},paragraphs:{type:'array',items:{type:'string'}},bullets:{type:'array',items:{type:'string'}}},required:['heading','paragraphs','bullets']}},
 faq:{type:'array',items:{type:'object',additionalProperties:false,properties:{q:{type:'string'},a:{type:'string'}},required:['q','a']}},
 sources:{type:'array',items:{type:'object',additionalProperties:false,properties:{title:{type:'string'},url:{type:'string'}},required:['title','url']}}
},required:['slug','title','description','excerpt','category','intro','sections','faq','sources']};
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
async function loadArticles(lang){
 const dir=path.join(ROOT,'blog','data',lang);let files=[];
 try{files=(await fs.readdir(dir)).filter(f=>f.endsWith('.json'))}catch{}
 const list=[];
 for(const file of files){try{list.push(JSON.parse(await fs.readFile(path.join(dir,file),'utf8')))}catch(e){console.warn('Skipping invalid JSON',file,e.message)}}
 return list;
}
function words(a){return [a.title,a.description,a.excerpt,a.intro,...a.sections.flatMap(s=>[s.heading,...s.paragraphs,...(s.bullets||[])]),...(a.faq||[]).flatMap(f=>[f.q,f.a])].join(' ').trim().split(/\s+/).length}
function validSlug(s){return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)&&s.length<=90}
async function requestArticle(t,existingTitles,existingSlugs){
 const locale=L[t.lang];
 const instructions='You are the senior editor for RocketPen Digital Studio. Use the built-in web_search tool before writing. Create distinctive, people-first editorial content that demonstrates real analysis, practical steps, examples, decision criteria, balanced trade-offs and clear next actions. Avoid mass-produced boilerplate, repeated introductions, keyword stuffing, empty marketing language, unverified statistics, fabricated case studies or testimonials, legal claims without reliable sources, and promises of rankings or sales. Google may treat large volumes of unoriginal low-value pages as scaled content abuse, so every article must have a genuinely useful angle. Write natural '+locale.name+'. Market: '+t.market+'. Write approximately 900-1,300 words: an introduction, at least 6 substantive sections, 2-3 developed paragraphs per section, practical bullets where useful and 4-5 specific FAQs. Include 3-5 HTTPS sources actually consulted through web search. Return only the JSON schema requested. Slugs must be ASCII kebab-case.';
 const prompt='Create one publish-ready long-form article for RocketPen Digital Studio.\nLanguage: '+locale.name+' ('+t.lang+')\nTarget market: '+t.market+'\nTopic seed: '+t.topic+'\nEditorial topic ID: '+t.topicId+'\nCategory: '+t.category+'\nAllowed categories: '+CATS.join(', ')+'\nExisting titles to avoid: \n'+existingTitles.slice(-100).map(x=>'- '+x).join('\n')+'\nExisting slugs to avoid: '+existingSlugs.slice(-100).join(', ')+'\nThe article must be original for this locale, not a shallow translation of another page. Explain the reader problem, give a clear framework and checklist, note trade-offs, use specific hypothetical examples only when labelled hypothetical, and cite sources with exact URLs. Do not fabricate market statistics.';
 for(let attempt=0;attempt<2;attempt++){
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,tools:[{type:'web_search'}],tool_choice:'required',instructions:instructions,input:prompt+(attempt?'\nPrevious draft failed: '+t.validationError+'. Write a complete, longer article that meets all constraints.':''),max_output_tokens:6500,text:{format:{type:'json_schema',name:'digital_blog_article',strict:true,schema:schema}}})});
  if(!response.ok){throw new Error('OpenAI API error '+response.status+': '+(await response.text()).slice(0,600))}
  const result=await response.json();
  const output=(result.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
  let a;try{a=JSON.parse(output)}catch{t.validationError='invalid JSON output';continue}
  const errors=[];
  if(!validSlug(a.slug)||existingSlugs.includes(a.slug))errors.push('slug invalid or already used');
  if(!a.title||a.title.length<25)errors.push('title too short');
  if(!a.description||a.description.length<80)errors.push('description too short');
  if(!a.excerpt||a.excerpt.length<45)errors.push('excerpt too short');
  if(!CATS.includes(a.category))errors.push('category is invalid');
  if(!Array.isArray(a.sections)||a.sections.length<6)errors.push('fewer than six sections');
  if(!Array.isArray(a.faq)||a.faq.length<4)errors.push('fewer than four FAQs');
  const seenSourceUrls = new Set();
  a.sources=(a.sources||[]).filter(s=>{
   if(!s||typeof s.title!=='string'||!s.title.trim()||typeof s.url!=='string')return false;
   try{
    const u=new URL(s.url);
    if(u.protocol!=='https:'||!u.hostname||u.username||u.password)return false;
    const normalized=u.href;
    if(seenSourceUrls.has(normalized))return false;
    seenSourceUrls.add(normalized);
    return true;
   }catch{return false}
  });
  if(a.sources.length<3)errors.push('fewer than three HTTPS sources');
  if(words(a)<800)errors.push('article has only '+words(a)+' words; minimum quality gate is 800');
  if(errors.length){t.validationError=errors.join('; ');continue}
  a.sources=a.sources.slice(0,5);a.lang=t.lang;a.market=t.market;a.topicId=t.topicId;a.publishedAt=TODAY;a.updatedAt=TODAY;
  return a;
 }
 throw new Error('Article failed editorial quality checks ('+t.lang+'/'+t.topicId+'): '+t.validationError);
}
function renderArticle(a){
 const locale=L[a.lang],rtl=a.lang==='ar',urlPath='/blog/'+a.lang+'/articles/'+a.slug+'.html';
 const canonical=SITE_URL?'<link rel="canonical" href="'+esc(SITE_URL+urlPath)+'">':'';
 const count=words(a),minutes=Math.max(4,Math.ceil(count/(rtl?190:220)));
 const jsonLd={'@context':'https://schema.org','@type':'BlogPosting',headline:a.title,description:a.description,datePublished:a.publishedAt,dateModified:a.updatedAt||a.publishedAt,author:{'@type':'Organization',name:'RocketPen Digital Studio Editorial Team'},publisher:{'@type':'Organization',name:'RocketPen Digital Studio'},inLanguage:a.lang,keywords:a.category};
 if(SITE_URL)jsonLd.mainEntityOfPage=SITE_URL+urlPath;
 const sections=a.sections.map(s=>'<section><h2>'+esc(s.heading)+'</h2>'+(s.paragraphs||[]).map(p=>'<p>'+esc(p)+'</p>').join('')+((s.bullets||[]).length?'<ul>'+s.bullets.map(b=>'<li>'+esc(b)+'</li>').join('')+'</ul>':'')+'</section>').join('\n');
 const faq='<section class="faq"><h2>'+locale.faq+'</h2>'+a.faq.map(x=>'<div><h3>'+esc(x.q)+'</h3><p>'+esc(x.a)+'</p></div>').join('')+'</section>';
 const sources='<section class="sources"><h2>'+locale.sources+'</h2><ul>'+a.sources.map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+'</a></li>').join('')+'</ul></section>';
 const home='../../..'+locale.home;
 return '<!doctype html>\n<html lang="'+a.lang+'"'+(rtl?' dir="rtl"':'')+'><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<link rel="icon" type="image/svg+xml" href="/asset/logo/favicon.svg">'+
 '<title>'+esc(a.title)+' | RocketPen Digital Studio</title><meta name="description" content="'+esc(a.description)+'"><meta name="robots" content="index,follow">'+canonical+
 '<meta property="og:type" content="article"><meta property="og:title" content="'+esc(a.title)+'"><meta property="og:description" content="'+esc(a.description)+'"><meta property="article:published_time" content="'+a.publishedAt+'">'+
 '<script type="application/ld+json">'+JSON.stringify(jsonLd).replace(/</g,'\\u003c')+'</script>'+
 '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">'+
 '<style>:root{--yellow:#ffeb00;--pad:clamp(22px,5.5vw,88px);--font:"DM Sans",sans-serif;--display:"Space Grotesk",sans-serif}*{box-sizing:border-box}body{margin:0;background:#f7f7f5;color:#15171d;font-family:var(--font);line-height:1.8}.top{display:flex;align-items:center;justify-content:space-between;padding:18px var(--pad);background:#080a0f;color:white;border-bottom:1px solid #ffffff24}.logo{width:215px;max-width:52vw}.nav{display:flex;align-items:center;gap:18px;font-size:12px}.nav a{color:#e4e6ea;text-decoration:none}main{padding:clamp(45px,7vw,90px) 22px 85px}.article{max-width:860px;margin:auto}.crumb{font-size:12px;color:#686d77;margin-bottom:25px}.crumb a{color:#555b65}.tag{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#b50e1d;font-weight:700}.article h1{font:700 clamp(38px,6.5vw,66px)/1.02 var(--display);letter-spacing:-.06em;margin:18px 0 22px}.standfirst{font-size:clamp(17px,2vw,21px);line-height:1.65;color:#4e535d}.meta{display:flex;gap:14px;flex-wrap:wrap;color:#777c85;font-size:12px;margin:22px 0 36px;padding-bottom:24px;border-bottom:1px solid #dcdee1}.article section{margin:34px 0}.article h2{font:600 clamp(25px,3.8vw,34px)/1.18 var(--display);letter-spacing:-.035em;margin:0 0 14px}.article h3{font-size:18px}.article p,.article li{font-size:16px;line-height:1.88;color:#3d424b}.article a{color:#a30c1b}.article .faq>div{padding:14px 0;border-bottom:1px solid #dfe0e2}.cta{margin-top:54px;background:#080a0f;color:white;padding:30px;border-left:4px solid var(--yellow)}.cta h2{color:white}.cta p{color:#bec3cb}.cta a{display:inline-block;padding:13px 18px;background:var(--yellow);color:#0a0b0e;text-decoration:none;font-weight:700;font-size:12px;margin-top:6px}.end{padding:22px var(--pad);background:#080a0f;color:#a9afba;display:flex;justify-content:space-between;gap:16px;font-size:12px}.end a{color:#d9dce2;text-decoration:none}@media(max-width:760px){.top{padding:14px 20px}.logo{width:175px}.article h1{font-size:clamp(37px,10.5vw,52px)}.article p,.article li{font-size:15px}.cta{padding:23px}.end{flex-direction:column;padding:20px}}.arabic{font-family:Tahoma,Arial,sans-serif}.arabic .article h1,.arabic .article h2{letter-spacing:0}</style><link rel="stylesheet" href="/asset/css/responsive-overrides.css"></head><body class="'+(rtl?'arabic':'')+'">'+
 '<header class="top"><a href="'+home+'"><img class="logo" src="../../../asset/logo/logo-header.png" alt="RocketPen Digital Studio"></a><nav class="nav"><a href="'+locale.blog+'">'+locale.blogLabel+'</a><a href="'+home+'">'+locale.homeLabel+'</a></nav></header>'+
 '<main><article class="article"><div class="crumb"><a href="'+locale.blog+'">'+locale.blogLabel+'</a> / '+esc(CAT[a.lang][a.category]||a.category)+'</div><div class="tag">'+esc(CAT[a.lang][a.category]||a.category)+'</div><h1>'+esc(a.title)+'</h1><p class="standfirst">'+esc(a.excerpt)+'</p><div class="meta"><span>'+a.publishedAt+'</span><span>'+count+' '+locale.read+'</span><span>RocketPen Digital Studio Editorial Team</span></div><p>'+esc(a.intro)+'</p>'+sections+faq+sources+
 '<div class="cta"><h2>'+locale.contact+'</h2><p>'+locale.cta+'</p><a href="'+home+'#contact">'+locale.contact+'</a></div></article></main>'+
 '<footer class="end"><span>© '+a.publishedAt.slice(0,4)+' RocketPen Digital Studio</span><a href="'+locale.blog+'">← '+locale.blogLabel+'</a><a href="'+home+'">'+locale.homeLabel+'</a></footer></body></html>';
}
const PAGE_SIZE=24;
function articleCard(a,lang,index){
 const label=CAT[lang][a.category]||a.category;
 const link='/blog/'+lang+'/articles/'+esc(a.slug)+'.html';
 return '<article class="article-card" data-category="'+esc(a.category)+'"><div class="article-no">'+String(index+1).padStart(2,'0')+' / '+esc(label.toUpperCase())+'</div><div><h3><a href="'+link+'">'+esc(a.title)+'</a></h3><p>'+esc(a.excerpt||a.description)+'</p></div><a class="read" href="'+link+'">'+(lang==='ar'?'اقرأ الدليل':lang==='tr'?'Rehberi oku':'Read the guide')+'</a></article>';
}
function paginationMarkup(lang,page,total){
 if(total<=1)return '';
 const labels={en:{prev:'Previous',next:'Next'},tr:{prev:'Önceki',next:'Sonraki'},ar:{prev:'السابق',next:'التالي'}};
 const L=labels[lang],url=n=>n===1?'/blog/'+lang+'/index.html':'/blog/'+lang+'/page/'+n+'.html';
 let out='<nav class="pagination" aria-label="Pagination">';
 if(page>1)out+='<a href="'+url(page-1)+'" rel="prev">'+L.prev+'</a>';
 const lo=Math.max(1,page-2),hi=Math.min(total,page+2);
 if(lo>1)out+='<a href="'+url(1)+'">1</a><span aria-hidden="true">…</span>';
 for(let n=lo;n<=hi;n++)out+=n===page?'<span class="current" aria-current="page">'+n+'</span>':'<a href="'+url(n)+'">'+n+'</a>';
 if(hi<total)out+='<span aria-hidden="true">…</span><a href="'+url(total)+'">'+total+'</a>';
 if(page<total)out+='<a href="'+url(page+1)+'" rel="next">'+L.next+'</a>';
 return out+'</nav>';
}
async function renderIndex(lang,articles){
 const file=path.join(ROOT,'blog',lang,'index.html');let html=await fs.readFile(file,'utf8');
 const start='<!-- POSTS_START -->',end='<!-- POSTS_END -->',si=html.indexOf(start),ei=html.indexOf(end);
 if(si<0||ei<si)throw new Error('Missing article markers in blog/'+lang+'/index.html');
 const sorted=articles.slice().sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||''));
 const total=Math.max(1,Math.ceil(sorted.length/PAGE_SIZE));
 const pagerStart='<!-- PAGINATION_START -->',pagerEnd='<!-- PAGINATION_END -->';
 const cards=sorted.slice(0,PAGE_SIZE).map((a,i)=>articleCard(a,lang,i)).join('\\n');
 html=html.slice(0,si+start.length)+'\\n'+cards+'\\n'+html.slice(ei);
 if(!html.includes(pagerStart))html=html.replace(end,end+'\\n'+pagerStart+'\\n'+pagerEnd);
 const ps=html.indexOf(pagerStart),pe=html.indexOf(pagerEnd);
 html=html.slice(0,ps+pagerStart.length)+'\\n'+paginationMarkup(lang,1,total)+'\\n'+html.slice(pe);
 await fs.writeFile(file,html);
 const archiveDir=path.join(ROOT,'blog',lang,'page');
 await fs.mkdir(archiveDir,{recursive:true});
 for(let page=2;page<=total;page++){
  let archive=html;
  const asi=archive.indexOf(start),aei=archive.indexOf(end);
  const pageCards=sorted.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE).map((a,i)=>articleCard(a,lang,(page-1)*PAGE_SIZE+i)).join('\\n');
  archive=archive.slice(0,asi+start.length)+'\\n'+pageCards+'\\n'+archive.slice(aei);
  const aps=archive.indexOf(pagerStart),ape=archive.indexOf(pagerEnd);
  archive=archive.slice(0,aps+pagerStart.length)+'\\n'+paginationMarkup(lang,page,total)+'\\n'+archive.slice(ape);
  archive=archive.replace(/<title>([^<]*)<\\/title>/i,(_,title)=>'<title>'+({en:'Articles — Page ',tr:'Makaleler — Sayfa ',ar:'المقالات — الصفحة '}[lang])+page+' | RocketPen Digital Studio</title>');
  archive=archive.replace(/<meta name="description" content="[^"]*">/i,'<meta name="description" content="'+esc(({en:'Browse practical RocketPen Digital Studio articles. Archive page ',tr:'RocketPen Digital Studio makalelerini ve uygulamalı rehberlerini keşfedin. Arşiv sayfası ',ar:'تصفح مقالات وأدلة RocketPen Digital Studio. صفحة الأرشيف '}[lang])+page)+'">');
  archive=archive.replace(/href="\\.\\.\\/\\.\\.\\/asset\\/logo\\/logo-header\\.png"/g,'href="/asset/logo/logo-header.png"');
  archive=archive.replace(/src="\\.\\.\\/\\.\\.\\/asset\\/logo\\/logo-header\\.png"/g,'src="/asset/logo/logo-header.png"');
  archive=archive.replace(/href="\\.\\.\\/\\.\\.\\/index\\.html/g,'href="/index.html');
  archive=archive.replace(/href="\\.\\.\\/\\.\\.\\/languages\\/(tr|ar)\\.html/g,'href="/languages/$1.html');
  archive=archive.replace(/<link rel="canonical" href="[^"]*">/i,'');
  if(SITE_URL)archive=archive.replace('</head>','<link rel="canonical" href="'+SITE_URL+'/blog/'+lang+'/page/'+page+'.html">\\n</head>');
  await fs.writeFile(path.join(archiveDir,page+'.html'),archive);
 }
 for(const name of await fs.readdir(archiveDir)){
  const n=Number(name.replace('.html',''));
  if(name.endsWith('.html')&&Number.isInteger(n)&&n>=2&&n>total)await fs.rm(path.join(archiveDir,name));
 }
}
async function updateSeoBlocks(){
 if(!SITE_URL){console.warn('SITE_URL is not configured; canonical tags and hreflang annotations are skipped. Set the repository variable SITE_URL to the canonical site origin.');return}
 let parsedSite;
 try{parsedSite=new URL(SITE_URL)}catch{throw new Error('SITE_URL must be a full HTTPS origin such as https://www.example.com')}
 if(parsedSite.protocol!=='https:'||parsedSite.origin!==SITE_URL)throw new Error('SITE_URL must be an HTTPS origin without a path, query or fragment, e.g. https://www.example.com');
 const base=parsedSite.origin
 const locales=[['en','/'],['tr','/languages/tr.html'],['ar','/languages/ar.html']];
 const pageSet=[
  {file:'index.html',path:'/',group:locales},
  {file:'languages/tr.html',path:'/languages/tr.html',group:locales},
  {file:'languages/ar.html',path:'/languages/ar.html',group:locales},
  {file:'blog/en/index.html',path:'/blog/en/index.html',group:[['en','/blog/en/index.html'],['tr','/blog/tr/index.html'],['ar','/blog/ar/index.html']]},
  {file:'blog/tr/index.html',path:'/blog/tr/index.html',group:[['en','/blog/en/index.html'],['tr','/blog/tr/index.html'],['ar','/blog/ar/index.html']]},
  {file:'blog/ar/index.html',path:'/blog/ar/index.html',group:[['en','/blog/en/index.html'],['tr','/blog/tr/index.html'],['ar','/blog/ar/index.html']]}
 ];
 for(const page of pageSet){
  const file=path.join(ROOT,page.file);let html=await fs.readFile(file,'utf8');
  const links='<link rel="canonical" href="'+esc(base+page.path)+'">\n'+page.group.map(item=>'<link rel="alternate" hreflang="'+item[0]+'" href="'+esc(base+item[1])+'">').join('\n')+'\n<link rel="alternate" hreflang="x-default" href="'+esc(base+(page.file.startsWith('blog/')?'/blog/en/index.html':'/'))+'">';
  const re=/<!-- SEO_ALTERNATES_START -->[\s\S]*?<!-- SEO_ALTERNATES_END -->/;
  if(!re.test(html))throw new Error('Missing SEO alternate markers in '+page.file);
  html=html.replace(re,'<!-- SEO_ALTERNATES_START -->\n'+links+'\n<!-- SEO_ALTERNATES_END -->');
  await fs.writeFile(file,html);
 }
}
async function writeSitemap(all){
 const robotsLines=['User-agent: *','Allow: /'];
 if(SITE_URL)robotsLines.push('Sitemap: '+SITE_URL+'/sitemap.xml');
 await fs.writeFile(path.join(ROOT,'robots.txt'),robotsLines.join('\n')+'\n');
 if(!SITE_URL){console.warn('SITE_URL missing: robots.txt was written, but canonical URLs, hreflang and sitemap.xml are skipped. Configure the repository variable SITE_URL to enable them.');return}
 const entries=[['/',''],['/languages/tr.html',''],['/languages/ar.html',''],['/blog/en/index.html',''],['/blog/tr/index.html',''],['/blog/ar/index.html','']];
 for(const lang of LANGS){const dir=path.join(ROOT,'blog',lang,'page');try{for(const name of await fs.readdir(dir)){if(/^\\d+\\.html$/.test(name))entries.push(['/blog/'+lang+'/page/'+name,'']);}}catch{}}
 for(const a of all)entries.push(['/blog/'+a.lang+'/articles/'+a.slug+'.html',a.updatedAt||a.publishedAt]);
 const body=entries.map(e=>'<url><loc>'+esc(SITE_URL+e[0])+'</loc>'+(e[1]?'<lastmod>'+e[1]+'</lastmod>':'')+'</url>').join('\n');
 await fs.writeFile(path.join(ROOT,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+body+'\n</urlset>\n');
}
async function main(){
 if(!API_KEY)throw new Error('OPENAI_API_KEY is missing. Add it as a repository Actions secret before automatic publishing can run.');
 if(SITE_URL){
  let configuredSite;
  try{configuredSite=new URL(SITE_URL)}catch{throw new Error('SITE_URL must be a full HTTPS origin such as https://www.example.com')}
  if(configuredSite.protocol!=='https:'||configuredSite.origin!==SITE_URL)throw new Error('SITE_URL must be an HTTPS origin without a path, query or fragment, e.g. https://www.example.com');
 }
 const byLang={};for(const lang of LANGS)byLang[lang]=await loadArticles(lang);
 const all=LANGS.flatMap(lang=>byLang[lang]);const titles=all.map(a=>a.title),slugs=all.map(a=>a.slug);
 const counts={en:10,tr:10,ar:10},variants=['implementation guide','decision framework','audit checklist','common mistakes and alternatives','measurement and optimization playbook'];
 const tasks=[];
 for(const lang of LANGS){
  const pool=TOPICS[lang];let count=0,offset=0;
  while(count<counts[lang]&&offset<pool.length*variants.length){
   const pos=(DAY*counts[lang]+offset)%pool.length;
   const variant=variants[Math.floor((DAY*counts[lang]+offset)/pool.length)%variants.length];
   const item=pool[pos];const topicId=item[0]+'-'+variant.replace(/[^a-z]+/gi,'-').toLowerCase()+'-'+TODAY;
   if(!byLang[lang].some(a=>a.topicId===topicId)&&!tasks.some(t=>t.lang===lang&&t.topicId===topicId)){
    let market=lang==='en'?['United States','United Kingdom','International English-speaking markets','US and UK'][count]:lang==='tr'?'Türkiye':['United Arab Emirates','Qatar','UAE and Qatar'][count];
    tasks.push({lang,topic:item[1]+'. Editorial angle: '+variant+'.',topicId,category:item[2],market});count++;
   }
   offset++;
  }
  if(count!==counts[lang])throw new Error('Not enough unused topics to schedule '+lang);
 }
 console.log('Preparing 30 localized articles: 10 English, 10 Turkish and 10 Arabic, dated '+TODAY);
 const newlyGenerated=[];
 for(let i=0;i<tasks.length;i++){
  const t=tasks[i];console.log('Generating '+(i+1)+'/'+tasks.length+' ('+t.lang+'): '+t.topic);
  const a=await requestArticle(t,titles,slugs);
  a.category=t.category;a.market=t.market;a.topicId=t.topicId;a.publishedAt=TODAY;a.updatedAt=TODAY;
  if(slugs.includes(a.slug))a.slug=a.slug+'-'+TODAY;
  if(!validSlug(a.slug))throw new Error('Invalid slug: '+a.slug);
  const dataDir=path.join(ROOT,'blog','data',t.lang),pageDir=path.join(ROOT,'blog',t.lang,'articles');
  await fs.mkdir(dataDir,{recursive:true});await fs.mkdir(pageDir,{recursive:true});
  await fs.writeFile(path.join(dataDir,a.slug+'.json'),JSON.stringify(a,null,2)+'\n');
  await fs.writeFile(path.join(pageDir,a.slug+'.html'),renderArticle(a));
  byLang[t.lang].push(a);all.push(a);titles.push(a.title);slugs.push(a.slug);newlyGenerated.push(a);
 }
 for(const a of all){const pageDir=path.join(ROOT,'blog',a.lang,'articles');await fs.mkdir(pageDir,{recursive:true});await fs.writeFile(path.join(pageDir,a.slug+'.html'),renderArticle(a));}
 for(const lang of LANGS)await renderIndex(lang,byLang[lang]);
 await updateSeoBlocks();
 await writeSitemap(all);
 const reportBase=SITE_URL||'https://rocketpendigital.qasimm2012.workers.dev';
 const summaryPath=process.env.GITHUB_STEP_SUMMARY;
 if(summaryPath){
  const summary=['## Daily Digital Blog report — '+TODAY,'','Generated and quality-checked **'+newlyGenerated.length+' articles**: **'+newlyGenerated.filter(a=>a.lang==='en').length+' English**, **'+newlyGenerated.filter(a=>a.lang==='tr').length+' Turkish**, **'+newlyGenerated.filter(a=>a.lang==='ar').length+' Arabic**.','', '### English'];
  for(const lang of LANGS){if(lang!=='en')summary.push('### '+(lang==='tr'?'Türkçe':'العربية'));for(const a of newlyGenerated.filter(x=>x.lang===lang))summary.push('- ['+a.title+']('+reportBase+'/blog/'+a.lang+'/articles/'+a.slug+'.html)');summary.push('');}
  summary.push('> Publication links are confirmed after the following GitHub commit-and-push step succeeds.');
  await fs.appendFile(summaryPath,summary.join('\n')+'\n');
 }
 console.log('Generated 30 localized articles (10 per language). The workflow will commit and push them next. Add SITE_URL as a repository variable for absolute canonical URLs and sitemap.xml.');
}
main().catch(err=>{console.error(err);process.exit(1)});
