/* ============================================================
   md.js · 数字花园迷你 Markdown 渲染器
   原则：先整体转义再加工，绝不放行裸 HTML；零依赖。
   支持：# 标题 / > 引用 / - 列表 / 1. 有序列表 / ``` 代码块
        **粗** *斜* `行内码` [链接](url) --- 分隔线
   ============================================================ */
var MD=(function(){
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  /* 行内加工（输入已转义） */
  function inline(s){
    return s
      .replace(/`([^`]+)`/g,'<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g,'<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,function(m,t,u){
        if(!/^(https?:|mailto:|#|\.\/|notes\.html|article\.html|now\.html|review\.html|research\.html|projects\.html|about\.html|jing\.html|write\.html)/i.test(u))return t;
        return '<a href="'+u+'">'+t+'</a>';
      });
  }

  function render(src){
    var lines=String(src||'').replace(/\r\n?/g,'\n').split('\n');
    var out=[],i=0,para=[];
    function flushPara(){ if(para.length){out.push('<p>'+inline(para.join('<br>'))+'</p>');para=[];} }

    while(i<lines.length){
      var ln=lines[i];

      /* 代码块 */
      if(/^```/.test(ln)){
        flushPara();
        var buf=[];i++;
        while(i<lines.length&&!/^```/.test(lines[i])){buf.push(lines[i]);i++;}
        i++;
        out.push('<pre><code>'+esc(buf.join('\n'))+'</code></pre>');
        continue;
      }
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
      /* 无序列表 */
      if(/^\s*[-*]\s+/.test(ln)){
        flushPara();
        var ul=[];
        while(i<lines.length&&/^\s*[-*]\s+/.test(lines[i])){ul.push('<li>'+inline(esc(lines[i].replace(/^\s*[-*]\s+/,'')))+'</li>');i++;}
        out.push('<ul>'+ul.join('')+'</ul>');
        continue;
      }
      /* 有序列表 */
      if(/^\s*\d+\.\s+/.test(ln)){
        flushPara();
        var ol=[];
        while(i<lines.length&&/^\s*\d+\.\s+/.test(lines[i])){ol.push('<li>'+inline(esc(lines[i].replace(/^\s*\d+\.\s+/,'')))+'</li>');i++;}
        out.push('<ol>'+ol.join('')+'</ol>');
        continue;
      }
      /* 空行 → 断段 */
      if(/^\s*$/.test(ln)){flushPara();i++;continue;}
      para.push(esc(ln));i++;
    }
    flushPara();
    return out.join('\n');
  }

  return {render:render,esc:esc};
})();
