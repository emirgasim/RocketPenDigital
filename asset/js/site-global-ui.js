/* Shared language dropdown and reading progress for static content pages. */
(function(){
  'use strict';
  /* Keep article numbering continuous across paginated blog listings.
     Listing pages contain 15 articles each: page 2 starts at 16, page 3 at 31, etc. */
  if(document.body && document.querySelector('.article-card')){
    var pageMatch=window.location.pathname.match(/\/page\/(\d+)\.html$/);
    var pageNumber=pageMatch?parseInt(pageMatch[1],10):1;
    if(!Number.isFinite(pageNumber)||pageNumber<1)pageNumber=1;
    document.body.style.counterReset='blog-article '+((pageNumber-1)*15);
  }
  var picker=document.getElementById('languagePicker');
  var button=document.getElementById('lang');
  var menu=document.getElementById('languageMenu');
  if(picker&&button&&menu){
    var closeMenu=function(){picker.classList.remove('is-open');button.setAttribute('aria-expanded','false');};
    button.addEventListener('click',function(event){
      event.preventDefault();event.stopPropagation();
      var opening=button.getAttribute('aria-expanded')!=='true';
      picker.classList.toggle('is-open',opening);
      button.setAttribute('aria-expanded',opening?'true':'false');
    });
    document.addEventListener('click',function(event){if(!picker.contains(event.target))closeMenu();});
    document.addEventListener('keydown',function(event){
      if(event.key==='Escape'&&picker.classList.contains('is-open')){closeMenu();button.focus();return;}
      if(picker.classList.contains('is-open')&&(event.key==='ArrowDown'||event.key==='ArrowUp')){
        var options=Array.prototype.slice.call(menu.querySelectorAll('[data-lang]'));
        if(!options.length)return;
        event.preventDefault();
        var index=options.indexOf(document.activeElement);
        index=event.key==='ArrowDown'?(index+1+options.length)%options.length:(index-1+options.length)%options.length;
        options[index].focus();
      }
    });
    menu.querySelectorAll('[data-lang]').forEach(function(option){
      option.tabIndex=0;
    });
  }

  /* WhatsApp conversion layer for Turkish, English and Arabic blog pages. */
  (function(){
    if(document.getElementById('rp-whatsapp-style')) return;
    var lang=(document.documentElement.lang||'en').toLowerCase().split('-')[0];
    var copy={
      tr:{float:'WhatsApp\'tan Bilgi Al',ctaTitle:'Projenizi birlikte büyütelim.',ctaText:'İhtiyacınızı konuşalım ve sizin için doğru dijital adımı belirleyelim.',ctaButton:'WhatsApp\'tan İletişime Geç',message:'Merhaba RocketPen Digital, şu içerikten geliyorum:'},
      en:{float:'Chat on WhatsApp',ctaTitle:'Let’s grow your project.',ctaText:'Tell us what you need and let’s find the right next step for your business.',ctaButton:'Talk to Us on WhatsApp',message:'Hello RocketPen Digital, I came from this article:'},
      ar:{float:'تواصل عبر واتساب',ctaTitle:'لنعمل على تطوير مشروعك.',ctaText:'أخبرنا بما تحتاج إليه لنحدد الخطوة الرقمية المناسبة لعملك.',ctaButton:'تواصل معنا عبر واتساب',message:'مرحبًا RocketPen Digital، وصلت من هذا المقال:'}
    };
    var t=copy[lang]||copy.en;
    var number='905050796577';
    var title=(document.querySelector('h1')||document.querySelector('title'));
    title=title?(title.textContent||'').trim():document.title;
    var message=t.message+' '+title+' — '+window.location.href;
    var href='https://wa.me/'+number+'?text='+encodeURIComponent(message);
    var style=document.createElement('style');
    style.id='rp-whatsapp-style';
    style.textContent=
      '#rp-whatsapp-float{position:fixed;z-index:2147483000;right:20px;bottom:22px;display:flex;align-items:center;gap:10px;min-height:52px;padding:0 17px;border-radius:999px;background:#25D366;color:#062b16;border:1px solid rgba(255,255,255,.3);box-shadow:0 8px 28px rgba(0,0,0,.3);font:700 13px/1.2 system-ui,-apple-system,sans-serif;text-decoration:none;transition:transform .2s,box-shadow .2s}'+
      '#rp-whatsapp-float:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,.36)}'+
      '#rp-whatsapp-float svg{width:24px;height:24px;flex:0 0 24px;fill:currentColor}'+
      '.rp-whatsapp-cta{display:inline-flex;align-items:center;justify-content:center;gap:9px;margin-top:12px;padding:13px 18px;border:1px solid #25D366;border-radius:4px;background:#25D366;color:#062b16!important;font-weight:700;text-decoration:none!important;line-height:1.4}'+
      '.rp-whatsapp-cta:hover{filter:brightness(.94)}'+
      '.rp-blog-whatsapp-panel{position:relative;isolation:isolate;margin:42px 0;padding:clamp(22px,4vw,38px);border:1px solid rgba(255,255,255,.16);border-radius:8px;background:linear-gradient(135deg,rgba(37,211,102,.12),rgba(255,255,255,.025));color:inherit}'+
      '.rp-blog-whatsapp-panel h2{margin:0 0 12px;font-size:clamp(22px,3vw,32px);line-height:1.2}'+
      '.rp-blog-whatsapp-panel p{max-width:680px;line-height:1.75;opacity:.84}'+
      'html[dir="rtl"] #rp-whatsapp-float{right:auto;left:20px}'+
      '@media(max-width:600px){#rp-whatsapp-float{right:12px;bottom:14px;min-height:48px;padding:0 13px;font-size:12px;gap:8px}html[dir="rtl"] #rp-whatsapp-float{right:auto;left:12px}.rp-blog-whatsapp-panel{margin:28px 0}}'+
      '@media(prefers-reduced-motion:reduce){#rp-whatsapp-float{transition:none}}';
    document.head.appendChild(style);
    var icon='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.04 3C8.86 3 3.02 8.82 3.02 15.98c0 2.29.61 4.52 1.77 6.48L3 29l6.73-1.76a13.1 13.1 0 0 0 6.3 1.61h.01c7.17 0 13.01-5.82 13.01-12.98A12.9 12.9 0 0 0 25.22 6.7 12.9 12.9 0 0 0 16.04 3zm0 23.63h-.01c-1.96 0-3.88-.52-5.55-1.52l-.4-.24-3.99 1.04 1.07-3.88-.26-.42a10.7 10.7 0 0 1-1.64-5.63c0-5.93 4.84-10.76 10.79-10.76 2.88 0 5.59 1.12 7.62 3.15a10.68 10.68 0 0 1 3.16 7.61c0 5.93-4.84 10.65-10.79 10.65zm5.91-8.05c-.32-.16-1.9-.94-2.2-1.05-.3-.11-.51-.16-.73.16-.21.32-.84 1.05-1.03 1.27-.19.21-.38.24-.7.08-.32-.16-1.35-.5-2.57-1.59-.95-.84-1.59-1.88-1.78-2.2-.19-.32-.02-.49.14-.65.14-.14.32-.38.49-.57.16-.19.21-.32.32-.54.11-.21.05-.4-.03-.57-.08-.16-.73-1.75-1-2.4-.26-.62-.53-.54-.73-.55h-.62c-.21 0-.57.08-.86.4-.3.32-1.13 1.1-1.13 2.69s1.16 3.12 1.32 3.34c.16.21 2.28 3.48 5.53 4.88.77.33 1.37.53 1.84.68.77.24 1.47.21 2.02.13.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.3-.21-.62-.38z"/></svg>';
    var floating=document.createElement('a');
    floating.id='rp-whatsapp-float';
    floating.href=href;floating.target='_blank';floating.rel='noopener noreferrer';
    floating.setAttribute('aria-label',t.float+' — RocketPen Digital');
    floating.innerHTML=icon+'<span>'+t.float+'</span>';
    document.body.appendChild(floating);
    function track(placement){
      var payload={language:lang,page_path:window.location.pathname,page_title:title,placement:placement};
      if(typeof window.fbq==='function')window.fbq('trackCustom','WhatsAppClick',payload);
      window.dataLayer=window.dataLayer||[];
      window.dataLayer.push(Object.assign({event:'whatsapp_click'},payload));
    }
    floating.addEventListener('click',function(){track('floating');});
    var panel=document.createElement('section');
    panel.className='rp-blog-whatsapp-panel';
    panel.setAttribute('aria-label',t.ctaTitle);
    panel.innerHTML='<h2></h2><p></p><a class="rp-whatsapp-cta" target="_blank" rel="noopener noreferrer"></a>';
    panel.querySelector('h2').textContent=t.ctaTitle;
    panel.querySelector('p').textContent=t.ctaText;
    var cta=panel.querySelector('a');
    cta.href=href;cta.innerHTML=icon+'<span></span>';cta.querySelector('span').textContent=t.ctaButton;
    cta.addEventListener('click',function(){track('article_end');});
    var existing=document.querySelector('.cta');
    var article=document.querySelector('main article, article');
    if(existing){
      if(!existing.querySelector('.rp-whatsapp-cta'))existing.appendChild(cta.cloneNode(true));
      var existingLink=existing.querySelector('.rp-whatsapp-cta');
      if(existingLink){existingLink.href=href;existingLink.target='_blank';existingLink.rel='noopener noreferrer';existingLink.textContent=t.ctaButton;existingLink.addEventListener('click',function(){track('article_end');});}
    }else if(article){
      article.appendChild(panel);
    }else{
      var footer=document.querySelector('footer');
      if(footer&&footer.parentNode)footer.parentNode.insertBefore(panel,footer);
      else document.body.appendChild(panel);
    }
  })();

  var bar=document.querySelector('.scroll-progress');
  if(!bar)return;
  var fill=bar.querySelector('span');
  if(!fill){fill=document.createElement('span');bar.appendChild(fill);}
  var update=function(){
    var root=document.documentElement;
    var max=Math.max(0,root.scrollHeight-window.innerHeight);
    var ratio=max>0?Math.min(1,Math.max(0,window.scrollY/max)):0;
    fill.style.width=(ratio*100)+'%';
  };
  window.addEventListener('scroll',update,{passive:true});
  window.addEventListener('resize',update);
  window.addEventListener('load',update);
  if('ResizeObserver' in window){try{new ResizeObserver(update).observe(document.documentElement);}catch(e){}}
  update();
})();