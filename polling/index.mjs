/**
 * 微信消息轮询中继器
 *
 * 长驻运行，通过 getUpdates 长轮询拉取微信消息，
 * 收到消息后 POST 到 CF Worker 的 webhook 端点处理。
 *
 * 环境变量:
 *   WEIXIN_TOKEN     - 微信 bot token（从登录页面获取）
 *   WEIXIN_BASE_URL  - 微信 API 地址（默认 https://ilinkai.weixin.qq.com）
 *   WEBHOOK_URL      - CF Worker webhook 地址（如 https://weixin-worker.seeleai.workers.dev/api/webhook）
 *   WEBHOOK_SECRET   - Webhook 鉴权密钥（需和 Worker 的 API_SECRET 一致）
 *
 * 用法:
 *   WEIXIN_TOKEN=xxx WEBHOOK_URL=https://your-worker.workers.dev/api/webhook node polling/index.mjs
 */

const WEIXIN_BASE_URL = process.env.WEIXIN_BASE_URL || "https://ilinkai.weixin.qq.com";
const WEIXIN_TOKEN = process.env.WEIXIN_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const CHANNEL_VERSION = "1.0.2";
const LONG_POLL_TIMEOUT_MS = 35_000;
const MAX_CONSECUTIVE_FAILURES = 3;

if (!WEIXIN_TOKEN) {
  console.error("Missing WEIXIN_TOKEN env var");
  process.exit(1);
}
if (!WEBHOOK_URL) {
  console.error("Missing WEBHOOK_URL env var");
  process.exit(1);
}

function randomWechatUin() {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  const view = new DataView(buf.buffer);
  return Buffer.from(String(view.getUint32(0))).toString("base64");
}

function buildHeaders() {
  return {
    "Content-Type": "application/json",
    AuthorizationType: "ilink_bot_token",
    Authorization: `Bearer ${WEIXIN_TOKEN}`,
    "X-WECHAT-UIN": randomWechatUin(),
  };
}

async function getUpdates(buf, timeoutMs = LONG_POLL_TIMEOUT_MS) {
  const url = `${WEIXIN_BASE_URL}/ilink/bot/getupdates`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        get_updates_buf: buf,
        base_info: { channel_version: CHANNEL_VERSION },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text();
    if (!res.ok) throw new Error(`getUpdates ${res.status}: ${text}`);
    return JSON.parse(text);
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      return { ret: 0, msgs: [], get_updates_buf: buf };
    }
    throw err;
  }
}

async function forwardToWebhook(msgs) {
  const headers = { "Content-Type": "application/json" };
  if (WEBHOOK_SECRET) {
    headers["Authorization"] = `Bearer ${WEBHOOK_SECRET}`;
  }
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ msgs }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Webhook error ${res.status}: ${text}`);
  }
  return res.ok;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`Starting polling relay`);
  console.log(`  Base URL:    ${WEIXIN_BASE_URL}`);
  console.log(`  Webhook URL: ${WEBHOOK_URL}`);
  console.log(`  Token:       ${WEIXIN_TOKEN.substring(0, 8)}...`);

  let buf = "";
  let failures = 0;

  while (true) {
    try {
      const resp = await getUpdates(buf);

      if (resp.errcode === -14) {
        console.error("Session expired (errcode -14), exiting");
        process.exit(1);
      }

      const isError =
        (resp.ret !== undefined && resp.ret !== 0) ||
        (resp.errcode !== undefined && resp.errcode !== 0);

      if (isError) {
        failures++;
        console.error(`getUpdates error: ret=${resp.ret} errcode=${resp.errcode} errmsg=${resp.errmsg} (${failures}/${MAX_CONSECUTIVE_FAILURES})`);
        if (failures >= MAX_CONSECUTIVE_FAILURES) {
          console.error("Too many failures, backing off 30s");
          failures = 0;
          await sleep(30_000);
        } else {
          await sleep(2_000);
        }
        continue;
      }

      failures = 0;

      if (resp.get_updates_buf) {
        buf = resp.get_updates_buf;
      }

      const msgs = resp.msgs ?? [];
      if (msgs.length > 0) {
        console.log(`Received ${msgs.length} message(s), forwarding to webhook...`);
        const ok = await forwardToWebhook(msgs);
        if (ok) {
          console.log(`Forwarded ${msgs.length} message(s) OK`);
        }
      }
    } catch (err) {
      failures++;
      console.error(`Poll error (${failures}/${MAX_CONSECUTIVE_FAILURES}):`, err.message);
      if (failures >= MAX_CONSECUTIVE_FAILURES) {
        failures = 0;
        await sleep(30_000);
      } else {
        await sleep(2_000);
      }
    }
  }
}

main();
