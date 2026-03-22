export function chatPage(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>微信 Bot Demo</title>
<style>
:root {
  --green: #07c160;
  --green-dark: #06ad56;
  --bg: #ededed;
  --sidebar-bg: #2e2e2e;
  --chat-bg: #f0efe7;
  --bubble-in: #fff;
  --bubble-out: #95ec69;
  --text: #333;
  --text-light: #999;
  --border: #ddd;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; height: 100vh; overflow: hidden; }

/* ===== Login ===== */
#login-screen {
  display: flex; justify-content: center; align-items: center;
  height: 100vh; background: var(--bg);
}
.login-card {
  background: #fff; border-radius: 12px; padding: 40px;
  max-width: 420px; width: 90%; box-shadow: 0 4px 24px rgba(0,0,0,0.1); text-align: center;
}
.login-card h1 { font-size: 24px; margin-bottom: 8px; }
.login-card .sub { color: var(--text-light); font-size: 14px; margin-bottom: 24px; }
#qr-box { min-height: 220px; display: flex; align-items: center; justify-content: center; margin: 16px 0; }
.btn-g { background: var(--green); color: #fff; border: none; padding: 12px 40px; border-radius: 8px; font-size: 16px; cursor: pointer; }
.btn-g:hover { background: var(--green-dark); }
.btn-g:disabled { background: #ccc; cursor: default; }
#login-status { font-size: 14px; color: var(--text-light); margin: 12px 0; min-height: 20px; }
.ok { color: var(--green) !important; font-weight: bold; }
.err { color: #e64340 !important; }

/* ===== Chat Layout ===== */
#chat-screen { display: none; height: 100vh; flex-direction: row; }
.side {
  width: 260px; background: var(--sidebar-bg); display: flex; flex-direction: column; flex-shrink: 0;
}
.side-hd {
  padding: 14px 16px; color: #fff; font-size: 15px; font-weight: 600;
  border-bottom: 1px solid #444; display: flex; justify-content: space-between; align-items: center;
}
.side-hd .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); display: inline-block; margin-right: 4px; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
#conv-list { flex: 1; overflow-y: auto; }
#conv-list::-webkit-scrollbar { width: 4px; }
#conv-list::-webkit-scrollbar-thumb { background: #555; border-radius: 2px; }
.ci {
  display: flex; align-items: center; padding: 12px 16px; cursor: pointer; gap: 10px; transition: background .15s;
}
.ci:hover { background: #3a3a3a; }
.ci.active { background: #444; }
.ci-av {
  width: 38px; height: 38px; border-radius: 4px; background: #555;
  display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 13px; flex-shrink: 0;
}
.ci-info { flex: 1; min-width: 0; }
.ci-name { color: #eee; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ci-last { color: #888; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
.ci-meta { text-align: right; flex-shrink: 0; }
.ci-time { color: #777; font-size: 11px; }
.badge {
  background: #e64340; color: #fff; font-size: 10px; min-width: 16px; height: 16px;
  border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; padding: 0 4px; margin-top: 4px;
}

/* ===== Main Panel ===== */
.main { flex: 1; display: flex; flex-direction: column; background: var(--chat-bg); }
.chat-hd {
  padding: 14px 20px; background: #f5f5f5; border-bottom: 1px solid var(--border);
  font-size: 15px; font-weight: 500;
}
#empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-light); font-size: 14px; }
#msgs { flex: 1; overflow-y: auto; padding: 16px 20px; }
.chat-hd, #msgs, .inp-area { display: none; }
#msgs::-webkit-scrollbar { width: 6px; }
#msgs::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }

/* ===== Messages ===== */
.m { display: flex; margin-bottom: 16px; gap: 8px; max-width: 75%; }
.m-in { align-self: flex-start; }
.m-out { align-self: flex-end; flex-direction: row-reverse; margin-left: auto; }
.m-av {
  width: 34px; height: 34px; border-radius: 4px; background: #ddd;
  display: flex; align-items: center; justify-content: center; font-size: 11px; color: #666; flex-shrink: 0;
}
.m-out .m-av { background: var(--green); color: #fff; }
.m-body { display: flex; flex-direction: column; }
.m-in .m-body { align-items: flex-start; }
.m-out .m-body { align-items: flex-end; }
.m-c {
  padding: 10px 14px; border-radius: 8px; font-size: 14px; line-height: 1.5; word-break: break-word;
}
.m-in .m-c { background: var(--bubble-in); }
.m-out .m-c { background: var(--bubble-out); }
.m-t { font-size: 11px; color: var(--text-light); margin-top: 3px; padding: 0 4px; }
.m-img { max-width: 220px; max-height: 300px; border-radius: 6px; cursor: pointer; display: block; }
.m-voice { display: flex; align-items: center; gap: 6px; cursor: pointer; min-width: 80px; }
.m-voice-txt { font-size: 12px; color: var(--text-light); margin-top: 2px; }
.m-voice-bar { display: flex; align-items: center; gap: 4px; }
.m-voice-save { font-size: 11px; color: var(--text-light); cursor: pointer; text-decoration: underline; }
.m-voice-save:hover { color: var(--text); }
.m-ref { font-size: 12px; color: var(--text-light); border-left: 2px solid #ccc; padding-left: 8px; margin-bottom: 6px; }
.m-file { display: flex; align-items: center; gap: 6px; }
.m-sys { text-align: center; color: var(--text-light); font-size: 12px; margin: 12px 0; }

/* ===== Input ===== */
.inp-area {
  padding: 10px 16px; background: #f5f5f5; border-top: 1px solid var(--border);
  flex-direction: column; gap: 6px;
}
.inp-toolbar { display: flex; gap: 2px; }
.inp-row { display: flex; gap: 8px; align-items: center; }
.ib {
  width: 32px; height: 32px; border: none; background: none; font-size: 18px;
  cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center;
}
.ib:hover { background: #e5e5e5; }
.ib.rec { background: #fdd; color: #e64340; }
.ib-logout { width: auto; height: auto; font-size: 12px; color: #aaa; padding: 2px 6px; }
#msg-in {
  flex: 1; border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px;
  font-size: 14px; outline: none; background: #fff;
}
#msg-in:focus { border-color: var(--green); }
.btn-send {
  background: var(--green); color: #fff; border: none; padding: 8px 18px;
  border-radius: 6px; font-size: 14px; cursor: pointer; flex-shrink: 0;
}
.btn-send:hover { background: var(--green-dark); }

/* ===== Modal ===== */
.modal {
  display: none; position: fixed; inset: 0; background: rgba(0,0,0,.85);
  z-index: 1000; justify-content: center; align-items: center; cursor: pointer;
}
.modal.show { display: flex; }
.modal img { max-width: 90%; max-height: 90%; border-radius: 8px; }
.rec-tip {
  display: none; position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
  background: rgba(0,0,0,.7); color: #fff; padding: 14px 24px; border-radius: 12px; font-size: 14px; z-index: 100;
}
.rec-tip.show { display: block; }

@media (max-width: 640px) {
  .side { width: 72px; }
  .ci-info, .ci-meta { display: none; }
  .ci { justify-content: center; padding: 12px 8px; }
}
</style>
</head>
<body>

<div id="login-screen">
  <div class="login-card">
    <h1>微信 Bot Demo</h1>
    <p class="sub">扫码连接微信，在浏览器中收发消息</p>
    <div id="qr-box"><button class="btn-g" id="login-btn" onclick="startLogin()">开始连接</button></div>
    <div id="login-status"></div>
    <div style="margin-top:24px;font-size:12px;color:#bbb">&copy; <a href="https://www.seeles.ai" target="_blank" style="color:#999;text-decoration:none">seeles.ai</a></div>
  </div>
</div>

<div id="chat-screen">
  <div class="side">
    <div class="side-hd">
      <span>会话</span>
      <div style="display:flex;align-items:center;gap:6px">
        <span id="poll-st"><span class="dot"></span> 在线</span>
        <button class="ib ib-logout" onclick="doLogout()" title="登出">登出</button>
      </div>
    </div>
    <div id="conv-list"></div>
  </div>
  <div class="main">
    <div class="chat-hd" id="chat-hd"></div>
    <div id="empty">选择一个会话开始聊天</div>
    <div id="msgs"></div>
    <div class="inp-area" id="inp-area">
      <input type="file" id="img-file" accept="image/*" hidden>
      <div class="inp-toolbar">
        <button class="ib" onclick="document.getElementById('img-file').click()" title="图片">📷</button>
      </div>
      <div class="inp-row">
        <input type="text" id="msg-in" placeholder="输入消息..." autocomplete="off">
        <button class="btn-send" onclick="doSendText()">发送</button>
      </div>
    </div>
  </div>
</div>

<div class="modal" id="img-modal" onclick="this.classList.remove('show')"><img id="modal-img"></div>
<div class="rec-tip" id="rec-tip">🎤 松开发送，上划取消</div>

<script type="module">
import { encode as silkEncode, decode as silkDecode } from 'https://cdn.jsdelivr.net/npm/silk-wasm@3.7.1/lib/index.mjs';
window.silkEncode = silkEncode;
window.silkDecode = silkDecode;

// ==================== State ====================
const S = {
  token: null, baseUrl: null, botId: null, buf: '',
  convs: {},       // id -> { msgs:[], ctx:'', unread:0 }
  active: null,    // current conversation userId
  polling: false,
  seen: new Set(), // message_id dedup
};
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function shortId(id) { return id ? id.replace(/@.*$/, '').slice(0, 8) : '?'; }
function fmtTime(ms) {
  if (!ms) return '';
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return p(d.getHours()) + ':' + p(d.getMinutes());
}

// ==================== Login ====================
let loginPoll = false;

async function startLogin() {
  $('login-btn').disabled = true;
  $('login-status').textContent = '获取二维码中...';
  try {
    const r = await fetch('/api/login', { method: 'POST' });
    const d = await r.json();
    if (!d.qrcode_url) throw new Error(d.error || 'failed');
    $('qr-box').innerHTML =
      '<div><img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' +
      encodeURIComponent(d.qrcode_url) + '" width="220" height="220" style="border-radius:8px">' +
      '<p style="margin-top:10px;font-size:13px;color:#999">用微信扫描二维码</p></div>';
    $('login-status').textContent = '等待扫码...';
    doPollLogin(d.qrcode);
  } catch (e) {
    $('login-status').innerHTML = '<span class="err">' + esc(e.message) + '</span>';
    $('login-btn').disabled = false;
  }
}

async function doPollLogin(qr) {
  if (loginPoll) return;
  loginPoll = true;
  while (loginPoll) {
    try {
      const r = await fetch('/api/login/status?qrcode=' + encodeURIComponent(qr));
      const d = await r.json();
      if (d.status === 'scaned') $('login-status').textContent = '已扫码，请在手机确认...';
      else if (d.status === 'confirmed') {
        loginPoll = false;
        S.token = d.bot_token; S.baseUrl = d.baseurl; S.botId = d.ilink_bot_id;
        $('login-status').innerHTML = '<span class="ok">连接成功!</span>';
        setTimeout(enterChat, 500);
        return;
      } else if (d.status === 'expired') {
        loginPoll = false;
        $('login-status').innerHTML = '<span class="err">二维码过期</span>';
        $('qr-box').innerHTML = '<button class="btn-g" onclick="startLogin()">重新连接</button>';
        return;
      }
    } catch (e) { console.error(e); }
    await sleep(1500);
  }
}

// ==================== Chat ====================
function enterChat() {
  $('login-screen').style.display = 'none';
  $('chat-screen').style.display = 'flex';
  startPoll();
}

async function startPoll() {
  S.polling = true;
  while (S.polling) {
    try {
      const r = await fetch('/api/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: S.token, baseUrl: S.baseUrl, buf: S.buf }),
      });
      const d = await r.json();
      if (d.errcode === -14) {
        S.polling = false;
        alert('会话过期，请重新登录');
        location.reload();
        return;
      }
      if (d.get_updates_buf) S.buf = d.get_updates_buf;
      if (d.msgs?.length) processMsgs(d.msgs);
    } catch (e) {
      console.error('poll err', e);
      $('poll-st').innerHTML = '<span style="color:#e64340">离线</span>';
      await sleep(3000);
      $('poll-st').innerHTML = '<span class="dot"></span> 在线';
    }
  }
}

function processMsgs(msgs) {
  let changed = false;
  for (const msg of msgs) {
    if (msg.message_state === 1) continue;
    if (msg.message_id && S.seen.has(msg.message_id)) continue;
    if (msg.message_id) S.seen.add(msg.message_id);

    const isUser = msg.message_type === 1;
    const uid = isUser ? msg.from_user_id : msg.to_user_id;
    if (!uid || uid === S.botId) continue;

    if (!S.convs[uid]) S.convs[uid] = { msgs: [], ctx: '', unread: 0 };
    const c = S.convs[uid];
    if (isUser && msg.context_token) {
      c.ctx = msg.context_token;
      fireTyping(uid, msg.context_token);
    }
    c.msgs.push(msg);
    if (uid !== S.active && isUser) c.unread++;
    changed = true;
  }
  if (changed) { renderSide(); if (S.active) renderMsgs(); }
}

// ==================== Typing ====================
async function fireTyping(uid, ctx) {
  try {
    await fetch('/api/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: S.token, baseUrl: S.baseUrl, to: uid, contextToken: ctx }),
    });
  } catch (e) { /* ignore */ }
}

// ==================== Render Sidebar ====================
function renderSide() {
  const entries = Object.entries(S.convs).sort((a, b) => {
    const ta = a[1].msgs.at(-1)?.create_time_ms || 0;
    const tb = b[1].msgs.at(-1)?.create_time_ms || 0;
    return tb - ta;
  });
  $('conv-list').innerHTML = entries.map(([uid, c]) => {
    const last = c.msgs.at(-1);
    const txt = preview(last);
    const tm = fmtTime(last?.create_time_ms);
    const act = uid === S.active ? ' active' : '';
    const bdg = c.unread > 0 ? '<div class="badge">' + c.unread + '</div>' : '';
    return '<div class="ci' + act + '" onclick="pickConv(\\'' + esc(uid) + '\\')">' +
      '<div class="ci-av">' + esc(shortId(uid)) + '</div>' +
      '<div class="ci-info"><div class="ci-name">' + esc(shortId(uid)) + '</div><div class="ci-last">' + esc(txt) + '</div></div>' +
      '<div class="ci-meta"><div class="ci-time">' + tm + '</div>' + bdg + '</div></div>';
  }).join('');
}

function preview(msg) {
  if (!msg?.item_list) return '';
  for (const it of msg.item_list) {
    if (it.type === 1) return it.text_item?.text || '';
    if (it.type === 2) return '[图片]';
    if (it.type === 3) return '[语音]';
    if (it.type === 4) return '[文件]';
    if (it.type === 5) return '[视频]';
  }
  return '';
}

// ==================== Render Messages ====================
function pickConv(uid) {
  S.active = uid;
  const c = S.convs[uid];
  if (c) c.unread = 0;
  $('empty').style.display = 'none';
  $('chat-hd').style.display = 'block'; $('chat-hd').textContent = shortId(uid);
  $('msgs').style.display = 'block';
  $('inp-area').style.display = 'flex';
  renderSide(); renderMsgs();
  $('msg-in').focus();
}

function doLogout() {
  if (!confirm('确定登出？')) return;
  S.polling = false;
  S.token = null; S.baseUrl = null; S.botId = null; S.buf = '';
  S.convs = {}; S.active = null; S.seen.clear();
  $('chat-screen').style.display = 'none';
  $('login-screen').style.display = 'flex';
  $('qr-box').innerHTML = '<button class="btn-g" onclick="startLogin()">开始连接</button>';
  $('login-status').textContent = '';
}

function renderMsgs() {
  const c = S.convs[S.active];
  if (!c) return;
  const el = $('msgs');
  const atBot = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  el.innerHTML = c.msgs.map(renderOneMsg).join('');
  if (atBot) el.scrollTop = el.scrollHeight;
}

function renderOneMsg(msg) {
  const out = msg.message_type === 2;
  const cls = out ? 'm-out' : 'm-in';
  const av = out ? 'Bot' : esc(shortId(msg.from_user_id));
  const tm = fmtTime(msg.create_time_ms);
  const content = renderItems(msg);
  return '<div class="m ' + cls + '"><div class="m-av">' + av + '</div>' +
    '<div class="m-body"><div class="m-c">' + content + '</div><div class="m-t">' + tm + '</div></div></div>';
}

function renderItems(msg) {
  let h = '';
  for (const it of (msg.item_list || [])) {
    if (it.ref_msg) {
      const rt = it.ref_msg.message_item;
      const rtxt = rt?.type === 1 ? (rt.text_item?.text || '') : rt?.type === 2 ? '[图片]' : '';
      h += '<div class="m-ref">' + esc(it.ref_msg.title || '') + ' ' + esc(rtxt) + '</div>';
    }
    switch (it.type) {
      case 1:
        h += '<div>' + esc(it.text_item?.text || '') + '</div>';
        break;
      case 2: {
        console.log('image_item:', JSON.stringify(it.image_item));
        const key = it.image_item?.aeskey || it.image_item?.media?.aes_key;
        const param = it.image_item?.media?.encrypt_query_param;
        if (param && key) {
          const src = '/api/media?param=' + encodeURIComponent(param) + '&key=' + encodeURIComponent(key);
          h += '<img class="m-img" src="' + src + '" loading="lazy" onclick="openImg(this.src)">';
        } else if (it.image_item?.url) {
          h += '<img class="m-img" src="' + esc(it.image_item.url) + '" loading="lazy" onclick="openImg(this.src)">';
        } else {
          h += '<div>[图片]</div>';
        }
        break;
      }
      case 3: {
        const vtxt = it.voice_item?.text;
        const dur = it.voice_item?.voice_length;
        const ds = dur ? Math.ceil(dur / 1000) + '\\'\\'' : '';
        const vkey = it.voice_item?.media?.aes_key;
        const vparam = it.voice_item?.media?.encrypt_query_param;
        if (vparam && vkey) {
          const src = '/api/media?param=' + encodeURIComponent(vparam) + '&key=' + encodeURIComponent(vkey);
          h += '<div class="m-voice-bar">';
          h += '<div class="m-voice" onclick="playVoice(this,\\'' + src + '\\')">🎙️ ' + ds + ' <span>▶</span></div>';
          h += '<span class="m-voice-save" onclick="saveVoice(\\'' + src + '\\')">保存WAV</span>';
          h += '<span class="m-voice-save" onclick="saveRawSilk(\\'' + src + '\\')">保存SILK</span>';
          h += '</div>';
        } else {
          h += '<div class="m-voice">🎙️ ' + ds + '</div>';
        }
        if (vtxt) h += '<div class="m-voice-txt">' + esc(vtxt) + '</div>';
        break;
      }
      case 4:
        h += '<div class="m-file">📎 ' + esc(it.file_item?.file_name || '文件') + '</div>';
        break;
      case 5:
        h += '<div>🎬 视频</div>';
        break;
      default:
        if (it.type) h += '<div>[类型:' + it.type + ']</div>';
    }
  }
  return h || '<div>[空]</div>';
}

// ==================== Send Text ====================
async function doSendText() {
  const inp = $('msg-in');
  const text = inp.value.trim();
  if (!text || !S.active) return;
  const c = S.convs[S.active];
  if (!c?.ctx) { alert('等待对方发送消息后才能回复'); return; }
  inp.value = '';
  // optimistic
  c.msgs.push({ message_type: 2, message_state: 2, to_user_id: S.active, create_time_ms: Date.now(),
    item_list: [{ type: 1, text_item: { text } }] });
  renderMsgs(); renderSide();
  try {
    await fetch('/api/send/text', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: S.token, baseUrl: S.baseUrl, to: S.active, contextToken: c.ctx, text }),
    });
  } catch (e) { console.error('send err', e); }
}

// ==================== Send Image ====================
$('img-file').addEventListener('change', async e => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file || !S.active) return;
  const c = S.convs[S.active];
  if (!c?.ctx) { alert('等待对方发送消息后才能回复'); return; }
  const url = URL.createObjectURL(file);
  c.msgs.push({ message_type: 2, message_state: 2, to_user_id: S.active, create_time_ms: Date.now(),
    item_list: [{ type: 2, image_item: { url } }] });
  renderMsgs(); renderSide();
  const fd = new FormData();
  fd.append('image', file);
  fd.append('token', S.token);
  fd.append('baseUrl', S.baseUrl || '');
  fd.append('to', S.active);
  fd.append('contextToken', c.ctx);
  try {
    const r = await fetch('/api/send/image', { method: 'POST', body: fd });
    const d = await r.json();
    if (d.error) { console.error('img send err', d.error); alert('图片发送失败: ' + d.error); }
  } catch (e) { console.error('img send err', e); alert('图片发送失败: ' + e.message); }
});

// ==================== Voice Record ====================
let recorder = null, chunks = [], recording = false;
const vbtn = $('vbtn');
vbtn.addEventListener('mousedown', startRec);
vbtn.addEventListener('mouseup', stopRec);
vbtn.addEventListener('mouseleave', stopRec);
vbtn.addEventListener('touchstart', e => { e.preventDefault(); startRec(); });
vbtn.addEventListener('touchend', e => { e.preventDefault(); stopRec(); });

async function startRec() {
  if (recording || !S.active) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(stream);
    chunks = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      if (chunks.length) sendVoice(new Blob(chunks, { type: 'audio/webm' }));
    };
    recorder.start();
    recording = true;
    vbtn.classList.add('rec');
    $('rec-tip').classList.add('show');
  } catch (e) { alert('无法访问麦克风'); }
}

function stopRec() {
  if (!recording || !recorder) return;
  recorder.stop();
  recording = false;
  vbtn.classList.remove('rec');
  $('rec-tip').classList.remove('show');
}

async function sendVoice(blob) {
  if (!S.active) return;
  const c = S.convs[S.active];
  if (!c?.ctx) return;

  // Optimistic UI
  const msgIdx = c.msgs.length;
  c.msgs.push({ message_type: 2, message_state: 2, to_user_id: S.active, create_time_ms: Date.now(),
    item_list: [{ type: 3, voice_item: { text: '编码中...' } }] });
  renderMsgs();

  try {
    // 1. Decode WebM to PCM
    const arrayBuf = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
    audioCtx.close();

    // 2. Resample to 24kHz mono
    const targetRate = 24000;
    const offCtx = new OfflineAudioContext(1, Math.ceil(audioBuf.duration * targetRate), targetRate);
    const src = offCtx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(offCtx.destination);
    src.start();
    const resampled = await offCtx.startRendering();
    const float32 = resampled.getChannelData(0);

    // 3. Float32 -> Int16 (pcm_s16le)
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 32768 : s * 32767;
    }

    // 4. Encode to SILK via WASM
    const result = await silkEncode(new Uint8Array(int16.buffer), targetRate);
    console.log('SILK encoded:', result.data?.length, 'bytes, duration:', result.duration);

    // Update UI with duration
    const durSec = Math.ceil(result.duration / 1000);
    c.msgs[msgIdx].item_list[0].voice_item = { text: null, voice_length: result.duration };
    renderMsgs();

    // 5. Upload SILK to worker
    const fd = new FormData();
    fd.append('voice', new Blob([result.data]), 'voice.silk');
    fd.append('token', S.token);
    fd.append('baseUrl', S.baseUrl || '');
    fd.append('to', S.active);
    fd.append('contextToken', c.ctx);
    fd.append('duration', String(result.duration));
    const r = await fetch('/api/send/voice', { method: 'POST', body: fd });
    const d = await r.json();
    if (d.error) { console.error('voice err', d.error); alert('语音发送失败: ' + d.error); }
  } catch (e) {
    console.error('voice err', e);
    c.msgs[msgIdx].item_list[0].voice_item = { text: '发送失败' };
    renderMsgs();
    alert('语音发送失败: ' + e.message);
  }
}

// ==================== Voice Playback ====================
let currentSource = null;
let currentCtx = null;

async function decodeSilk(silkBuf) {
  const result = await silkDecode(silkBuf, 24000);
  // result.data is Uint8Array of raw PCM s16le bytes, reinterpret as Int16Array
  const pcm = new Int16Array(result.data.buffer, result.data.byteOffset, result.data.byteLength / 2);
  return { pcm, sampleRate: 24000 };
}

function pcmToAudioBuffer(ctx, int16, sampleRate) {
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  const buf = ctx.createBuffer(1, float32.length, sampleRate);
  buf.copyToChannel(float32, 0);
  return buf;
}

function pcmToWavBlob(int16, sampleRate) {
  const numSamples = int16.length;
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  // RIFF header
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  const output = new Int16Array(buffer, 44);
  output.set(int16);
  return new Blob([buffer], { type: 'audio/wav' });
}

async function playVoice(el, src) {
  // Stop current playback
  if (currentSource) { try { currentSource.stop(); } catch(e){} currentSource = null; }
  if (currentCtx) { currentCtx.close(); currentCtx = null; }

  const span = el.querySelector('span');
  span.textContent = '⏳';
  try {
    const r = await fetch(src);
    const silkBuf = await r.arrayBuffer();
    const { pcm, sampleRate } = await decodeSilk(silkBuf);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    currentCtx = ctx;
    const audioBuf = pcmToAudioBuffer(ctx, pcm, sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = audioBuf;
    source.connect(ctx.destination);
    source.onended = () => { span.textContent = '▶'; currentSource = null; ctx.close(); currentCtx = null; };
    currentSource = source;
    span.textContent = '⏸';
    source.start();
  } catch (e) {
    span.textContent = '▶';
    console.error('play err', e);
    alert('语音播放失败: ' + e.message);
  }
}

async function saveVoice(src) {
  try {
    const r = await fetch(src);
    const silkBuf = await r.arrayBuffer();
    const { pcm, sampleRate } = await decodeSilk(silkBuf);
    const wavBlob = pcmToWavBlob(pcm, sampleRate);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voice_' + Date.now() + '.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('save err', e);
    alert('语音保存失败: ' + e.message);
  }
}

async function saveRawSilk(src) {
  try {
    const r = await fetch(src);
    const buf = await r.arrayBuffer();
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voice_' + Date.now() + '.silk';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('save silk err', e);
    alert('保存失败: ' + e.message);
  }
}

// ==================== Image Modal ====================
function openImg(src) { $('modal-img').src = src; $('img-modal').classList.add('show'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('img-modal').classList.remove('show'); });
$('msg-in').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSendText(); } });

// Expose to inline onclick handlers (module scope)
window.startLogin = startLogin;
window.doLogout = doLogout;
window.pickConv = pickConv;
window.doSendText = doSendText;
window.playVoice = playVoice;
window.saveVoice = saveVoice;
window.saveRawSilk = saveRawSilk;
window.openImg = openImg;
</script>
</body>
</html>`;
}
