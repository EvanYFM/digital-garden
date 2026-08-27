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
    return fetch('https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/'+path,{
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
  function mergeFragments(local,remote){
    var map={},i,out=[];
    for(i=0;i<remote.length;i++)map[remote[i].t]=remote[i];
    for(i=0;i<local.length;i++)if(!map[local[i].t])map[local[i].t]=local[i];
    out=Object.keys(map).map(function(t){return map[t];});
    out.sort(function(a,b){return a.t-b.t;});
    return out;
  }

  return {token:token,setToken:setToken,hasToken:hasToken,
    pull:pull,sync:sync,mergeNow:mergeNow,mergeFragments:mergeFragments};
})();
