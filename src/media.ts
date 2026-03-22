import { createDecipheriv, createCipheriv, createHash, randomBytes } from "node:crypto";

const CDN_BASE = "https://novac2c.cdn.weixin.qq.com/c2c";

export function parseAesKey(keyStr: string): Buffer {
  if (/^[0-9a-fA-F]{32}$/.test(keyStr)) {
    return Buffer.from(keyStr, "hex");
  }
  const buf = Buffer.from(keyStr, "base64");
  if (buf.length === 16) return buf;
  if (buf.length === 32) {
    return Buffer.from(buf.toString("ascii"), "hex");
  }
  return buf;
}

export function aesEcbDecrypt(key: Buffer, data: Buffer): Buffer {
  const decipher = createDecipheriv("aes-128-ecb", key, Buffer.alloc(0));
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export function aesEcbEncrypt(key: Buffer, data: Buffer): Buffer {
  const cipher = createCipheriv("aes-128-ecb", key, Buffer.alloc(0));
  return Buffer.concat([cipher.update(data), cipher.final()]);
}

export async function downloadAndDecrypt(
  encryptQueryParam: string,
  aesKeyStr: string,
): Promise<Buffer> {
  const url = `${CDN_BASE}/download?encrypted_query_param=${encodeURIComponent(encryptQueryParam)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CDN download: ${res.status}`);
  const encrypted = Buffer.from(await res.arrayBuffer());
  const key = parseAesKey(aesKeyStr);
  return aesEcbDecrypt(key, encrypted);
}

export function generateAesKey(): Buffer {
  return randomBytes(16);
}

export function md5hex(data: Buffer): string {
  return createHash("md5").update(data).digest("hex");
}

export function detectMime(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return "image/gif";
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return "image/webp";
  return "application/octet-stream";
}
