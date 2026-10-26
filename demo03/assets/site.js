(() => {
  "use strict";
  const translations = window.MIRA_TRANSLATIONS || {};
  const rtlLanguages = new Set(window.MIRA_RTL_LANGUAGES || ["ar","fa"]);
  const select = document.getElementById("language-select");
  const menu = document.getElementById("primary-navigation");
  const menuButton = document.getElementById("menu-toggle");
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const page = document.body.dataset.page || "home";
  const tr = () => translations[document.documentElement.lang] || translations.tr || {};

  function safeStoreGet(key) { try { return window.localStorage.getItem(key); } catch (_) { return null; } }
  function safeStoreSet(key,value) { try { window.localStorage.setItem(key,value); } catch (_) {} }

  function setLanguage(code) {
    const lang = Object.prototype.hasOwnProperty.call(translations,code) ? code : "tr";
    const dictionary = translations[lang] || translations.tr || {};
    document.documentElement.lang = lang;
    document.documentElement.dir = rtlLanguages.has(lang) ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.dataset.i18n;
      if (Object.prototype.hasOwnProperty.call(dictionary,key)) el.textContent = dictionary[key];
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(el => {
      const key = el.dataset.i18nAria;
      if (Object.prototype.hasOwnProperty.call(dictionary,key)) el.setAttribute("aria-label",dictionary[key]);
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(el => {
      const key = el.dataset.i18nAlt;
      if (Object.prototype.hasOwnProperty.call(dictionary,key)) el.setAttribute("alt",dictionary[key]);
    });
    if (select) {
      select.value = lang;
      select.setAttribute("aria-label",dictionary.languageSelect || "Choose language");
    }
    document.querySelectorAll("[data-set-lang]").forEach(el => {
      const active = el.dataset.setLang === lang;
      el.classList.toggle("is-active",active);
      if (el.classList.contains("language-chip")) el.setAttribute("aria-pressed",String(active));
    });
    if (menuButton) menuButton.setAttribute("aria-label",dictionary[menuButton.getAttribute("aria-expanded")==="true"?"menuClose":"menuOpen"] || "Menu");
    safeStoreSet("mira-demo-language",lang);
    updateSliderControls();
    document.documentElement.dataset.language = lang;
  }

  if (select) select.addEventListener("change",event=>setLanguage(event.target.value));
  document.querySelectorAll("[data-set-lang]").forEach(el=>el.addEventListener("click",()=>setLanguage(el.dataset.setLang)));

  function closeMenu(returnFocus=false) {
    if (!menu || !menuButton) return;
    menu.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded","false");
    menuButton.setAttribute("aria-label",tr().menuOpen || "Open menu");
    if (returnFocus) menuButton.focus();
  }
  if (menu && menuButton) {
    menuButton.addEventListener("click",()=>{
      const open = menuButton.getAttribute("aria-expanded") !== "true";
      menu.classList.toggle("is-open",open);
      menuButton.setAttribute("aria-expanded",String(open));
      menuButton.setAttribute("aria-label",tr()[open?"menuClose":"menuOpen"] || (open?"Close menu":"Open menu"));
    });
    menu.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>closeMenu(false)));
    document.addEventListener("keydown",event=>{ if(event.key==="Escape" && menuButton.getAttribute("aria-expanded")==="true") closeMenu(true); });
    document.addEventListener("click",event=>{ if(menuButton.getAttribute("aria-expanded")==="true" && !event.target.closest(".header-inner")) closeMenu(false); });
  }
  document.querySelectorAll("[data-nav-link]").forEach(link=>{
    if(link.dataset.navLink===page) link.setAttribute("aria-current","page");
    else link.removeAttribute("aria-current");
  });

  const slider = document.querySelector("[data-slider]");
  const slides = slider ? Array.from(slider.querySelectorAll(".slide")) : [];
  const dots = slider ? Array.from(slider.querySelectorAll(".slide-dot")) : [];
  const pauseButton = slider ? slider.querySelector("[data-slider-pause]") : null;
  let current = 0, timer = null, paused = reduceMotion;
  function stopTimer(){ if(timer!==null){window.clearInterval(timer);timer=null;} }
  function updateSliderControls(){
    if(!slider) return;
    dots.forEach((dot,index)=>{
      dot.setAttribute("aria-pressed",String(index===current));
      const key="slide"+(index+1)+"Aria";
      if(tr()[key]) dot.setAttribute("aria-label",tr()[key]);
    });
    if(pauseButton){
      pauseButton.textContent=paused?"▶":"Ⅱ";
      pauseButton.setAttribute("aria-pressed",String(paused));
      pauseButton.setAttribute("aria-label",tr()[paused?"sliderPlay":"sliderPause"] || (paused?"Play slides":"Pause slides"));
    }
  }
  function showSlide(index){
    if(!slides.length) return;
    current=(index+slides.length)%slides.length;
    slides.forEach((slide,i)=>{
      const active=i===current;
      slide.classList.toggle("is-active",active);
      slide.setAttribute("aria-hidden",String(!active));
      slide.querySelectorAll("a,button").forEach(el=>{el.tabIndex=active?0:-1;});
    });
    updateSliderControls();
  }
  function startTimer(){
    stopTimer();
    if(paused||reduceMotion||slides.length<2) return;
    timer=window.setInterval(()=>showSlide(current+1),7000);
  }
  dots.forEach((dot,index)=>dot.addEventListener("click",()=>{showSlide(index);startTimer();}));
  if(pauseButton) pauseButton.addEventListener("click",()=>{paused=!paused;if(paused)stopTimer();else startTimer();updateSliderControls();});
  if(slider){
    slider.addEventListener("mouseenter",stopTimer);
    slider.addEventListener("mouseleave",startTimer);
    slider.addEventListener("focusin",stopTimer);
    slider.addEventListener("focusout",event=>{if(!slider.contains(event.relatedTarget))startTimer();});
    showSlide(0);startTimer();
  }

  document.querySelectorAll("[data-article-toggle]").forEach(button=>button.addEventListener("click",()=>{
    const panel=document.getElementById(button.dataset.articleToggle);
    if(!panel) return;
    const open=button.getAttribute("aria-expanded")!=="true";
    panel.hidden=!open;
    button.setAttribute("aria-expanded",String(open));
    const key=open?"readLess":"readMore";
    const label=button.querySelector("[data-i18n]");
    if(label) label.textContent=tr()[key] || key;
    const icon=button.querySelector("[data-toggle-icon]");
    if(icon) icon.textContent=open?"−":"＋";
  }));

  const progress=document.querySelector(".progress span");
  if(progress){
    let ticking=false;
    window.addEventListener("scroll",()=>{
      if(ticking)return;ticking=true;
      window.requestAnimationFrame(()=>{
        const max=document.documentElement.scrollHeight-window.innerHeight;
        progress.style.transform="scaleX("+Math.max(0,Math.min(1,max>0?window.scrollY/max:0))+")";
        ticking=false;
      });
    },{passive:true});
  }
  const year=document.getElementById("year");
  if(year) year.textContent=String(new Date().getFullYear());
  const saved=safeStoreGet("mira-demo-language");
  setLanguage(saved && translations[saved] ? saved : "tr");
})();