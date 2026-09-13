/* ============================================================
   bgm.js · 数字花园背景音乐（全站共享，单曲循环，跨页续播）
   - 音源：assets/bgm.mp3（未就位时本模块自动隐藏，不报错）
   - 位置：页头右上，日夜切换太极钮左侧（含音符提示符）
   - 播放策略：进入网站不自动播放——用户点击 ♪ 按钮后才开始；
     之后站内换页自动接续上一进度，无需再点
   - 跨页续播：换页前把播放进度存 sessionStorage，新页面从同一位置继续——
     站内漫游听感接近连续；同 URL 音频已被浏览器缓存，续播几乎即时
   - 观（jing.html）刻意不引入——那一页属于静止
   ============================================================ */
(function(){
  if(document.querySelector('.bgm-btn'))return;

  /* 样式（自包含，避免逐页复制 CSS） */
  var style=document.createElement('style');
  style.textContent=[
    '.bgm-btn{display:flex;align-items:center;gap:8px;background:none;border:none;cursor:pointer;',
    '  padding:0;color:var(--ink);opacity:.6;transition:opacity .4s;flex:none;margin-left:48px;margin-right:28px}',
    '.bgm-btn:hover{opacity:1}',
    '.bgm-btn .note{font-family:var(--sans);font-size:13px;line-height:1;opacity:.55;',
    '  transform:translateY(-1px)}',
    '.bgm-btn.playing .note{opacity:.9}',
    '.bgm-btn svg{display:block;width:22px;height:22px;overflow:visible}',
    '.bgm-btn .ring{fill:none;stroke:currentColor;stroke-width:1;opacity:.5}',
    '.bgm-btn .odot{fill:currentColor;transition:opacity .4s}',
    '.bgm-btn .orbit{transform-origin:11px 11px}',
    '.bgm-btn.playing .orbit{animation:bgm-orbit 7s linear infinite}',
    '.bgm-btn.playing .odot{opacity:1}',
    '.bgm-btn:not(.playing) .odot{opacity:.22}',
    '@keyframes bgm-orbit{to{transform:rotate(360deg)}}'
  ].join('');
  document.head.appendChild(style);

  /* 音频 */
  var audio=new Audio('assets/bgm.mp3');
  audio.loop=true;audio.preload='auto';audio.volume=0.55;

  /* 跨页续播：换页/隐藏前存进度；新页面恢复到同一位置再继续 */
  function saveTime(){
    try{if(audio.currentTime>0)sessionStorage.setItem('bgm_time',String(audio.currentTime));}catch(e){}
  }
  window.addEventListener('pagehide',saveTime);
  window.addEventListener('beforeunload',saveTime);
  document.addEventListener('visibilitychange',function(){if(document.hidden)saveTime();});

  /* 进度恢复：三重保险（元数据就绪时 / 开始播放时 / 播放事件中），只恢复一次 */
  var restored=false;
  function restoreTime(){
    if(restored)return;
    try{
      var st=parseFloat(sessionStorage.getItem('bgm_time')||'0');
      if(st>1){
        if(audio.duration&&st>audio.duration-2){audio.currentTime=0;}
        else{audio.currentTime=st;}
      }
      restored=true;
    }catch(e){}
  }
  try{
    var st0=parseFloat(sessionStorage.getItem('bgm_time')||'0');
    if(st0>1)audio.currentTime=st0;
  }catch(e){}
  audio.addEventListener('loadedmetadata',restoreTime);
  audio.addEventListener('playing',restoreTime);

  /* 按钮：音符 + 圆环，插入太极日夜钮左侧 */
  var btn=document.createElement('button');
  btn.className='bgm-btn';btn.type='button';
  btn.title='背景音乐 · 点击播放/暂停';
  btn.setAttribute('aria-label','背景音乐');
  btn.innerHTML='<span class="note" aria-hidden="true">♪</span>'
    +'<svg viewBox="0 0 22 22" aria-hidden="true">'
    +'<circle class="ring" cx="11" cy="11" r="8.5"/>'
    +'<g class="orbit"><circle class="odot" cx="11" cy="2.5" r="1.8"/></g>'
    +'</svg>';
  var hdr=document.querySelector('header');
  var taiji=hdr?hdr.querySelector('.taiji'):null;
  if(hdr&&taiji){hdr.insertBefore(btn,taiji);}
  else if(hdr){hdr.appendChild(btn);}
  else{return;}

  /* 站内已开播（本次标签页内点过播放）：换页后自动接续 */
  var started=false;
  try{started=sessionStorage.getItem('bgm_started')==='1';}catch(e){}

  function start(){
    audio.play().then(function(){
      restoreTime();
      try{sessionStorage.setItem('bgm_started','1');}catch(e){}
    }).catch(function(){/* 需要用户手势 */});
  }

  audio.addEventListener('play',function(){btn.classList.add('playing');});
  audio.addEventListener('pause',function(){btn.classList.remove('playing');});
  /* 音源未就位（404/解码失败）：整个按钮移除，页面不留坏图标 */
  audio.addEventListener('error',function(){btn.remove();});

  /* 唯一的播放入口：点击 ♪ 按钮。进入网站不自动播放 */
  btn.addEventListener('click',function(){
    if(audio.paused){start();}
    else{audio.pause();}
  });

  /* 本次标签页内已经播过 → 换页回来自动接续；首次进入保持安静 */
  if(started){start();}
})();
