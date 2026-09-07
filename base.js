/* ============================================================
   base.js · 数字花园共享脚本：日夜切换 + 入场动效
   页面默认观察 .rv；如需扩展，在 <body> 上加 data-rv=".rv,.sec-head"
   ============================================================ */
(function(){
  var saved=localStorage.getItem('theme');
  if(saved)document.documentElement.setAttribute('data-theme',saved);
  var tt=document.getElementById('themeToggle');
  if(tt)tt.addEventListener('click',function(){
    var cur=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',cur);
    localStorage.setItem('theme',cur);
  });
})();
(function(){
  var sel=document.body.getAttribute('data-rv')||'.rv';
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
  },{threshold:.12});
  document.querySelectorAll(sel).forEach(function(el){io.observe(el);});
})();
