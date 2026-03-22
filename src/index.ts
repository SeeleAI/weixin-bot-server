import type { Env } from "./types";
import {
  DEFAULT_BASE_URL,
  fetchQRCode,
  pollQRStatus,
  getUpdates,
  sendTextMessage,
  sendImageMessage,
  sendVoiceMessage,
  getUploadUrl,
  uploadToCDN,
  getConfig,
  sendTyping,
} from "./weixin";
import { downloadAndDecrypt, generateAesKey, aesEcbEncrypt, md5hex, detectMime } from "./media";
import { chatPage } from "./frontend";
import { randomBytes } from "node:crypto";

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    try {
      return await route(request, url);
    } catch (err) {
      console.error("Error:", err);
      return json({ error: String(err) }, 500);
    }
  },
} satisfies ExportedHandler<Env>;

async function route(request: Request, url: URL): Promise<Response> {
  console.log(`${request.method} ${url.pathname}${url.search}`);

  // ==================== Page ====================
  if (url.pathname === "/" && request.method === "GET") {
    return new Response(chatPage(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // ==================== Login ====================
  if (url.pathname === "/api/login" && request.method === "POST") {
    const qr = await fetchQRCode(DEFAULT_BASE_URL);
    return json({ qrcode: qr.qrcode, qrcode_url: qr.qrcode_img_content });
  }

  if (url.pathname === "/api/login/status" && request.method === "GET") {
    const qrcode = url.searchParams.get("qrcode");
    if (!qrcode) return json({ error: "missing qrcode" }, 400);
    const status = await pollQRStatus(DEFAULT_BASE_URL, qrcode, 25_000);
    return json(status);
  }

  // ==================== Poll ====================
  if (url.pathname === "/api/poll" && request.method === "POST") {
    const { token, baseUrl, buf } = (await request.json()) as {
      token: string;
      baseUrl?: string;
      buf?: string;
    };
    if (!token) return json({ error: "missing token" }, 400);
    const resp = await getUpdates(baseUrl || DEFAULT_BASE_URL, token, buf || "", 15_000);
    return json(resp);
  }

  // ==================== Send Text ====================
  if (url.pathname === "/api/send/text" && request.method === "POST") {
    const { token, baseUrl, to, contextToken, text } = (await request.json()) as {
      token: string;
      baseUrl?: string;
      to: string;
      contextToken: string;
      text: string;
    };
    if (!token || !to || !text) return json({ error: "missing params" }, 400);
    await sendTextMessage(baseUrl || DEFAULT_BASE_URL, token, to, contextToken, text);
    return json({ ok: true });
  }

  // ==================== Send Image ====================
  if (url.pathname === "/api/send/image" && request.method === "POST") {
    const formData = await request.formData();
    const token = formData.get("token") as string;
    const baseUrl = (formData.get("baseUrl") as string) || DEFAULT_BASE_URL;
    const to = formData.get("to") as string;
    const contextToken = formData.get("contextToken") as string;
    const imageFile = formData.get("image") as File;

    if (!token || !to || !imageFile) return json({ error: "missing params" }, 400);

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const aesKey = generateAesKey();
    const aesKeyHex = aesKey.toString("hex");
    const encrypted = aesEcbEncrypt(aesKey, imageBuffer);
    const rawMd5 = md5hex(imageBuffer);
    const fileKey = randomBytes(8).toString("hex");

    const uploadResp = await getUploadUrl(baseUrl, token, {
      filekey: fileKey,
      media_type: 1,
      to_user_id: to,
      rawsize: imageBuffer.length,
      rawfilemd5: rawMd5,
      filesize: encrypted.length,
      no_need_thumb: true,
      aeskey: aesKeyHex,
    });

    const downloadParam = await uploadToCDN(uploadResp.upload_param, fileKey, encrypted);

    await sendImageMessage(baseUrl, token, to, contextToken, {
      encrypt_query_param: downloadParam,
      aes_key: Buffer.from(aesKeyHex).toString("base64"),
      encrypt_type: 1,
    }, encrypted.length);

    return json({ ok: true });
  }

  // ==================== Send Voice (SILK) ====================
  if (url.pathname === "/api/send/voice" && request.method === "POST") {
    const formData = await request.formData();
    const token = formData.get("token") as string;
    const baseUrl = (formData.get("baseUrl") as string) || DEFAULT_BASE_URL;
    const to = formData.get("to") as string;
    const contextToken = formData.get("contextToken") as string;
    const voiceFile = formData.get("voice") as File;
    if (!token || !to || !voiceFile) return json({ error: "missing params" }, 400);

    const voiceBuffer = Buffer.from(await voiceFile.arrayBuffer());
    const duration = parseInt(formData.get("duration") as string) || 0;
    console.log(`[voice] file=${voiceFile.name} size=${voiceBuffer.length} duration=${duration} to=${to}`)
    console.log(`[voice] header: ${voiceBuffer.slice(0, 12).toString("hex")}`);

    const aesKey = generateAesKey();
    const aesKeyHex = aesKey.toString("hex");
    const encrypted = aesEcbEncrypt(aesKey, voiceBuffer);
    const rawMd5 = md5hex(voiceBuffer);
    const fileKey = randomBytes(8).toString("hex");

    console.log(`[voice] encrypted=${encrypted.length} rawMd5=${rawMd5} fileKey=${fileKey}`);

    const uploadResp = await getUploadUrl(baseUrl, token, {
      filekey: fileKey,
      media_type: 4,
      to_user_id: to,
      rawsize: voiceBuffer.length,
      rawfilemd5: rawMd5,
      filesize: encrypted.length,
      no_need_thumb: true,
      aeskey: aesKeyHex,
    });
    console.log(`[voice] uploadResp:`, JSON.stringify(uploadResp));

    const downloadParam = await uploadToCDN(uploadResp.upload_param, fileKey, encrypted);
    console.log(`[voice] downloadParam=${downloadParam.slice(0, 40)}...`);

    const media = {
      encrypt_query_param: downloadParam,
      aes_key: Buffer.from(aesKeyHex).toString("base64"),
      encrypt_type: 1,
    };
    console.log(`[voice] sendVoiceMessage duration=${duration} media.aes_key=${media.aes_key}`);

    await sendVoiceMessage(baseUrl, token, to, contextToken, media, duration);
    console.log(`[voice] sent OK`);

    return json({ ok: true, silk_b64: voiceBuffer.toString("base64").slice(0, 100) });
  }

  // ==================== Typing ====================
  if (url.pathname === "/api/typing" && request.method === "POST") {
    const { token, baseUrl, to, contextToken } = (await request.json()) as {
      token: string;
      baseUrl?: string;
      to: string;
      contextToken?: string;
    };
    if (!token || !to) return json({ error: "missing params" }, 400);
    try {
      const config = await getConfig(baseUrl || DEFAULT_BASE_URL, token, to, contextToken);
      if (config.typing_ticket) {
        await sendTyping(baseUrl || DEFAULT_BASE_URL, token, to, config.typing_ticket, 1);
      }
      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: String(e) });
    }
  }

  // ==================== Media Proxy ====================
  if (url.pathname === "/api/media" && request.method === "GET") {
    const param = url.searchParams.get("param");
    const key = url.searchParams.get("key");
    if (!param || !key) return json({ error: "missing params" }, 400);

    const decrypted = await downloadAndDecrypt(param, key);
    const mime = detectMime(new Uint8Array(decrypted));

    return new Response(decrypted, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return json({ error: "Not Found" }, 404);
}
