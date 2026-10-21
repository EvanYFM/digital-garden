// 直测 GD.uploadAttachment 真码：mock FileReader/fetch，校验 PUT 路径与文件名净化
const fs = require('fs'), path = require('path'), vm = require('vm');

const c = {
  fetch: async (url, opts) => ({ status: 404, ok: false }), // 兜底，不该走到
  Date, Promise, console,
  localStorage: { getItem: () => 'test-token', setItem: () => {} },
  btoa: s => Buffer.from(s, 'binary').toString('base64'),
  atob: s => Buffer.from(s, 'base64').toString('binary'),
};
c.FileReader = class {
  readAsArrayBuffer(f) {
    this.result = f._buf;
    this.onload();
  }
};
vm.createContext(c);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'garden-data.js'), 'utf8'), c);

(async () => {
  const cases = [
    { name: '屏幕截图 2026-10-21 20.11.03.png', expect: /^attachments\/\d{13}-屏幕截图-2026-10-21-20\.11\.03\.png$/ },
    { name: 'K线图.png', expect: /^attachments\/\d{13}-K线图\.png$/ },
    { name: 'quotes"weird*<>|name.jpg', expect: /^attachments\/\d{13}-quotes-weird-name\.jpg$/ },
    { name: 'no-ext', expect: /^attachments\/\d{13}-no-ext\.png$/ }, // 无有效扩展名兜底 .png
    { name: 'photo.jpeg', expect: /^attachments\/\d{13}-photo\.jpeg$/ },
  ];
  for (const t of cases) {
    let putUrl = null, putBody = null;
    c.fetch = async (url, opts) => {
      putUrl = url; putBody = JSON.parse(opts.body);
      return { status: 200, ok: true, json: async () => ({ commit: { sha: 'x' }, content: { sha: 'y' } }) };
    };
    const buf = new Uint8Array([1, 2, 3, 4]);
    const file = { name: t.name, _buf: buf.buffer };
    const rel = await c.GD.uploadAttachment(file);
    const m = putUrl.match(/contents\/(.+)$/);
    console.log(`  "${t.name}" → ${m[1]}  (插入 ${rel})`);
    if (!t.expect.test(m[1])) throw new Error(`净化结果不符: ${m[1]}`);
    if (rel !== './' + m[1]) throw new Error('返回路径与 PUT 路径不一致');
    if (putBody.message !== 'attach ' + m[1]) throw new Error('commit message 不符');
    if (putBody.sha !== undefined) throw new Error('新建文件不该带 sha'); // 确认没误带
    if (putBody.content !== c.btoa(String.fromCharCode(1,2,3,4))) throw new Error('二进制 b64 不符');
  }
  // 无 Token 拒绝
  c.localStorage.getItem = () => '';
  try { await c.GD.uploadAttachment({ name: 'x.png' }); throw new Error('应拒绝'); }
  catch (e) { if (!/Token/.test(e.message)) throw new Error('拒绝原因不对: ' + e.message); }
  console.log('✓ sanitizeFileName + uploadAttachment 真码路径 全部通过（5 例 + Token 拒绝）');
})();
