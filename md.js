/* ============================================================
   md.js · 数字花园迷你 Markdown 渲染器 v2
   原则：先整体转义再加工，绝不放行裸 HTML；核心零依赖。
   支持：# 标题 / > 引用 / - 列表(含一层嵌套) / 1. 有序列表 / ``` 代码块
        | GFM 表格 | ![图片] | **粗** *斜* ***粗斜*** ~~删除~~ `行内码`
        [链接](url) <自动链接> - [ ] 任务列表 --- 分隔线
   mermaid：```mermaid 块输出占位符，MD.hydrate(容器) 按需懒加载
        CDN 渲染；失败/离线自动降级为代码块。日夜切换自动重绘。
   跳过（发布系统用不上）：脚注 / 定义列表 / 标题编号
   ============================================================ */
var MD=(function(){
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

  /* 安全 URL：只放行站内相对路径与 http(s) */
  function safeUrl(u){
    return /^(https?:\/\/|mailto:|#|\.\/|\/|(?:notes|article|now|review|review-edit|research|projects|about|jing|write)\.html(?:[?#]|$))/i.test(u);
  }

  /* 行内加工（输入已转义）。顺序：码 → 粗斜 → 粗 → 斜 → 删除 → 图 → 链接 → 自动链接 */
  function inline(s){
    return s
      .replace(/`([^`]+)`/g,'<code>$1</code>')
      .replace(/\*\*\*([^*]+)\*\*\*/g,'<strong><em>$1</em></strong>')
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g,'<em>$1</em>')
      .replace(/~~([^~]+)~~/g,'<del>$1</del>')
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,function(m,alt,u){
        if(!safeUrl(u))return alt||'';
        return '<img class="md-img" src="'+u+'" alt="'+alt+'" loading="lazy">';
      })
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,function(m,t,u){
        if(!safeUrl(u))return t;
        return '<a href="'+u+'">'+t+'</a>';
      })
      .replace(/&lt;(https?:\/\/[^&\s]+)&gt;/g,'<a href="$1">$1</a>');
  }

  /* 任务列表项：- [ ] / - [x] → 复选框（纯展示禁点） */
  function taskItem(txt){
    var m=/^\[( |x|X)\]\s+(.*)$/.exec(txt);
    if(!m)return null;
    return '<li class="md-task"><input type="checkbox" disabled'+(m[1].toLowerCase()==='x'?' checked':'')+'>'+inline(m[2])+'</li>';
  }

  /* GFM 表格：从 i 行起尝试解析，成功返回 {rows,head,align,next}，失败 null */
  function tryTable(lines,i){
    function cells(l){return l.replace(/^\s*\|/,'').replace(/\|\s*$/,'').split('|').map(function(c){return c.trim();});}
    if(!/^\s*\|.*\|\s*$/.test(lines[i]))return null;
    if(i+1>=lines.length||!/^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i+1])||!lines[i+1].match(/-/))return null;
    var head=cells(lines[i]);
    var align=cells(lines[i+1]).map(function(c){
      if(/^:.*:$/.test(c))return 'center';
      if(/:$/.test(c))return 'right';
      return 'left';
    });
    var rows=[],j=i+2;
    while(j<lines.length&&/^\s*\|.*\|\s*$/.test(lines[j])){rows.push(cells(lines[j]));j++;}
    return {head:head,align:align,rows:rows,next:j};
  }

  function tableHtml(t){
    var h='<thead><tr>'+t.head.map(function(c,k){
      return '<th style="text-align:'+t.align[k]+'">'+inline(c)+'</th>';}).join('')+'</tr></thead>';
    var b=t.rows.map(function(r){
      return '<tr>'+r.map(function(c,k){
        return '<td style="text-align:'+t.align[k]+'">'+inline(c)+'</td>';}).join('')+'</tr>';
    }).join('');
    return '<div class="md-twrap"><table>'+h+'<tbody>'+b+'</tbody></table></div>';
  }

  /* 列表（含一层嵌套）：块级收集 lines，返回 html */
  function listHtml(lines,i,ordered){
    var pat=ordered?/^\s*\d+\.\s+/:/^\s*[-*]\s+/;
    var sub=ordered?/^\s{2,}\d+\.\s+/:/^\s{2,}[-*]\s+/;
    var items=[],j=i;
    while(j<lines.length){
      var ln=lines[j];
      if(!pat.test(ln)&&!sub.test(ln))break;
      if(sub.test(ln)){
        /* 嵌套子项：挂到上一个父项 */
        if(items.length){
          items[items.length-1].sub.push(ln.replace(sub,''));
        }
        j++;continue;
      }
      items.push({txt:ln.replace(pat,''),sub:[]});j++;
    }
    var tag=ordered?'ol':'ul';
    var html=items.map(function(it){
      var task=ordered?null:taskItem(esc(it.txt));
      var main=task!==null?task:'<li>'+inline(esc(it.txt));
      if(task===null){
        if(it.sub.length){
          var stag=ordered?'ol':'ul';
          var subs=it.sub.map(function(s){
            var st=taskItem(esc(s));
            return st!==null?st:'<li>'+inline(esc(s))+'</li>';
          }).join('');
          main+='<'+stag+' class="md-sub">'+subs+'</'+stag+'>';
        }
        main+='</li>';
      }else{
        if(it.sub.length){
          var subs2=it.sub.map(function(s){return '<li>'+inline(esc(s))+'</li>';}).join('');
          main+='<ul class="md-sub">'+subs2+'</ul>';
        }
        main+='</li>';
      }
      return main;
    }).join('');
    return {html:'<'+tag+'>'+html+'</'+tag+'>',next:j};
  }

  function render(src){
    var lines=String(src||'').replace(/\r\n?/g,'\n').split('\n');
    var out=[],i=0,para=[];
    function flushPara(){ if(para.length){out.push('<p>'+inline(para.join('<br>'))+'</p>');para=[];} }

    while(i<lines.length){
      var ln=lines[i];

      /* 围栏代码块 / mermaid */
      var fence=/^```\s*(\S*)\s*$/.exec(ln);
      if(fence){
        flushPara();
        var buf=[],lang=(fence[1]||'').toLowerCase();i++;
        while(i<lines.length&&!/^```/.test(lines[i])){buf.push(lines[i]);i++;}
        i++;
        var code=esc(buf.join('\n'));
        if(lang==='mermaid'){
          /* 占位符：hydrate 时渲染；no-js / 降级时显示原码 */
          out.push('<div class="md-mermaid" data-src="'+code.replace(/"/g,'&quot;')+'">'
            +'<pre class="md-mermaid-fallback"><code>'+code+'</code></pre></div>');
        }else{
          out.push('<pre><code>'+code+'</code></pre>');
        }
        continue;
      }
      /* 表格 */
      var tb=tryTable(lines,i);
      if(tb){flushPara();out.push(tableHtml(tb));i=tb.next;continue;}
      /* 分隔线 */
      if(/^\s*(---+|\*\*\*+)\s*$/.test(ln)){flushPara();out.push('<hr>');i++;continue;}
      /* 标题：# → h1，## → h2（目录项），### → h3 */
      var h=/^(#{1,4})\s+(.*)$/.exec(ln);
      if(h){flushPara();out.push('<h'+h[1].length+'>'+inline(esc(h[2]))+'</h'+h[1].length+'>');i++;continue;}
      /* 引用 */
      if(/^>\s?/.test(ln)){
        flushPara();
        var q=[];
        while(i<lines.length&&/^>\s?/.test(lines[i])){q.push(lines[i].replace(/^>\s?/,''));i++;}
        out.push('<blockquote>'+q.map(function(x){return inline(esc(x));}).join('<br>')+'</blockquote>');
        continue;
      }
      /* 列表（无序/有序，含一层嵌套与任务项） */
      if(/^\s*[-*]\s+/.test(ln)){
        flushPara();
        var ul=listHtml(lines,i,false);
        out.push(ul.html);i=ul.next;continue;
      }
      if(/^\s*\d+\.\s+/.test(ln)){
        flushPara();
        var ol=listHtml(lines,i,true);
        out.push(ol.html);i=ol.next;continue;
      }
      /* 空行 → 断段 */
      if(/^\s*$/.test(ln)){flushPara();i++;continue;}
      para.push(esc(ln));i++;
    }
    flushPara();
    return out.join('\n');
  }

  /* ---------- mermaid 懒加载渲染 ----------
     状态：0 未加载 / 1 加载中 / 2 就绪 / -1 失败（永久降级） */
  var mmState=0,mmTheme=null;
  var mmQueue=[];
  function currentTheme(){
    return document.documentElement.getAttribute('data-theme')==='dark'?'dark':'default';
  }
  /* 花园水墨色系（base 主题+变量覆盖，亮暗两套） */
  function themeVars(t){
    return t==='dark'
      ?{primaryColor:'#2a2a26',primaryBorderColor:'#c8503a',primaryTextColor:'#e9e6de',
        lineColor:'#8a8578',secondaryColor:'#232320',tertiaryColor:'#20201d',
        mainBkg:'#2a2a26',nodeBorder:'#c8503a',clusterBkg:'#232320',edgeLabelBackground:'#232320',
        textColor:'#e9e6de',fontSize:'15px'}
      :{primaryColor:'#efe9db',primaryBorderColor:'#b0442f',primaryTextColor:'#2b2b28',
        lineColor:'#8a8578',secondaryColor:'#e6dfd0',tertiaryColor:'#f0ebdf',
        mainBkg:'#efe9db',nodeBorder:'#b0442f',clusterBkg:'#eae4d6',edgeLabelBackground:'#f7f4ec',
        textColor:'#2b2b28',fontSize:'15px'};
  }
  function loadMermaid(done){
    if(mmState===2){done(true);return;}
    if(mmState===-1){done(false);return;}
    mmQueue.push(done);
    if(mmState===1)return;
    mmState=1;mmTheme=currentTheme();
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    s.onload=function(){
      try{
        window.mermaid.initialize({startOnLoad:false,theme:'base',
          flowchart:{nodePadding:14,htmlLabels:true},
          themeVariables:themeVars(mmTheme),
          securityLevel:'strict',fontFamily:'ui-sans-serif,system-ui,-apple-system,'+'"PingFang SC","Microsoft YaHei",sans-serif'});
        mmState=2;
      }catch(e){mmState=-1;}
      mmQueue.forEach(function(f){f(mmState===2);});mmQueue=[];
    };
    s.onerror=function(){
      mmState=-1;
      mmQueue.forEach(function(f){f(false);});mmQueue=[];
    };
    document.head.appendChild(s);
  }

  function hydrateOne(box){
    var src=box.getAttribute('data-src');
    if(!src)return;
    function fallback(){
      if(!box.querySelector('.md-mermaid-fallback')){
        box.innerHTML='<pre class="md-mermaid-fallback"><code>'+esc(src)+'</code></pre>';
      }
    }
    loadMermaid(function(ok){
      if(!ok){fallback();return;}
      try{
        window.mermaid.render('mmd-'+Date.now()+'-'+Math.floor(Math.random()*1e5),src)
          .then(function(r){
            box.innerHTML=r.svg;
            box.setAttribute('data-done','1');
            var el=box.querySelector('svg');
            if(el){el.style.maxWidth='100%';el.style.height='auto';}
          })
          .catch(fallback);
      }catch(e){fallback();}
    });
  }

  /* 扫描容器渲染 mermaid 占位（页面 innerHTML 后调用）
     等待 webfont 就绪：否则用 fallback 字体测量节点宽度，
     真实字体到位后文字变宽溢出节点框（Windows 长标签必现） */
  function hydrate(root){
    var boxes=(root||document).querySelectorAll('.md-mermaid:not([data-done="1"])');
    if(!boxes.length)return;
    var go=function(){[].forEach.call(boxes,function(b){hydrateOne(b);});};
    if(document.fonts&&document.fonts.ready){document.fonts.ready.then(go).catch(go);}
    else go();
  }

  /* 日夜切换自动重绘：监听 base.js 派发的 themechange
     （守卫：CI 安全回归在 node vm 无 DOM 环境加载本文件） */
  if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('themechange',function(){
    if(mmState!==2)return;
    var t=currentTheme();
    if(t===mmTheme)return;
    mmTheme=t;
    try{window.mermaid.initialize({startOnLoad:false,theme:'base',flowchart:{nodePadding:14,htmlLabels:true},themeVariables:themeVars(t),securityLevel:'strict',fontFamily:'ui-sans-serif,system-ui,-apple-system,'+'"PingFang SC","Microsoft YaHei",sans-serif'});}catch(e){return;}
    [].forEach.call(document.querySelectorAll('.md-mermaid[data-done="1"]'),function(b){
      b.removeAttribute('data-done');hydrateOne(b);
    });
  });

  return {render:render,esc:esc,hydrate:hydrate};
})();
