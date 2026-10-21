/* Shared language dropdown and reading progress for static content pages. */
(function(){
  'use strict';
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