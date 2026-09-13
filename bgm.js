/* ============================================================
   bgm.js · 数字花园背景音乐（全站共享，单曲循环）
   - 音源：assets/bgm.mp3（未就位时本模块自动隐藏，不报错）
   - 位置：页头「马」印章右侧
   - 播放策略：载入即尝试播放；被浏览器拦截时，首次点击/触碰页面任意处自动开始
   - 记忆：每台设备记住暂停/播放偏好（localStorage bgm_pref）
   - 观（jing.html）刻意不引入——那一页属于静止
   ============================================================ */
(function(){
  if(document.querySelector('.bgm-btn'))return;
  var pref;
  try{pref=localStorage.getItem('bgm_pref')||'on';}catch(e){pref='on';}

  /* 样式（自包含，避免逐页复制 CSS） */
  var style=document.createElement('style');
  style.textContent=[
    '.bgm-btn{width:26px;height:26px;background:none;border:none;cursor:pointer;',
    '  padding:0;color:var(--ink);opacity:.55;transition:opacity .4s;flex:none}',
    '.bgm-btn:hover{opacity:1}',
    '.bgm-btn svg{display:block;width:100%;height:100%;overflow:visible}',
    '.bgm-btn .ring{fill:none;stroke:currentColor;stroke-width:1;opacity:.5}',
    '.bgm-btn .odot{fill:currentColor;transition:opacity .4s}',
    '.bgm-btn .orbit{transform-origin:13px 13px}',
    '.bgm-btn.playing .orbit{animation:bgm-orbit 7s linear infinite}',
    '.bgm-btn.playing .odot{opacity:1}',
    '.bgm-btn:not(.playing) .odot{opacity:.22}',
    '@keyframes bgm-orbit{to{transform:rotate(360deg)}}'
  ].join('');
  document.head.appendChild(style);

  /* 音频 */
  var audio=new Audio('assets/bgm.mp3');
  audio.loop=true;audio.preload='auto';audio.volume=0.55;

  /* 按钮：插入「马」印章右侧 */
  var btn=document.createElement('button');
  btn.className='bgm-btn';btn.type='button';
  btn.title='背景音乐 · 点击暂停/播放';
  btn.setAttribute('aria-label','背景音乐');
  btn.innerHTML='<svg viewBox="0 0 26 26" aria-hidden="true">'
    +'<circle class="ring" cx="13" cy="13" r="10"/>'
    +'<g class="orbit"><circle class="odot" cx="13" cy="3" r="2"/></g>'
    +'</svg>';
  var brand=document.querySelector('header .brand');
  if(!brand)return;
  brand.insertAdjacentElement('afterend',btn);

  function start(){
    audio.play().then(function(){
      document.removeEventListener('pointerdown',kick);
      document.removeEventListener('keydown',kick);
      document.removeEventListener('touchstart',kick);
    }).catch(function(){/* 等待首次交互 */});
  }
  function kick(){ if(pref==='on'&&audio.paused)start(); }

  audio.addEventListener('play',function(){btn.classList.add('playing');});
  audio.addEventListener('pause',function(){btn.classList.remove('playing');});
  /* 音源未就位（404/解码失败）：整个按钮移除，页面不留坏图标 */
  audio.addEventListener('error',function(){btn.remove();});

  btn.addEventListener('click',function(){
    if(audio.paused){
      pref='on';try{localStorage.setItem('bgm_pref','on');}catch(e){}
      start();
    }else{
      pref='off';try{localStorage.setItem('bgm_pref','off');}catch(e){}
      audio.pause();
    }
  });

  if(pref==='on'){
    start();
    /* 自动播放被拦截：任意首次交互即开声 */
    document.addEventListener('pointerdown',kick);
    document.addEventListener('keydown',kick);
    document.addEventListener('touchstart',kick,{passive:true});
  }
})();
