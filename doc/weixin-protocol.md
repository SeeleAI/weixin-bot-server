# 微信 Bot 协议技术分析

基于 `@tencent-weixin/openclaw-weixin@1.0.2` 源码的逆向分析。

## 一、协议概览

- **协议类型**: REST API over HTTPS（纯 HTTP POST，无 WebSocket）
- **数据格式**: JSON
- **默认 Base URL**: `https://ilinkai.weixin.qq.com`
- **CDN Base URL**: `https://novac2c.cdn.weixin.qq.com/c2c`
- **端点前缀**: `ilink/bot/`

## 二、API 端点

| 端点 | 方法 | 用途 | 超时 |
|------|------|------|------|
| `ilink/bot/get_bot_qrcode` | GET | 获取登录二维码 | - |
| `ilink/bot/get_qrcode_status` | GET | 轮询扫码状态（长轮询） | 35s |
| `ilink/bot/getupdates` | POST | 长轮询拉取新消息 | 35s |
| `ilink/bot/sendmessage` | POST | 发送消息 | 15s |
| `ilink/bot/getuploadurl` | POST | 获取 CDN 上传预签名 URL | 15s |
| `ilink/bot/getconfig` | POST | 获取账号配置（typing ticket） | 10s |
| `ilink/bot/sendtyping` | POST | 发送/取消输入状态 | 10s |

## 三、请求头

所有 POST 请求包含：

```
Content-Type: application/json
AuthorizationType: ilink_bot_token
Authorization: Bearer {bot_token}
Content-Length: {byte_length}
X-WECHAT-UIN: {base64(string(random_uint32))}
SKRouteTag: {optional_route_tag}
```

- `X-WECHAT-UIN`: 每次请求随机生成一个 uint32，转十进制字符串，再 base64 编码
- `SKRouteTag`: 可选流量路由标签，从配置读取

所有 POST 请求体都包含：

```json
{
  "base_info": {
    "channel_version": "1.0.2"
  }
}
```

## 四、认证：QR 码登录

### 4.1 获取二维码

```
GET /ilink/bot/get_bot_qrcode?bot_type=3
```

响应：

```json
{
  "qrcode": "qr_code_id",
  "qrcode_img_content": "https://weixin.qq.com/x/..."
}
```

- `qrcode`: 用于后续状态轮询的标识
- `qrcode_img_content`: 需要渲染为二维码供用户扫描的 URL

### 4.2 轮询扫码状态

```
GET /ilink/bot/get_qrcode_status?qrcode={qrcode}
Headers: iLink-App-ClientVersion: 1
```

长轮询（~35 秒超时），返回：

```json
{
  "status": "wait | scaned | confirmed | expired",
  "bot_token": "...",
  "ilink_bot_id": "hex@im.bot",
  "baseurl": "https://ilinkai.weixin.qq.com",
  "ilink_user_id": "xxx@im.wechat"
}
```

**状态转移**：`wait` → `scaned` → `confirmed`（或 `expired`）

- `confirmed` 时返回 `bot_token`（后续所有 API 的凭证）和 `ilink_bot_id`（Bot 账号 ID）
- `expired` 时需重新获取二维码（最多自动刷新 3 次）

### 4.3 Token 特性

- 由微信服务端颁发，长期有效
- 无自动刷新机制
- 过期通过 `errcode=-14` 通知，需重新扫码

## 五、消息收取：GetUpdates 长轮询

### 5.1 请求

```
POST /ilink/bot/getupdates

{
  "get_updates_buf": "",
  "base_info": { "channel_version": "1.0.2" }
}
```

- `get_updates_buf`: 同步游标，首次传空字符串，后续传上次响应返回的值
- 游标是不透明的 Base64 编码缓冲区，客户端不应解析

### 5.2 响应

```json
{
  "ret": 0,
  "errcode": 0,
  "errmsg": "",
  "msgs": [ WeixinMessage, ... ],
  "get_updates_buf": "new_cursor",
  "longpolling_timeout_ms": 35000
}
```

- `ret=0` 或 `ret` 不存在表示成功
- `errcode=-14` 表示会话过期
- `longpolling_timeout_ms` 服务器建议的下次长轮询超时
- 客户端超时（AbortError）是正常情况，重新发起即可

### 5.3 同步游标机制

```
首次请求: get_updates_buf="" → 服务器返回初始消息 + 游标A
第二次:   get_updates_buf=游标A → 服务器返回增量消息 + 游标B
第三次:   get_updates_buf=游标B → 服务器 hold 等待新消息...
```

游标需要持久化，重启后可继续增量同步，避免重复。

## 六、消息格式

### 6.1 WeixinMessage

```typescript
{
  seq?: number,              // 消息序列号
  message_id?: number,       // 消息唯一 ID
  from_user_id?: string,     // 发送者 (e.g. "xxx@im.wechat")
  to_user_id?: string,       // 接收者 (e.g. "bot_id@im.bot")
  create_time_ms?: number,   // 创建时间戳（毫秒）
  session_id?: string,       // 会话 ID
  message_type?: number,     // 1=USER, 2=BOT
  message_state?: number,    // 0=NEW, 1=GENERATING, 2=FINISH
  item_list?: MessageItem[], // 消息内容列表
  context_token?: string     // 会话上下文令牌（回复时必须回传）
}
```

### 6.2 MessageItem

```typescript
{
  type?: number,             // 1=TEXT, 2=IMAGE, 3=VOICE, 4=FILE, 5=VIDEO
  text_item?: { text: string },
  image_item?: ImageItem,
  voice_item?: VoiceItem,
  file_item?: FileItem,
  video_item?: VideoItem,
  ref_msg?: { message_item?: MessageItem, title?: string }
}
```

### 6.3 Context Token

- 每条入站消息携带 `context_token`
- 回复时**必须原样回传**，缺失会被服务器拒绝
- 建议在内存中按 `accountId + userId` 缓存最新值

## 七、消息发送

### 7.1 SendMessage

```
POST /ilink/bot/sendmessage

{
  "msg": {
    "from_user_id": "",
    "to_user_id": "recipient@im.wechat",
    "client_id": "random_hex_32",
    "message_type": 2,
    "message_state": 2,
    "item_list": [
      { "type": 1, "text_item": { "text": "你好" } }
    ],
    "context_token": "from_inbound_message"
  },
  "base_info": { "channel_version": "1.0.2" }
}
```

- `client_id`: 随机生成的 32 字符十六进制字符串
- `message_type`: 固定为 2（BOT）
- `message_state`: 固定为 2（FINISH）
- 每个 MessageItem 单独一次请求（不支持批量）
- 文本和媒体必须分开发送

### 7.2 SendTyping

```
POST /ilink/bot/sendtyping

{
  "ilink_user_id": "user@im.wechat",
  "typing_ticket": "base64_ticket_from_getconfig",
  "status": 1
}
```

- `status=1`: 正在输入
- `status=2`: 取消输入
- `typing_ticket` 从 GetConfig 获取，TTL 24 小时

### 7.3 GetConfig

```
POST /ilink/bot/getconfig

{
  "ilink_user_id": "user@im.wechat",
  "context_token": "optional"
}
```

响应：

```json
{
  "ret": 0,
  "typing_ticket": "base64_encoded_ticket"
}
```

## 八、媒体处理

### 8.1 加密算法

- **算法**: AES-128-ECB
- **填充**: PKCS7
- **密钥**: 16 字节随机生成
- **密文大小**: `ceil((plaintext_size + 1) / 16) * 16`

### 8.2 AES 密钥编码

入站消息中有两种密钥编码方式（按优先级）：

1. `image_item.aeskey`（优先）: 16 字节的十六进制字符串 → `Buffer.from(hex, "hex")` → 16 字节 key
2. `media.aes_key`（备选）: Base64 编码 → `Buffer.from(b64, "base64")` → 如果 16 字节直接用，如果 32 字节当 hex 字符串再解码

### 8.3 CDN 下载（入站媒体）

**URL 构造**：

```
GET https://novac2c.cdn.weixin.qq.com/c2c/download?encrypted_query_param={encrypt_query_param}
```

**流程**：

```
1. 从 MessageItem 提取 encrypt_query_param 和 aes_key
2. 构造 CDN 下载 URL
3. GET 下载密文
4. AES-128-ECB 解密
5. 按 MIME 类型保存文件
```

**媒体优先级**: IMAGE > VIDEO > FILE > VOICE

下载大小限制：100 MB

### 8.4 CDN 上传（出站媒体）

**步骤一：获取上传 URL**

```
POST /ilink/bot/getuploadurl

{
  "filekey": "random_hex_16",
  "media_type": 1,         // 1=IMAGE, 2=VIDEO, 3=FILE, 4=VOICE
  "to_user_id": "user@im.wechat",
  "rawsize": 12345,        // 明文大小
  "rawfilemd5": "md5_hex", // 明文 MD5
  "filesize": 12352,       // 密文大小
  "no_need_thumb": true,   // 是否需要缩略图
  "aeskey": "hex_key"      // 十六进制编码 AES 密钥
}
```

响应：

```json
{
  "upload_param": "base64_encrypted_param",
  "thumb_upload_param": null
}
```

**步骤二：上传加密文件**

```
POST https://novac2c.cdn.weixin.qq.com/c2c/upload
  ?encrypted_query_param={upload_param}
  &filekey={filekey}
Content-Type: application/octet-stream
Body: AES-128-ECB 加密后的二进制数据
```

响应头：

```
x-encrypted-param: {download_query_param}  // 用于构造下载引用
x-error-message: {error}                   // 错误信息（如有）
```

重试策略：最多 3 次，4xx 立即放弃，5xx 重试。

**步骤三：构造消息引用**

上传完成后，使用响应头的 `x-encrypted-param` 构造 CDN 媒体引用：

```json
{
  "type": 2,
  "image_item": {
    "media": {
      "encrypt_query_param": "x-encrypted-param_value",
      "aes_key": "base64_encoded_key",
      "encrypt_type": 1
    },
    "mid_size": ciphertext_size
  }
}
```

### 8.5 语音处理

- 微信语音编码：SILK（encode_type=6），采样率 24kHz
- 如果 `voice_item.text` 存在，直接使用语音识别文字
- 否则下载并解密为 SILK，可转码为 WAV（PCM_S16LE, 单声道）

## 九、会话管理

### 9.1 Session Guard

- `errcode=-14` 表示会话过期
- 触发后暂停该账户所有 API 调用 60 分钟
- 暂停期间入站轮询、出站消息均被阻止
- 需要重新扫码登录恢复

### 9.2 错误处理策略

| 场景 | 处理 |
|------|------|
| 客户端超时（AbortError） | 正常，重新发起长轮询 |
| 3 次连续 API 失败 | 退避 30 秒 |
| `errcode=-14` | 暂停 60 分钟 |
| CDN 上传 4xx | 立即放弃 |
| CDN 上传 5xx | 重试（最多 3 次） |
| Config 获取失败 | 指数退避（2s → 1h） |

### 9.3 轮询循环

```
while (not aborted) {
  1. POST getupdates (长轮询，服务器 hold ~17s)
  2. 保存新的 get_updates_buf
  3. 遍历 msgs:
     - 过滤: 只处理 message_type=1 (USER)
     - 提取文本/媒体
     - 鉴权检查
     - 路由到 AI 管道
     - 发送回复
  4. 继续下一次轮询
}
```

## 十、多账号

- 每次扫码登录创建新账号条目
- 账号 ID 规范化：`xxx@im.bot` → `xxx-im-bot`（文件系统安全）
- 每个账号独立的 token、sync buffer、授权列表
- 支持按账号 + 用户隔离 AI 对话上下文

## 十一、数据持久化

```
~/.openclaw/
├── openclaw.json                              # 全局配置
└── openclaw-weixin/
    ├── accounts.json                          # 已注册账号 ID 列表 ["id1", "id2"]
    └── accounts/
        ├── {accountId}.json                   # 凭证 {token, baseUrl, userId, savedAt}
        └── {accountId}.sync.json              # 同步游标 {get_updates_buf}
```

凭证文件权限设为 `0o600`。

## 十二、ID 格式

| 类型 | 格式 | 示例 |
|------|------|------|
| Bot ID | `{hex}@im.bot` | `b0f5860fdecb@im.bot` |
| 用户 ID | `{hex}@im.wechat` | `a1b2c3d4e5f6@im.wechat` |
| 规范化 ID | `{hex}-im-bot` | `b0f5860fdecb-im-bot` |
| Client ID | 32 字符随机 hex | `06000035356fd213...` |
