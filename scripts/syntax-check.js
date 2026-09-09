/* scripts/syntax-check.js · 全站语法守门
   1) node --check 所有 *.js
   2) 抽出所有 *.html 的内联 <script> 逐段 node --check
   3) 结构校验：每页必须引入 base.js；CSS 抽取页必须引入 base.css
   4) 内容校验：观页语录注释「语录N条」须与 QUOTES 实际条数一致
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
/* 4. 语录计数守门：jing.html 注释声明的条数 == QUOTES 实际元素数
   中文数字支持到百位（语录规模 foreseeable < 200 条） */
function cnum(s){
  const D={'零':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
  if(s==='十')return 10;
  if(/^十./.test(s))return 10+D[s[1]];
  if(/十$/.test(s))return D[s[0]]*10;
  if(/^.十.$/.test(s))return D[s[0]]*10+D[s[2]];
  return D[s]??-1;
}
(function(){
  const t=fs.readFileSync(path.join(root,'jing.html'),'utf8');
  const mClaim=t.match(/语录([零一二两三四五六七八九十]{1,3})条/);
  const mArr=t.indexOf('var QUOTES=[');
  if(!mClaim||mArr<0){console.error('✗ jing.html 未找到语录计数注释或 QUOTES 数组');fail=1;return;}
  const seg=t.slice(mArr,t.indexOf('];',mArr));
  const actual=(seg.match(/\{q:"/g)||[]).length;
  const claim=cnum(mClaim[1]);
  if(claim!==actual){console.error('✗ jing.html 语录计数不符：注释声明 '+claim+' 条，QUOTES 实际 '+actual+' 条——加减语录后请同步更新注释');fail=1;}
  else console.log('✓ jing.html 语录计数一致：'+actual+' 条');
})();
console.log(fail?'语法守门：存在错误':'语法守门：全部通过');
process.exit(fail);
