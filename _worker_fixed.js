import { connect } from 'cloudflare:sockets';

/* ============================================================
 * 最小 VLESS-over-WebSocket Worker（Cloudflare Workers 免费版）
 * ES Module 格式 + 顶层静态 import（dashboard 可直接粘贴部署）
 * UUID 换成你自己的即可，其它不用改。
 * 客户端：VLESS + WS + TLS，path=/，host/SNI=你的自定义域名
 * ============================================================ */
const UUID = 'YOUR-UUID-HERE';

function uuidToBytes(uuid) {
  const hex = uuid.replace(/-/g, '');
  if (hex.length !== 32) throw new Error('bad uuid');
  const b = new Uint8Array(16);
  for (let i = 0; i < 16; i++) b[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return b;
}
const UUID_BYTES = uuidToBytes(UUID);

// 反代 IP：直连失败或拿不到数据时（例如 X 等挂在 Cloudflare 上的网站），改走这个地址
const PROXYIP = '146.190.56.83'; // 固定反代 IP（DigitalOcean 旧金山），原为 pyip.ygkkk.dpdns.org



// 新版落地页 index_v2.html 托管在外部 URL（Dashboard 编辑器无法粘贴大文件），
// Worker 运行时加载一次并在内存中缓存;UUID 与 VLESS 代理逻辑不受影响。
const LANDING_URL = 'https://raw.githubusercontent.com/huangguan9888-cell/huangguanhulan-rice/main/index.html';
let LANDING_HTML_CACHE = null;
async function getLandingHtml() {
  if (LANDING_HTML_CACHE === null) {
    try {
      const resp = await fetch(LANDING_URL, { cf: { cacheTtl: 3600}});
      if (resp.ok) LANDING_HTML_CACHE = await resp.text();
  } catch (e) {}
}
  return LANDING_HTML_CACHE === null? LANDING_HTML_FALLBACK: LANDING_HTML_CACHE;
}

const LANDING_HTML_FALLBACK = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>呼兰大米 · 哈尔滨呼兰自家种植</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; color: #3a3226; background: #faf6ec; line-height: 1.8; }
  .hero { background: linear-gradient(160deg, #5c7a3a 0%, #7a9a4a 45%, #c9a94e 100%); color: #fff; text-align: center; padding: 72px 20px 60px; }
  .hero .tag { display: inline-block; border: 1px solid rgba(255,255,255,.7); border-radius: 999px; padding: 4px 16px; font-size: 13px; letter-spacing: 2px; margin-bottom: 18px; }
  .hero h1 { font-size: 42px; letter-spacing: 8px; margin-bottom: 12px; font-weight: 700; }
  .hero p { font-size: 16px; opacity: .92; letter-spacing: 1px; }
  .wrap { max-width: 720px; margin: 0 auto; padding: 40px 20px; }
  .card { background: #fff; border-radius: 14px; padding: 28px 24px; margin-bottom: 22px; box-shadow: 0 2px 12px rgba(120,100,40,.08); }
  .card h2 { font-size: 20px; margin-bottom: 12px; color: #5c7a3a; letter-spacing: 2px; }
  .card h2::before { content: "🌾 "; }
  .card p { font-size: 15px; color: #5a5245; }
  .points { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 6px; }
  .point { background: #f4efe0; border-radius: 10px; padding: 16px; text-align: center; }
  .point .em { font-size: 26px; display: block; margin-bottom: 6px; }
  .point b { display: block; font-size: 15px; margin-bottom: 4px; }
  .point span { font-size: 13px; color: #8a7f68; }
  .buy { text-align: center; }
  .buy .ways { display: flex; gap: 14px; justify-content: center; margin-top: 16px; flex-wrap: wrap; }
  .way { background: #5c7a3a; color: #fff; border-radius: 10px; padding: 14px 26px; font-size: 15px; letter-spacing: 1px; }
  .way small { display: block; font-size: 12px; opacity: .8; margin-top: 4px; letter-spacing: 0; }
  footer { text-align: center; padding: 28px 20px 40px; font-size: 12px; color: #a89c80; }
</style>
</head>
<body>
  <div class="hero">
    <div class="tag">当年新米 · 自家种植</div>
    <h1>呼兰大米</h1>
    <p>哈尔滨呼兰 · 黑土地种出的中科发5号</p>
  </div>
  <div class="wrap">
    <div class="card">
      <h2>产地</h2>
      <p>种在哈尔滨呼兰，松花江畔的黑土地上。一年一季，靠天吃饭，也靠人用心。从插秧到收割，全是自家人打理。</p>
    </div>
    <div class="card">
      <h2>品种</h2>
      <p>中科发5号，东北粳稻。米粒饱满、口感软糯，蒸出来的米饭油亮清香，凉了也不硬，当天吃不完第二天热一下照样香。</p>
    </div>
    <div class="card">
      <h2>为啥选我们</h2>
      <div class="points">
        <div class="point"><span class="em">🌱</span><b>自家种植</b><span>不是收来的陈米</span></div>
        <div class="point"><span class="em">☀️</span><b>当年新米</b><span>现磨现发更新鲜</span></div>
        <div class="point"><span class="em">🍚</span><b>口感软糯</b><span>柴火饭的香气</span></div>
        <div class="point"><span class="em">🤝</span><b>实在人</b><span>缺斤短两包退换</span></div>
      </div>
    </div>
    <div class="card buy">
      <h2>在哪买</h2>
      <p>市集摆摊 + 抖音小店，两种方式都能买到。</p>
      <div class="ways">
        <div class="way">市集摊位<small>呼兰本地，现场看米</small></div>
        <div class="way">抖音小店<small>搜呼兰大米，下单包邮</small></div>
      </div>
    </div>
  </div>
  <footer>呼兰大米 · 自家种植 · 吃得放心</footer>
</body>
</html>
`;

async function handleConnection(ws, earlyData) {
  ws.binaryType = 'arraybuffer';
  let headerDone = false;
  let remoteWriter = null;
  let remoteSocket = null;
  let closed = false;
  const pending = [];            // 出站连接建好之前收到的后续数据
  let ready = false;

  const cleanup = () => {
    if (closed) return; closed = true;
    try { remoteWriter && remoteWriter.releaseLock(); } catch (_) {}
    try { remoteSocket && remoteSocket.close(); } catch (_) {}
    try { ws.close(); } catch (_) {}
  };

  // 建立出站连接，写入首包；返回是否收到过数据
  async function dial(host, port, firstPayload, headerToSend) {
    const sock = connect({ hostname: host, port: port });
    await sock.opened;
    remoteSocket = sock;
    remoteWriter = sock.writable.getWriter();
    if (firstPayload && firstPayload.length) await remoteWriter.write(firstPayload);
    while (pending.length) await remoteWriter.write(pending.shift());
    ready = true;
    let got = false;
    let hdr = headerToSend;
    const reader = sock.readable.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        got = true;
        if (ws.readyState !== 1) break;
        if (hdr) { // VLESS 响应头和第一段数据一起发
          const out = new Uint8Array(hdr.length + value.length);
          out.set(hdr); out.set(value, hdr.length);
          ws.send(out.buffer); hdr = null;
        } else ws.send(value);
      }
    } catch (_) {}
    return got;
  }

  async function onData(data) {
    if (!headerDone) {
      // ---- 解析 VLESS 头 ----
      if (data.length < 18) { cleanup(); return; }
      const version = data[0];
      for (let i = 0; i < 16; i++) {
        if (data[1 + i] !== UUID_BYTES[i]) { cleanup(); return; } // UUID 不对直接断
      }
      const optLen = data[17];
      let idx = 18 + optLen;
      const cmd = data[idx]; idx += 1;          // 1=TCP, 2=UDP
      if (cmd !== 1) { cleanup(); return; }     // 只要 TCP
      const port = (data[idx] << 8) | data[idx + 1]; idx += 2;
      const atyp = data[idx]; idx += 1;
      let host = '';
      if (atyp === 1) {
        host = data.slice(idx, idx + 4).join('.'); idx += 4;
      } else if (atyp === 2) {
        const len = data[idx]; idx += 1;
        host = new TextDecoder().decode(data.slice(idx, idx + len)); idx += len;
      } else if (atyp === 3) {
        const parts = [];
        for (let i = 0; i < 8; i++) parts.push(((data[idx + i * 2] << 8) | data[idx + i * 2 + 1]).toString(16));
        host = '[' + parts.join(':') + ']'; idx += 16;
      } else { cleanup(); return; }
      headerDone = true;

      const payload = data.slice(idx);
      const respHeader = new Uint8Array([version, 0]);

      // 先直连；失败或一点数据都没拿到，就走反代重试
      let ok = false;
      try { ok = await dial(host, port, payload, respHeader); } catch (_) { ok = false; }
      if (!ok && !closed && ws.readyState === 1) {
        ready = false;
        try { remoteWriter && remoteWriter.releaseLock(); } catch (_) {}
        try { remoteSocket && remoteSocket.close(); } catch (_) {}
        try { await dial(PROXYIP, port, payload, respHeader); } catch (_) {}
      }
      cleanup();
    } else {
      if (!ready) { pending.push(data); return; }
      if (remoteWriter && ws.readyState === 1) await remoteWriter.write(data);
    }
  }

  ws.addEventListener('message', (event) => {
    onData(new Uint8Array(event.data)).catch(() => cleanup());
  });
  ws.addEventListener('close', cleanup);
  ws.addEventListener('error', cleanup);

  // 支持 path=/?ed=2560 的早期数据
  if (earlyData && earlyData.length) onData(earlyData).catch(() => cleanup());
}

function decodeEarlyData(str) {
  if (!str) return null;
  try {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  } catch (_) { return null; }
}

export default {
  async fetch(req) {
    if (req.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();
      const early = decodeEarlyData(req.headers.get('sec-websocket-protocol'));
      handleConnection(server, early).catch(() => { try { server.close(); } catch (_) {} });
      return new Response(null, { status: 101, webSocket: client });
    }
    const url = new URL(req.url);
    if (url.pathname === '/4c6232e016b1bdb41acc8d0d521fe383.txt') {
      return new Response('9429d95ce7868f20f9d0222e4137db66ef03dc31', { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    const html = await getLandingHtml();
    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
};
