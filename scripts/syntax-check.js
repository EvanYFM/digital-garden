/* scripts/syntax-check.js · 全站语法守门
   1) node --check 所有 *.js
   2) 抽出所有 *.html 的内联 <script> 逐段 node --check
   3) 结构校验：每页必须引入 base.js；CSS 抽取页必须引入 base.css
   用法：node scripts/syntax-check.js */
const fs=require('fs'),path=require('path'),cp=require('child_process'),os=require('os');
const root=path.join(__dirname,'..');
let fail=0;
function checkJS(code,label){
  const f=path.join(os.tmpdir(),'gcheck-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.js');
  fs.writeFileSync(f,code);
  const r=cp.spawnSync(process.execPath,['--check',f],{encoding:'utf8'});
  fs.unlinkSync(f);
  if(r.status!==0){console.error('✗ 语法错误:',label,'\n',r.stderr.slice(0,400));fail=1;}
}
/* 1. 独立 js 文件 */
for(const f of fs.readdirSync(root).filter(f=>f.endsWith('.js')))
  checkJS(fs.readFileSync(path.join(root,f),'utf8'),f);
/* 2. 内联 script + 3. 结构校验 */
const NO_BASE_JS=['404.html'];                 /* 自包含页 */
const EXTRACT_CSS=['notes.html','research.html','projects.html','review.html','about.html','now.html','article.html']; /* 已抽取共享 CSS 的页 */
for(const f of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){
  const t=fs.readFileSync(path.join(root,f),'utf8');
  (t.match(/<script>([\s\S]*?)<\/script>/g)||[]).forEach((s,i)=>{
    const code=s.replace(/^<script>/,'').replace(/<\/script>$/,'');
    if(code.trim())checkJS(code,f+' #内联script['+i+']');
  });
  if(!NO_BASE_JS.includes(f)&&!t.includes('src="base.js"')){console.error('✗ 缺少 base.js 引入:',f);fail=1;}
  if(EXTRACT_CSS.includes(f)&&!t.includes('href="base.css"')){console.error('✗ 缺少 base.css 引入:',f);fail=1;}
}
console.log(fail?'语法守门：存在错误':'语法守门：全部通过');
process.exit(fail);
