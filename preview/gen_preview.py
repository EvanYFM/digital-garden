#!/usr/bin/env python3
# 生成 article.html 单文件自包含预览版（Evan 聊天内直接打开试用）
# 用法：python3 preview/gen_preview.py
import pathlib, re, json, sys

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'article.html').read_text(encoding='utf-8')

def inline_css(href):
    css = (root / href).read_text(encoding='utf-8')
    return '<style>\n' + css + '\n</style>'

def inline_js(srcfile):
    js = (root / srcfile).read_text(encoding='utf-8')
    return '<script>\n' + js + '\n</script>'

# 1) 内联 base.css
src = re.sub(r'<link rel="stylesheet" href="base\.css\?v=[^"]*">',
             lambda m: inline_css('base.css'), src)
# 2) 内联 base.js / garden-data.js / md.js
src = re.sub(r'<script src="base\.js\?v=[^"]*" defer></script>',
             lambda m: inline_js('base.js'), src)
src = re.sub(r'<script src="garden-data\.js\?v=[^"]*"></script>',
             lambda m: inline_js('garden-data.js'), src)
src = re.sub(r'<script src="md\.js\?v=[^"]*"></script>',
             lambda m: inline_js('md.js'), src)
# 3) 去掉 bgm（预览不需要背景音乐）
src = re.sub(r'<script src="bgm\.js"></script>\s*', '', src)

# 4) 注入预览用户文章（思维训练——Markdown 渲染 + 自动目录路径）
#    在第一个 <script> 前注入 localStorage 种子，loadUserArticles 先读本地再 fetch，fetch 失败静默
arts = {
  'u1788939605854': {
    'id': 'u1788939605854', 'title': '思维训练', 'cat': '工具方法论',
    'state': 'ever', 'created': 1788939605854, 'updated': 1788939605854, 'rev': 5,
    'body': (root / 'preview' / 'sample-article.md').read_text(encoding='utf-8'),
    'seeds': [], 'revisions': []
  }
}
seed = ('<script>/* 预览垫片：注入用户文章（思维训练节选），fetch 失败不影响 */\n'
        'try{localStorage.setItem("userArticles", ' + json.dumps(json.dumps(arts, ensure_ascii=False)) + ');}catch(e){}\n'
        '</script>\n')
# 插到 </head> 前（早于一切业务脚本）
src = src.replace('</head>', seed + '</head>', 1)

# 5) 默认打开思维训练：无 hash 时设 hash（替换最后一个裸 <body>，避开 CSS 注释里的同名文本）
i = src.rfind('<body>')
assert i != -1, 'body 标签未找到'
src = (src[:i]
       + '<body onload="if(!/^#[au]\\d/i.test(location.hash))location.replace(\'#u1788939605854\');">'
       + src[i+len('<body>'):])

out = root / 'preview' / 'article-preview.html'
out.write_text(src, encoding='utf-8')
print('生成:', out, '|', len(src), 'chars')
