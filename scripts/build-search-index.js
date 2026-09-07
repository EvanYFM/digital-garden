/* scripts/build-search-index.js · 生成全文检索索引
   从 article.html 的 ARTICLES 字面量提取 8 篇静态文章全文 → search-index.json
   用户文章不入此索引（notes.html 运行时从 user-articles.json 实时并入）
   改了 article.html 的文章后必须重跑：node scripts/build-search-index.js
   CI 会用 git diff 检查索引是否过期。
   用法：node scripts/build-search-index.js */
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'article.html'),'utf8');

const aStart=html.indexOf('var ARTICLES={');
const oStart=html.indexOf('var ORDER=');
if(aStart<0||oStart<0||oStart<aStart){console.error('✗ article.html 中找不到 ARTICLES/ORDER');process.exit(1);}
let objText=html.slice(aStart+'var ARTICLES='.length,oStart).replace(/;\s*$/,'');
const orderM=html.slice(oStart+'var ORDER='.length).match(/\[[^\]]*\]/);
if(!orderM){console.error('✗ 解析 ORDER 失败');process.exit(1);}
let ARTICLES,ORDER;
try{
  ARTICLES=eval('('+objText+')');
  ORDER=eval('('+orderM[0]+')');
}catch(e){console.error('✗ ARTICLES 字面量解析失败:',e.message);process.exit(1);}

function tag(s){return String(s||'').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,'').trim();}

const articles=ORDER.map(function(id){
  const a=ARTICLES[id];
  if(!a){console.error('✗ ORDER 引用了不存在的文章:',id);process.exit(1);}
  const body=[tag(a.intro)]
    .concat((a.chapters||[]).map(function(ch){
      return tag(ch.zh)+' '+tag((ch.body||[]).join(' '));
    })).filter(Boolean).join('\n');
  return {id:id,title:tag(a.title),cat:a.cat||'',date:a.date||'',body:body};
});

/* 注意：输出必须确定性（无时间戳），CI 用 git diff 检查索引是否过期 */
const out={articles:articles};
fs.writeFileSync(path.join(root,'search-index.json'),JSON.stringify(out),'utf8');
console.log('✓ search-index.json：'+articles.length+' 篇，'
  +articles.reduce(function(n,a){return n+a.body.length;},0)+' 字');
