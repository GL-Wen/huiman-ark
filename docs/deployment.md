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

访问 <http://localhost:3000>，在“API 设置”中按需填写请求地址、文本模型、图像模型和 Key。每项留空继承部署默认值。地址和模型偏好在本地保存；界面填写的 Key 刷新后清空，已有创作会话仍从当前浏览器恢复。

## 环境变量

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `AI_API_BASE_URL` | `https://api.antmoo.cc` | 服务端访问的兼容接口根地址，不添加 `/v1` |
| `AI_TEXT_MODEL` | `claude-opus-5-5` | 默认文本模型 |
| `AI_IMAGE_MODEL` | `gpt-image-2` | 默认图像生成和编辑模型 |
| `AI_API_KEY` | 空 | 可选服务端默认 Key，真实值不要提交到仓库 |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | SEO 使用的网站公开地址，生产环境填写实际 HTTPS 地址 |

每项配置优先级为：**用户填写的非空值 → 环境变量非空值 → 内置默认值**。地址和模型的内置默认值如表所列；Key 没有内置值，用户和部署环境均未提供时无法生成。点击“恢复默认”会清空用户填写的四项覆盖值，重新使用部署默认值。

部署环境的默认地址支持 HTTP/HTTPS，可由部署者配置可信内网服务。用户填写与默认地址不同的地址时，仅支持公网 HTTPS，允许公网域名或 IP 及合法端口；不接受 URL 中的账号密码、查询参数或片段，拒绝内网、环回、保留 IP 及解析到这些地址的域名。填写与部署默认完全相同的地址视为继承默认。

上游需提供所选模型，并支持 `/v1/chat/completions`、`/v1/images/generations` 和 multipart `/v1/images/edits`；参考图片通过图像编辑接口发送。图像响应必须提供 `data[].b64_json`；仅返回远程图片 URL 时应用返回 502，不会下载该 URL。

若配置 `AI_API_KEY`，访客不填 Key 时会使用部署者的接口额度；用户填写自己的 Key 后，费用由其 Key 对应的服务商账户承担。默认 Key 仅可用于默认接口的同一 origin（协议、域名和端口）；用户改用其他 origin 时须提供自己的 Key，服务器不会把默认 Key 转发给其他站点。

`GET /api/ai/config` 只返回公开的默认请求地址、文本模型、图像模型和 `hasApiKey`，不会返回真实 `AI_API_KEY`。

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

修改 `NEXT_PUBLIC_SITE_URL` 后重新构建。服务端默认 Key 仅配置为 `AI_API_KEY`，不要放入任何 `NEXT_PUBLIC_*` 变量，也不要提交 `.env.local`。

## 数据与安全

- 使用 HTTPS，仅在自己部署或信任的站点填写 API Key。站点服务器和配置的 AI 服务商能够接触 Key 及生成内容。
- 不记录 Authorization 请求头、请求体、Key、原始上游错误或其他敏感内容；反向代理和监控平台也应遵循此设置。
- 用户在界面填写的 API Key 只保存在页面内存中；服务端默认 Key 不下发浏览器。请求地址、模型偏好、故事、参考图和生成结果保存在用户浏览器。清除网站数据会丢失这些本地数据，请下载重要作品。

## 常见问题

- **401 / 403**：确认用户或部署环境已提供 Key，Key 属于当前接口且有模型权限；切换到其他 origin 时需填写自己的 Key。
- **404 / 不支持模型**：确认服务根地址未添加 `/v1`，且服务商支持所需接口和模型。
- **502 / 图像响应格式不支持**：确认上游返回 Base64 图像 `b64_json`，而非仅返回远程 URL。
- **请求超时**：检查上游状态、反向代理超时和部署平台执行时限。
- **无法恢复会话**：确认使用同一浏览器、同一网站地址，并允许 IndexedDB；浏览器隐私模式可能不保留数据。
