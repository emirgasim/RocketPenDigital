(()=>{
 const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
 $$('[data-year]').forEach(el=>el.textContent=String(new Date().getFullYear()));
 const lang=document.documentElement.lang||'en';
 $$('[data-edition]').forEach(a=>{if(a.dataset.edition===lang)a.setAttribute('aria-current','page')});
 const labels={
 en:{date:'Archive date',read:'Read story →',empty:'No stories are available for this filter yet.',page:'Page',prev:'← Previous',next:'Next →',all:'Latest stories',categories:{ai:'AI & Machine Learning',devices:'Phones & Devices',apps:'Apps & Software',gaming:'Gaming',science:'Science & Space',security:'Cybersecurity',mobility:'Mobility & Transport','digital-culture':'Digital Culture'}},
 tr:{date:'Arşiv tarihi',read:'Haberi oku →',empty:'Bu filtrede henüz haber bulunmuyor.',page:'Sayfa',prev:'← Önceki',next:'Sonraki →',all:'Son haberler',categories:{ai:'Yapay Zekâ',devices:'Telefonlar ve Cihazlar',apps:'Uygulamalar ve Yazılım',gaming:'Oyun',science:'Bilim ve Uzay',security:'Siber Güvenlik',mobility:'Mobilite ve Ulaşım','digital-culture':'Dijital Kültür'}},
 ar:{date:'تاريخ الأرشيف',read:'اقرأ الخبر ←',empty:'لا توجد أخبار متاحة لهذا الاختيار بعد.',page:'الصفحة',prev:'← السابق',next:'التالي →',all:'أحدث الأخبار',categories:{ai:'الذكاء الاصطناعي',devices:'الهواتف والأجهزة',apps:'التطبيقات والبرمجيات',gaming:'الألعاب',science:'العلوم والفضاء',security:'الأمن السيبراني',mobility:'التنقل والنقل','digital-culture':'الثقافة الرقمية'}}
 };
 const t=labels[lang]||labels.en, list=$('#news-list'); if(!list)return;
 const params=new URLSearchParams(location.search),category=params.get('category')||'',page=Math.max(1,parseInt(params.get('page')||'1',10)||1),pageSize=20;
 $$('.news-nav a[href^="#"]').forEach(a=>{const key=a.getAttribute('href').slice(1);if(t.categories[key])a.href='/news/'+lang+'/?category='+encodeURIComponent(key)});
 const heading=$('#latest .section-head h2');if(heading)heading.textContent=t.categories[category]||t.all;
 fetch('/news/data/news.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('archive unavailable');return r.json()}).then(data=>{
  let stories=(data.stories||[]).filter(s=>s.lang===lang&&s.status==='published');
  stories.sort((a,b)=>(b.dateISO||'').localeCompare(a.dateISO||'')||b.id-a.id);
  if(category)stories=stories.filter(s=>s.category===category);
  const pages=Math.max(1,Math.ceil(stories.length/pageSize)),p=Math.min(page,pages),shown=stories.slice((p-1)*pageSize,p*pageSize);
  list.replaceChildren();
  if(!shown.length){const empty=document.createElement('div');empty.className='empty-list';empty.textContent=t.empty;list.append(empty)}
  for(const s of shown){
   const card=document.createElement('article');card.className='archive-card'+(shown.indexOf(s)===0&&p===1?' archive-card-featured':'');
   const cat=document.createElement('span');cat.className='category';cat.textContent=t.categories[s.category]||s.category;
   const h=document.createElement('h3'),a=document.createElement('a');a.href='/news/article.html?slug='+encodeURIComponent(s.slug)+'&lang='+lang;a.textContent=s.title;h.append(a);
   const summary=document.createElement('p');summary.className='archive-summary';summary.textContent=s.summary||'';
   const meta=document.createElement('p');meta.className='archive-meta';meta.textContent=[t.date+': '+(s.dateDisplay||s.dateISO||''),s.author||''].filter(Boolean).join(' · ');
   const read=document.createElement('a');read.className='archive-read';read.href=a.href;read.textContent=t.read;
   card.append(cat,h,summary,meta,read);list.append(card);
  }
  const pager=$('#news-pagination');if(pager){pager.replaceChildren();if(pages>1){
   const add=(label,n,disabled,rel)=>{const el=document.createElement(disabled?'span':'a');el.className='pagination-link'+(disabled?' is-disabled':'');el.textContent=label;if(!disabled){const q=new URLSearchParams(location.search);q.set('page',String(n));el.href=location.pathname+'?'+q.toString();if(rel)el.rel=rel}pager.append(el)};
   add(t.prev,p-1,p<=1,'prev');
   for(let n=1;n<=pages;n++){if(n===1||n===pages||Math.abs(n-p)<=2){const el=document.createElement(n===p?'span':'a');el.className='pagination-link'+(n===p?' is-current':'');el.textContent=String(n);if(n!==p){const q=new URLSearchParams(location.search);q.set('page',String(n));el.href=location.pathname+'?'+q.toString()}pager.append(el)}else if(Math.abs(n-p)===3){const dots=document.createElement('span');dots.className='pagination-ellipsis';dots.textContent='…';pager.append(dots)}}
   add(t.next,p+1,p>=pages,'next');
  }}
 }).catch(()=>{list.textContent=t.empty});
})();