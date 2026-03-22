# weixin-bot-server

## 在线试用

https://weixin-worker.seeleai.workers.dev

# 微信 Bot Demo

基于 Cloudflare Workers 的微信 Bot（基于 @tencent-weixin/openclaw-weixin），扫码即用，无需服务器。

## 核心功能

- **扫码登录** — 扫微信二维码即可在浏览器中使用，支持多人各自登录各自的号
- **会话列表** — 左侧展示所有对话，按最新消息排序，显示未读计数
- **消息收发** — 实时接收消息，支持发送文字和图片回复
- **消息展示** — 支持文字、图片、语音、文件等消息类型的显示，图片可点击全屏预览
- **语音播放与保存** — 收到的语音消息可在浏览器内播放，也可保存为 WAV 或原始 SILK 文件到本地
- **输入状态** — 收到消息后自动向对方展示"正在输入"状态
- **登出** — 一键清空浏览器状态，返回登录界面

## 开发部署

```bash
# 本地开发
npm run dev

# 部署
npm run deploy
```

By [SeeleAI](https://www.seeles.ai)

## License

MIT
