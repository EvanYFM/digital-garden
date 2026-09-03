/* ============================================================
   garden-data.js · 数字花园数据层
   原则：本地优先（localStorage 永远可用），GitHub 私有仓库作跨设备同步。
   未设置 Token 时，一切退化为纯本地——不报错、不阻塞。
   数据仓库：EvanYFM/digital-garden-data（私有，仅本人 Token 可读写）
   ============================================================ */
var GD=(function(){
  var OWNER='EvanYFM',REPO='digital-garden-data',TKEY='gd_token';

  function token(){try{return localStorage.getItem(TKEY)||'';}catch(e){return '';}}
  function setToken(t){try{t?localStorage.setItem(TKEY,t):localStorage.removeItem(TKEY);}catch(e){}}
  function hasToken(){return !!token();}

  /* UTF-8 安全的 base64 */
  function b64e(s){return btoa(unescape(encodeURIComponent(s)));}
  function b64d(s){return decodeURIComponent(escape(atob(s.replace(/\n/g,''))));}

  function api(method,path,body){
    return apiRepo(REPO,method,path,body);
  }
  function apiRepo(repo,method,path,body){
    return fetch('https://api.github.com/repos/'+OWNER+'/'+repo+'/contents/'+path,{
      method:method,
      headers:{
        'Accept':'application/vnd.github+json',
        'Authorization':'Bearer '+token(),
        'Content-Type':'application/json',
        'X-GitHub-Api-Version':'2022-11-28'
      },
      body:body?JSON.stringify(body):undefined
    }).then(function(r){
      if(r.status===404)return null;              /* 文件尚不存在 */
      if(r.status===401)throw new Error('Token 无效或已过期');
      if(!r.ok)throw new Error('GitHub '+r.status);
      return r.json();
    });
  }

  /* 拉取：返回 {data, sha} 或 null（404） */
  function pull(path){
    if(!hasToken())return Promise.resolve(null);
    return api('GET',path).then(function(j){
      return j?{data:JSON.parse(b64d(j.content)),sha:j.sha}:null;
    });
  }

  /* 推送：无 sha=创建，有 sha=更新 */
  function push(path,obj,sha){
    var body={message:'sync '+path+' · '+new Date().toISOString().slice(0,16),
      content:b64e(JSON.stringify(obj,null,1))};
    if(sha)body.sha=sha;
    return api('PUT',path,body);
  }

  /* 同步：拉取 → merge(本地, 远端) → 推送；409 冲突自动重试一次 */
  function sync(path,localObj,merge){
    if(!hasToken())return Promise.resolve({data:localObj,local:true});
    function attempt(retry){
      return pull(path).then(function(r){
        var sha=r?r.sha:null;
        var merged=merge(localObj,r?r.data:{});
        return push(path,merged,sha).then(function(){
          return {data:merged,ok:true};
        });
      }).catch(function(e){
        if(retry&&/409/.test(e.message))return attempt(false);
        throw e;
      });
    }
    return attempt(true);
  }

  /* 合并规则：now 按日期为键。远端为基准；本地独有日期保留；
     preferKey（通常为今天）本地优先——刚写的编辑不被云端旧值覆盖 */
  function mergeNow(local,remote,preferKey){
    var out={},k;
    for(k in remote)out[k]=remote[k];
    for(k in local){
      if(!(k in out))out[k]=local[k];
      else if(k===preferKey)out[k]=local[k];
    }
    return out;
  }
  /* 随记合并 v2：支持墓碑（删除跨设备生效）。
     remote 可为旧版数组或 {items:[],del:[]}；本地墓碑存 localStorage('fragDel')；
     墓碑并集后从条目剔除，返回 v2 对象，调用方取 .items / .del 落盘 */
  function fragParts(x){
    if(Array.isArray(x))return{items:x,del:[]};
    return{items:(x&&x.items)||[],del:(x&&x.del)||[]};
  }
  function mergeFragments(local,remote){
    var L=fragParts(local),R=fragParts(remote),del={},map={},i;
    try{
      (JSON.parse(localStorage.getItem('fragDel'))||[]).forEach(function(t){del[t]=1;});
    }catch(e){}
    R.del.forEach(function(t){del[t]=1;});
    for(i=0;i<R.items.length;i++)if(!del[R.items[i].t])map[R.items[i].t]=R.items[i];
    for(i=0;i<L.items.length;i++)if(!del[L.items[i].t]&&!map[L.items[i].t])map[L.items[i].t]=L.items[i];
    var items=Object.keys(map).map(function(t){return map[t];});
    items.sort(function(a,b){return a.t-b.t;});
    return{items:items,del:Object.keys(del).map(Number).sort(function(a,b){return a-b;})};
  }

  /* 发布到公开仓库（数字花园本体，EvanYFM/digital-garden）：
     把已发布文章写入 user-articles.json，Pages 约 1 分钟后全站可见 */
  function pushPublic(path,obj){
    var body={message:'publish '+path+' · '+new Date().toISOString().slice(0,16),
      content:b64e(JSON.stringify(obj))};
    return apiRepo('digital-garden','GET',path).then(function(j){
      if(j)body.sha=j.sha;
      return apiRepo('digital-garden','PUT',path,body);
    });
  }

  /* 用户文章合并：按 id，updated 较新者胜 */
  function mergeArticles(local,remote){
    var out={},k;
    for(k in remote)out[k]=remote[k];
    for(k in local){
      if(!out[k]||Number(local[k].updated||0)>=Number(out[k].updated||0))out[k]=local[k];
    }
    return out;
  }

  /* 加载用户文章（本地草稿 + 公开发布合并），cb(all) */
  function loadUserArticles(cb){
    var local={};
    try{local=JSON.parse(localStorage.getItem('userArticles'))||{};}catch(e){}
    fetch('user-articles.json?t='+Date.now()).then(function(r){
      return r.ok?r.json():null;
    }).catch(function(){return null;}).then(function(pub){
      if(pub&&pub.articles)local=mergeArticles(local,
        pub.articles.reduce(function(m,a){m[a.id]=a;return m;},{}));
      cb(local);
    });
  }

  return {token:token,setToken:setToken,hasToken:hasToken,
    pull:pull,sync:sync,mergeNow:mergeNow,mergeFragments:mergeFragments,
    pushPublic:pushPublic,mergeArticles:mergeArticles,loadUserArticles:loadUserArticles};
})();
