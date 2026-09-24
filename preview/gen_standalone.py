#!/usr/bin/env python3
# 生成概念页单文件自包含预览版：内联 base.css / garden-data.js，
# 去 Google Fonts（内地网络不挂起），注入 fetch 垫片 + 演示种子。
# 用法：python3 preview/gen_standalone.py  → 产出 preview/概念页-agent候选管线-预览.html
import re, os, json, time, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
html = (ROOT / 'concept.html').read_text(encoding='utf-8')
css = (ROOT / 'base.css').read_text(encoding='utf-8')
gd = (ROOT / 'garden-data.js').read_text(encoding='utf-8')

# 1. 内联 base.css（替换 <link rel="stylesheet" href="base.css…">）
# 注意：re.sub 替换串会解释反斜杠——内联代码必须走 lambda 字面替换
html = re.sub(r'<link rel="stylesheet" href="base\.css[^"]*">',
              lambda m: '<style>\n' + css + '\n</style>', html, count=1)

# 2. 去 Google Fonts（内地网络会挂起直到超时）——连 preconnect 预握手也去掉
html = re.sub(r'<link href="https://fonts\.googleapis\.com[^"]*" rel="stylesheet">\n?', '', html)
html = re.sub(r'<link rel="preconnect" href="https://fonts\.(?:googleapis|gstatic)\.com"[^>]*>\n?', '', html)

# 3. 内联 garden-data.js（同样走 lambda 字面替换）
html = re.sub(r'<script src="garden-data\.js[^"]*"></script>',
              lambda m: '<script>\n' + gd + '\n</script>', html, count=1)

# 4. 演示种子 + fetch 垫片（插在 </head> 前，先于所有脚本执行）
now = int(time.time() * 1000)
seed = {
    'concepts': {
        'c1': {'id': 'c1', 'name': '反事实镜头', 'aliases': [], 'def': '提前写下什么会证明我错了——反例先于下注。', 'updated': now - 86400000},
        'c2': {'id': 'c2', 'name': '美债期限溢价', 'aliases': ['term premium'], 'def': '持有长期债券所要求的额外风险补偿。', 'updated': now - 86400000},
        'c3': {'id': 'c3', 'name': '贝叶斯更新', 'aliases': ['Bayesian updating'], 'def': '用新证据按规则修正先验判断，而非推倒重来。', 'updated': now - 86400000},
    },
    'userArticles': {
        'a0': {'id': 'a0', 'title': '利率、汇率与情绪：一个交易员候选人的宏观笔记',
               'body': '宏观分析的第一步不是收集，而是取舍——在任何一个时间截面上，真正驱动定价的矛盾通常只有一个，至多两个。这就是 [[主要矛盾]] 的位置：把所有候选矛盾列出来，逐个追问——如果这个变量反向运动，市场叙事会不会被根本动摇？',
               'updated': now - 3600000},
    },
    'candidates': {
        'cd1': {'id': 'cd1', 'kind': 'concept', 'name': '主要矛盾', 'aliases': ['核心矛盾'],
                'def': '任一时点真正驱动资产定价的矛盾通常只有一至两个；分析的第一步是列出候选再逐个证伪，经不起反向追问的只是噪音。',
                'why': '全文方法论核心（提及 4 次）：文章明确把它立为宏观分析的第一步，并给出可操作的检验（反向运动测试）。跨文章复用生命力强，粒度符合"先粗后细"。',
                'src': {'u': 'https://evanyfm.github.io/digital-garden/article.html#a0',
                        'q': '找到它的方法不是更聪明，而是更诚实：把所有候选矛盾列出来，逐个追问', 't': '2026-09-24'},
                'created': now - 3600000, 'updated': now - 3600000, 'by': 'agent'},
        'cd2': {'id': 'cd2', 'kind': 'relation', 'from': 'c1', 'to': 'c3',
                'why': '反例预设是贝叶斯更新的执行装置——「反例必须在下笔时就写好」等于给先验设置证伪条件；两者共同构成"写下来，接受审查"的诚实闭环。',
                'src': {'u': 'https://evanyfm.github.io/digital-garden/article.html#a0',
                        'q': '反例——会让我承认自己错了的证据——必须在下笔时就写好', 't': '2026-09-24'},
                'created': now - 3600000, 'updated': now - 3600000, 'by': 'agent'},
    },
}
seed_js = json.dumps(seed, ensure_ascii=False)

shim = """<script>
/* ===== 预览垫片：离线单文件演示（正式站无此段） ===== */
(function(){
  /* 种子：仅当本机无数据时写入（刷新后保留你的审阅操作） */
  try{
    if(!localStorage.getItem('gd_preview_seeded')){
      localStorage.setItem('gd_token','demo');
      localStorage.setItem('concepts', JSON.stringify(%s));
      localStorage.setItem('userArticles', JSON.stringify(%s));
      localStorage.setItem('candidates', JSON.stringify(%s));
      localStorage.setItem('relations','{}');
      localStorage.setItem('gd_preview_seeded','1');
    }
  }catch(e){}
  var SEED = %s;
  /* fetch 垫片：拦下本页所有网络请求——离线可玩，token 为演示值不触网 */
  window.fetch = function(u){
    u = String(u);
    function jr(obj){ return Promise.resolve({ok:true,status:200,json:function(){return Promise.resolve(obj);}}); }
    if(/fonts\\.googleapis\\.com|fonts\\.gstatic\\.com/.test(u)) return jr({});
    if(/api\\.github\\.com/.test(u)){
      var m = (arguments[1]&&arguments[1].method)||'GET';
      if(m==='GET') return jr({content:btoa(unescape(encodeURIComponent(JSON.stringify({})))).replace(/\\+/g,'-').replace(/\\//g,'_'), sha:'demo'});
      return jr({commit:{},content:{}});
    }
    var f = u.split('?')[0].split('/').pop();
    if(f==='concepts.json') return jr(SEED.concepts);
    if(f==='relations.json') return jr({});
    if(f==='user-articles.json') return jr({articles:[],deletions:[]});
    return Promise.resolve({ok:false,status:404,json:function(){return Promise.resolve(null);}});
  };
})();
</script>
""" % (json.dumps(seed['concepts'], ensure_ascii=False),
       json.dumps(seed['userArticles'], ensure_ascii=False),
       json.dumps(seed['candidates'], ensure_ascii=False),
       seed_js)

html = html.replace('</head>', shim + '\n</head>', 1)

# 5. 预览角标（表明这是演示文件）
html = html.replace('</body>',
  '<div style="position:fixed;right:14px;bottom:14px;font-size:10px;letter-spacing:.14em;color:#8a877d;'
  'border:1px solid #d8d4c8;padding:6px 10px;background:#f6f4ee;z-index:9">预览 · agent 候选管线 · 数据为演示种子，不触网</div>\n</body>', 1)

out = ROOT / 'preview' / '概念页-agent候选管线-预览.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print('生成:', out, f'({out.stat().st_size//1024} KB)')
