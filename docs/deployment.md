# 部署指南

绘漫方舟是一个 Next.js 应用，无需 Supabase、数据库、账号系统或充值服务。创作会话保存在浏览器 IndexedDB 中，生成请求由 Next.js Route Handler 转发。

## 本地启动

安装 Node.js 22.18 或以上版本，以及 pnpm 10.34.5。若尚未安装 pnpm，可运行 `npm install --global pnpm@10.34.5`。

```bash
git clone https://github.com/GL-Wen/huiman-ark.git
cd huiman-ark
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

访问 <http://localhost:3000>，在 API 设置中填写 Key。刷新页面后需要重新填写，已有创作会话仍从当前浏览器恢复。

## 环境变量

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `AI_API_BASE_URL` | `https://api.antmoo.cc` | 服务端访问的兼容接口根地址，不添加 `/v1` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | SEO 使用的网站公开地址，生产环境填写实际 HTTPS 地址 |

文本固定使用 `claude-opus-5-5`，图像生成和编辑固定使用 `gpt-image-2`。上游需提供这两个模型，并支持 `/v1/chat/completions`、`/v1/images/generations` 和 multipart `/v1/images/edits`；参考图片通过图像编辑接口发送。图像响应必须提供 `data[].b64_json`；仅返回远程图片 URL 时应用返回 502，不会下载该 URL。

应用不使用共享 API Key。每个用户在界面填写所配置接口对应的 Key，每个生成请求携带该 Key，由应用服务器转发。默认填写 `https://api.antmoo.cc` 对应的 Key；若部署者更换接口，用户也须使用新接口的 Key。API 用量费用由用户向该接口服务商承担。

## 生产运行

将 `.env.local` 中的 `NEXT_PUBLIC_SITE_URL` 改为实际地址，然后执行：

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

`pnpm start` 默认监听 3000 端口。使用现有部署环境的进程管理和 HTTPS 反向代理运行即可。需要完整 Next.js 服务端，不能仅作为静态文件部署。图像生成可能耗时较长，反向代理应为 `/api/ai/*` 设置足够的请求超时时间；部署平台自身的执行时限仍然有效。

修改 `NEXT_PUBLIC_SITE_URL` 后重新构建。不要在环境变量中填写用户 Key，也不要提交 `.env.local`。

## 数据与安全

- 使用 HTTPS，仅在自己部署或信任的站点填写 API Key。站点服务器和配置的 AI 服务商能够接触 Key 及生成内容。
- 不记录 Authorization 请求头、请求体、Key、原始上游错误或其他敏感内容；反向代理和监控平台也应遵循此设置。
- API Key 只保存在页面内存中，不持久化；会话中的故事、参考图和生成结果保存在用户浏览器。清除网站数据会丢失本地会话，请下载重要作品。

## 常见问题

- **401 / 403**：确认 Key 属于当前部署配置的接口，且有权限调用固定模型；刷新后需要重新填写 Key。
- **404 / 不支持模型**：确认服务根地址未添加 `/v1`，且服务商支持所需接口和模型。
- **502 / 图像响应格式不支持**：确认上游返回 Base64 图像 `b64_json`，而非仅返回远程 URL。
- **请求超时**：检查上游状态、反向代理超时和部署平台执行时限。
- **无法恢复会话**：确认使用同一浏览器、同一网站地址，并允许 IndexedDB；浏览器隐私模式可能不保留数据。
