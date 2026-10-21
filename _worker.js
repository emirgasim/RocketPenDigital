export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (request.method === "HEAD" || !response.headers.get("content-type")?.toLowerCase().includes("text/html")) return response;

    let html = await response.text();
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const isEnglishHome = path === "/" || path === "/index.html";

    function pageLanguage() {
      if (/^\/(?:blog\/tr|languages\/tr)(?:\/|\.html|$)/i.test(path)) return "tr";
      if (/^\/(?:blog\/ar|languages\/ar)(?:\/|\.html|$)/i.test(path)) return "ar";
      const match = html.match(/<html\b[^>]*\blang=["']([^"']+)/i);
      const value = match ? match[1].toLowerCase().slice(0, 2) : "en";
      return value === "tr" || value === "ar" ? value : "en";
    }

    const lang = pageLanguage();
    const code = lang === "tr" ? "TR" : lang === "ar" ? "AR" : "EN";
    const label = lang === "tr" ? "DİL" : lang === "ar" ? "اللغة" : "LANGUAGE";
    const homeHref = lang === "tr" ? "/languages/tr.html#home" : lang === "ar" ? "/languages/ar.html#home" : "/#home";
    const globalHeader =
      '<header class="rp-global-header" aria-label="RocketPen Digital Studio">' +
      '<a href="' + homeHref + '" class="rp-global-brand" aria-label="RocketPen Digital Studio"><img class="rp-global-logo" src="/asset/logo/logo-header.png" alt="RocketPen Digital Studio"></a>' +
      '<div class="rp-global-nav-right"><div class="rp-global-language-picker" id="rpLanguagePicker">' +
      '<button class="rp-global-lang" id="rpLangButton" type="button" aria-label="' + label + '" aria-expanded="false" aria-controls="rpLanguageMenu">' +
      '<span class="rp-global-lang-globe" aria-hidden="true">◎</span><span class="rp-global-lang-code">' + code + '</span><span class="rp-global-lang-label">' + label + '</span><span class="rp-global-lang-chevron" aria-hidden="true"></span></button>' +
      '<div class="rp-global-language-menu" id="rpLanguageMenu" role="menu" aria-label="' + label + '">' +
      '<a href="/" class="rp-global-language-option" role="menuitem" data-lang="en"' + (lang === "en" ? ' aria-current="page"' : '') + '><span class="rp-global-language-option-code">EN</span><span class="rp-global-language-option-name">English</span><span class="rp-global-language-check">✓</span></a>' +
      '<a href="/languages/tr.html" class="rp-global-language-option" role="menuitem" data-lang="tr"' + (lang === "tr" ? ' aria-current="page"' : '') + '><span class="rp-global-language-option-code">TR</span><span class="rp-global-language-option-name">Türkçe</span><span class="rp-global-language-check">✓</span></a>' +
      '<a href="/languages/ar.html" class="rp-global-language-option" role="menuitem" data-lang="ar"' + (lang === "ar" ? ' aria-current="page"' : '') + '><span class="rp-global-language-option-code">AR</span><span class="rp-global-language-option-name">العربية</span><span class="rp-global-language-check">✓</span></a>' +
      '</div></div></div></header>';

    const globalCss = [
      '.scroll-progress{position:fixed!important;z-index:2147483647!important;top:0!important;left:0!important;right:0!important;width:100%!important;height:3px!important;background:rgba(255,255,255,.12)!important;pointer-events:none!important;overflow:hidden!important;isolation:isolate!important}',
      '.scroll-progress span{display:block!important;width:0;height:100%;background:var(--yellow,#ffeb00)!important;box-shadow:0 0 8px rgba(255,235,0,.28)!important;transition:width .08s linear!important}',
      '.rp-global-header{position:sticky;top:0;left:0;right:0;z-index:2147483000;width:100%;box-sizing:border-box;padding:24px clamp(22px,5vw,80px);display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid rgba(255,255,255,.12);background:rgba(8,10,15,.92);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);color:#fff}',
      '.rp-global-header *{box-sizing:border-box}',
      '.rp-global-brand{display:block;flex:0 1 auto;min-width:0;text-decoration:none;line-height:0}',
      '.rp-global-logo{display:block;width:clamp(210px,24vw,320px);height:auto;max-height:76px;object-fit:contain;object-position:left center}',
      '.rp-global-nav-right{display:flex;align-items:center;gap:28px;flex:0 0 auto}',
      '.rp-global-language-picker{position:relative;z-index:50}',
      '.rp-global-lang{display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.045);color:#fff;border:1px solid rgba(255,255,255,.24);padding:10px 13px;border-radius:4px;font:inherit;font-size:11px;letter-spacing:1.1px;cursor:pointer;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:inset 0 1px rgba(255,255,255,.06);transition:background .25s ease,border-color .25s ease,transform .25s ease}',
      '.rp-global-lang-globe{font-size:17px;line-height:1;color:var(--yellow,#ffeb00);font-family:inherit}',
      '.rp-global-lang-code{font-weight:700;letter-spacing:1.4px}',
      '.rp-global-lang-label{font-size:8px;letter-spacing:1.4px;color:#aeb3bd;border-left:1px solid rgba(255,255,255,.18);padding-left:9px;white-space:nowrap}',
      '.rp-global-lang-chevron{width:7px;height:7px;flex:0 0 7px;border-right:1px solid var(--yellow,#ffeb00);border-bottom:1px solid var(--yellow,#ffeb00);transform:rotate(45deg) translateY(-2px);margin-left:2px;transition:transform .25s ease}',
      '.rp-global-lang:hover .rp-global-lang-chevron,.rp-global-language-picker.is-open .rp-global-lang-chevron{transform:rotate(225deg) translate(-2px,-1px)}',
      '.rp-global-lang:hover{background:rgba(255,235,0,.07);border-color:rgba(255,235,0,.6);color:#fff;transform:translateY(-1px)}',
      '.rp-global-lang:focus-visible{outline:2px solid var(--yellow,#ffeb00);outline-offset:4px}',
      '.rp-global-language-menu{position:absolute;top:calc(100% + 12px);right:0;width:190px;padding:7px;background:rgba(12,15,21,.97);border:1px solid rgba(255,255,255,.16);border-radius:8px;box-shadow:0 18px 55px rgba(0,0,0,.42),inset 0 1px rgba(255,255,255,.05);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-9px) scale(.97);transform-origin:top right;transition:opacity .22s ease,transform .28s cubic-bezier(.2,.8,.2,1),visibility .22s}',
      '.rp-global-language-picker.is-open .rp-global-language-menu{opacity:1;visibility:visible;pointer-events:auto;transform:translateY(0) scale(1)}',
      '.rp-global-language-option{display:grid;grid-template-columns:34px 1fr 14px;gap:9px;align-items:center;width:100%;padding:12px 10px;color:#f7f7f5;background:transparent;border:0;border-radius:4px;text-align:left;text-decoration:none;cursor:pointer;transition:background .2s ease,color .2s ease,transform .2s ease}',
      '.rp-global-language-option:hover,.rp-global-language-option:focus-visible{background:rgba(255,235,0,.09);outline:none;color:#fff;transform:translateX(2px)}',
      '.rp-global-language-option-code{font-size:11px;font-weight:700;font-family:inherit;letter-spacing:1px;color:var(--yellow,#ffeb00)}',
      '.rp-global-language-option-name{font-size:12px;color:#d7dae0}',
      '.rp-global-language-check{font-size:13px;color:var(--yellow,#ffeb00);opacity:0;transform:scale(.6);transition:opacity .2s ease,transform .2s ease}',
      '.rp-global-language-option[aria-current="page"]{background:rgba(255,235,0,.055)}',
      '.rp-global-language-option[aria-current="page"] .rp-global-language-check{opacity:1;transform:scale(1)}',
      '.rp-global-language-option[aria-current="page"] .rp-global-language-option-name{color:#fff}',
      '@media(max-width:640px){.rp-global-header{padding:18px clamp(16px,4vw,24px);gap:12px}.rp-global-logo{width:clamp(150px,54vw,235px);max-height:48px}.rp-global-lang{padding:9px 10px;gap:7px}.rp-global-lang-label{font-size:7px;letter-spacing:1px;padding-left:7px}.rp-global-language-menu{width:180px}}',
      '@media(prefers-reduced-motion:reduce){.rp-global-lang,.rp-global-lang-chevron,.rp-global-language-menu,.rp-global-language-option,.scroll-progress span{transition:none!important}}'
    ].join('\n');

    if (!isEnglishHome) {
      const topbarPattern = /<header\b(?=[^>]*\bclass\s*=\s*["'][^"']*(?:top|nav|header)[^"']*["'])[^>]*>[\s\S]*?<\/header>/i;
      if (topbarPattern.test(html)) html = html.replace(topbarPattern, globalHeader);
      else {
        const firstHeaderPattern = /<header\b[^>]*>[\s\S]*?<\/header>/i;
        if (firstHeaderPattern.test(html) && html.indexOf("<header") < (html.indexOf("<main") < 0 ? 12000 : html.indexOf("<main"))) html = html.replace(firstHeaderPattern, globalHeader);
        else if (/<body\b[^>]*>/i.test(html)) html = html.replace(/<body\b[^>]*>/i, function(match) { return match + globalHeader; });
      }
    }

    if (!/class=["'][^"']*\bscroll-progress\b/i.test(html)) {
      html = html.replace(/<body\b[^>]*>/i, function(match) {
        return match + '<div class="scroll-progress" aria-hidden="true"><span id="scrollProgress"></span></div>';
      });
    }

    if (!html.includes('id="rp-global-ui-style"')) {
      const styleTag = '<style id="rp-global-ui-style">' + globalCss + '</style>';
      if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, styleTag + '</head>');
      else html = styleTag + html;
    }

    const globalScript = '(function(){' +
      'var picker=document.getElementById("rpLanguagePicker"),button=document.getElementById("rpLangButton"),menu=document.getElementById("rpLanguageMenu");' +
      'if(picker&&button&&menu){' +
        'var closeMenu=function(){picker.classList.remove("is-open");button.setAttribute("aria-expanded","false");};' +
        'button.addEventListener("click",function(event){event.preventDefault();event.stopPropagation();var opening=button.getAttribute("aria-expanded")!=="true";picker.classList.toggle("is-open",opening);button.setAttribute("aria-expanded",opening?"true":"false");});' +
        'document.addEventListener("click",function(event){if(!picker.contains(event.target))closeMenu();});' +
        'document.addEventListener("keydown",function(event){if(event.key==="Escape"&&picker.classList.contains("is-open")){closeMenu();button.focus();}if(picker.classList.contains("is-open")&&(event.key==="ArrowDown"||event.key==="ArrowUp")){var options=Array.prototype.slice.call(menu.querySelectorAll("[data-lang]"));if(!options.length)return;event.preventDefault();var index=options.indexOf(document.activeElement);index=event.key==="ArrowDown"?(index+1+options.length)%options.length:(index-1+options.length)%options.length;options[index].focus();}});' +
      '}' +
      'var bar=document.querySelector(".scroll-progress");if(!bar)return;var fill=bar.querySelector("span");if(!fill){fill=document.createElement("span");bar.appendChild(fill);}' +
      'var update=function(){var root=document.documentElement;var max=Math.max(0,root.scrollHeight-window.innerHeight);var ratio=max>0?Math.min(1,Math.max(0,window.scrollY/max)):0;fill.style.width=(ratio*100)+"%";};' +
      'window.addEventListener("scroll",update,{passive:true});window.addEventListener("resize",update);window.addEventListener("load",update);if("ResizeObserver" in window){try{new ResizeObserver(update).observe(document.documentElement);}catch(e){}}update();' +
    '})();';

    if (!html.includes('id="rp-global-ui-script"')) {
      const scriptTag = '<script id="rp-global-ui-script">' + globalScript + '</script>';
      if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, scriptTag + '</body>');
      else html += scriptTag;
    }

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.delete("etag");
    headers.delete("last-modified");
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
  }
};