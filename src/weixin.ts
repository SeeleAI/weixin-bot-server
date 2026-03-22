import type { GetUpdatesResp, QRCodeResponse, QRStatusResponse } from "./types";

const BOT_TYPE = "3";
const CHANNEL_VERSION = "1.0.2";
export const DEFAULT_BASE_URL = "https://ilinkai.weixin.qq.com";
const CDN_BASE = "https://novac2c.cdn.weixin.qq.com/c2c";

function randomWechatUin(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const view = new DataView(bytes.buffer);
  return btoa(String(view.getUint32(0)));
}

function randomClientId(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    AuthorizationType: "ilink_bot_token",
    "X-WECHAT-UIN": randomWechatUin(),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function buildBaseInfo() {
  return { channel_version: CHANNEL_VERSION };
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

// ==================== Login ====================

export async function fetchQRCode(baseUrl = DEFAULT_BASE_URL): Promise<QRCodeResponse> {
  const base = ensureTrailingSlash(baseUrl);
  const res = await fetch(`${base}ilink/bot/get_bot_qrcode?bot_type=${encodeURIComponent(BOT_TYPE)}`);
  if (!res.ok) throw new Error(`fetchQRCode: ${res.status}`);
  return res.json();
}

export async function pollQRStatus(
  baseUrl: string,
  qrcode: string,
  timeoutMs = 25_000,
): Promise<QRStatusResponse> {
  const base = ensureTrailingSlash(baseUrl);
  const url = `${base}ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "iLink-App-ClientVersion": "1" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`pollQRStatus: ${res.status}`);
    return res.json();
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") return { status: "wait" };
    throw err;
  }
}

// ==================== Messages ====================

export async function getUpdates(
  baseUrl: string,
  token: string,
  buf: string,
  timeoutMs = 15_000,
): Promise<GetUpdatesResp> {
  const base = ensureTrailingSlash(baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}ilink/bot/getupdates`, {
      method: "POST",
      headers: buildHeaders(token),
      body: JSON.stringify({ get_updates_buf: buf, base_info: buildBaseInfo() }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text();
    if (!res.ok) throw new Error(`getUpdates: ${res.status} ${text}`);
    return JSON.parse(text);
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      return { ret: 0, msgs: [], get_updates_buf: buf };
    }
    throw err;
  }
}

export async function sendTextMessage(
  baseUrl: string,
  token: string,
  to: string,
  contextToken: string,
  text: string,
): Promise<void> {
  const base = ensureTrailingSlash(baseUrl);
  const res = await fetch(`${base}ilink/bot/sendmessage`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify({
      msg: {
        from_user_id: "",
        to_user_id: to,
        client_id: randomClientId(),
        message_type: 2,
        message_state: 2,
        item_list: [{ type: 1, text_item: { text } }],
        context_token: contextToken,
      },
      base_info: buildBaseInfo(),
    }),
  });
  const body = await res.text().catch(() => "");
  console.log(`[sendText] status=${res.status} body=${body}`);
  if (!res.ok) throw new Error(`sendTextMessage: ${res.status} ${body}`);
}

export async function sendImageMessage(
  baseUrl: string,
  token: string,
  to: string,
  contextToken: string,
  media: { encrypt_query_param: string; aes_key: string; encrypt_type: number },
  cipherSize: number,
): Promise<void> {
  const base = ensureTrailingSlash(baseUrl);
  const res = await fetch(`${base}ilink/bot/sendmessage`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify({
      msg: {
        from_user_id: "",
        to_user_id: to,
        client_id: randomClientId(),
        message_type: 2,
        message_state: 2,
        item_list: [{ type: 2, image_item: { media, mid_size: cipherSize } }],
        context_token: contextToken,
      },
      base_info: buildBaseInfo(),
    }),
  });
  const body = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`sendImageMessage: ${res.status} ${body}`);
}

// ==================== CDN Upload ====================

export async function getUploadUrl(
  baseUrl: string,
  token: string,
  params: {
    filekey: string;
    media_type: number;
    to_user_id: string;
    rawsize: number;
    rawfilemd5: string;
    filesize: number;
    no_need_thumb: boolean;
    aeskey: string;
  },
): Promise<{ upload_param: string }> {
  const base = ensureTrailingSlash(baseUrl);
  const res = await fetch(`${base}ilink/bot/getuploadurl`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify({ ...params, base_info: buildBaseInfo() }),
  });
  if (!res.ok) throw new Error(`getUploadUrl: ${res.status}`);
  return res.json();
}

export async function uploadToCDN(
  uploadParam: string,
  fileKey: string,
  encryptedData: Buffer,
): Promise<string> {
  const url = `${CDN_BASE}/upload?encrypted_query_param=${encodeURIComponent(uploadParam)}&filekey=${encodeURIComponent(fileKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: encryptedData,
  });
  if (!res.ok) throw new Error(`CDN upload: ${res.status}`);
  const param = res.headers.get("x-encrypted-param");
  if (!param) throw new Error("CDN upload: missing x-encrypted-param");
  return param;
}

export async function sendVoiceMessage(
  baseUrl: string,
  token: string,
  to: string,
  contextToken: string,
  media: { encrypt_query_param: string; aes_key: string; encrypt_type: number },
  durationMs: number,
): Promise<void> {
  const base = ensureTrailingSlash(baseUrl);
  const payload = {
    msg: {
      from_user_id: "",
      to_user_id: to,
      client_id: randomClientId(),
      message_type: 2,
      message_state: 2,
      item_list: [{
        type: 3,
        voice_item: {
          media,
          playtime: durationMs,
        },
      }],
      context_token: contextToken,
    },
    base_info: buildBaseInfo(),
  };
  console.log(`[sendVoice] payload=${JSON.stringify(payload)}`);
  const res = await fetch(`${base}ilink/bot/sendmessage`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await res.text().catch(() => "");
  console.log(`[sendVoice] status=${res.status} body=${body}`);
  if (!res.ok) throw new Error(`sendVoiceMessage: ${res.status} ${body}`);
}

// ==================== Typing ====================

export async function getConfig(
  baseUrl: string,
  token: string,
  userId: string,
  contextToken?: string,
): Promise<{ typing_ticket?: string }> {
  const base = ensureTrailingSlash(baseUrl);
  const body: Record<string, unknown> = { ilink_user_id: userId, base_info: buildBaseInfo() };
  if (contextToken) body.context_token = contextToken;
  const res = await fetch(`${base}ilink/bot/getconfig`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`getConfig: ${res.status}`);
  return res.json();
}

export async function sendTyping(
  baseUrl: string,
  token: string,
  userId: string,
  typingTicket: string,
  status: 1 | 2 = 1,
): Promise<void> {
  const base = ensureTrailingSlash(baseUrl);
  const res = await fetch(`${base}ilink/bot/sendtyping`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify({
      ilink_user_id: userId,
      typing_ticket: typingTicket,
      status,
      base_info: buildBaseInfo(),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`sendTyping error: ${res.status} ${text}`);
  }
}
