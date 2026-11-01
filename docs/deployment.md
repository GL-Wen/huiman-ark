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
| `AI_API_BASE_URL` | `https://api.antmoo.cc` | 兼容接口根地址，或以 `/v1`、`/v3` 等版本号结尾的 API 基础地址 |
| `AI_TEXT_MODEL` | `claude-opus-5-5` | 默认文本模型 |
| `AI_IMAGE_MODEL` | `gpt-image-2` | 默认图像生成和编辑模型 |
| `AI_API_KEY` | 空 | 可选服务端默认 Key，真实值不要提交到仓库 |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | SEO 使用的网站公开地址，生产环境填写实际 HTTPS 地址 |

每项配置优先级为：**用户填写的非空值 → 环境变量非空值 → 内置默认值**。地址和模型的内置默认值如表所列；Key 没有内置值，用户和部署环境均未提供时无法生成。点击“恢复默认”会清空用户填写的四项覆盖值，重新使用部署默认值。

部署环境的默认地址支持 HTTP/HTTPS，可由部署者配置可信内网服务。用户填写与默认地址不同的地址时，仅支持公网 HTTPS，允许公网域名或 IP 及合法端口；不接受 URL 中的账号密码、查询参数或片段，拒绝内网、环回、保留 IP 及解析到这些地址的域名。填写与部署默认完全相同的地址视为继承默认。

服务根地址会自动追加 `/v1`；已包含版本号的 API 基础地址直接追加 `chat/completions`、`images/generations` 或 `images/edits`，不会重复版本号。上游需提供所选模型及对应接口；通用图像服务的参考图片通过 multipart 图像编辑接口发送，响应必须提供 `data[].b64_json`。百炼千问图像的 JSON 请求和官方 OSS 图片返回由专用分支处理；其他远程图片 URL 仍返回 502，不会下载。

火山方舟普通 API 地址为 `https://ark.cn-beijing.volces.com/api/v3`，与 Plan 套餐入口不同。[Agent Plan](https://console.volcengine.com/ark/region:cn-beijing/docs/agent-plan-personal-get-started) 使用 `/api/plan/v3`，[Coding Plan](https://console.volcengine.com/ark/region:cn-beijing/docs/coding-plan-personal-get-started) 使用 `/api/coding/v3`，并需匹配套餐 Key 和模型名称；普通 API 调通不代表消耗 Plan 额度。Next.js 不会自动加载 `.env.vocels` 这类自定义命名的环境文件，需按需将配置放入 `.env.local` 或使用 Node.js 的 `--env-file` 显式加载。

## 多平台文本调用

在 API 设置中选择“文本平台”，即可分别配置火山普通 API、Agent Plan、Coding Plan、阿里普通 API、Coding Plan 和 Claude。每套地址、模型与 Key 独立切换；命名平台始终要求自己的 Key，即使与部署接口位于同一域名，也不会继承部署 Key。只有“默认 / 自定义”继承上方环境变量。所有界面 Key 仅保留在当前页面内存中，刷新后清空；平台选择、地址、模型和 Workspace ID 保存在本机。

| 平台 | 默认文本 API 基础地址 | 默认模型 |
| --- | --- | --- |
| 火山普通 API | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-seed-2-1-lite-260915` |
| 火山 Agent Plan | `https://ark.cn-beijing.volces.com/api/plan/v3` | `doubao-seed-2.1-lite` |
| 火山 Coding Plan | `https://ark.cn-beijing.volces.com/api/coding/v3` | `doubao-seed-2.1-lite` |
| 阿里普通 API（北京） | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| 阿里 Coding Plan（中国站） | `https://coding.dashscope.aliyuncs.com/v1` | `qwen3.7-plus` |
| Claude 官方 API | `https://api.anthropic.com/v1` | `claude-opus-5-5` |

地址和模型均可修改，实际可用模型由账户权限决定。[阿里百炼](https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope) 的 Key 与地域绑定，也可替换为控制台提供的业务空间专属域名；[Coding Plan](https://help.aliyun.com/zh/model-studio/coding-plan) 的套餐 Key 和入口需配套使用。

文本统一经 `/api/ai/chat` 使用 OpenAI 兼容协议，返回 `{ content }`。[Claude 官方兼容接口](https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk) 的请求不发送 `temperature`，避免部分模型拒绝该参数；未绑定工作空间的 Key 可填写 Workspace ID。原生 Messages 的提示词缓存等能力暂未接入。文本上游的 401、403、429 保留相应状态，连接错误返回 502，超时返回 504。

图像仍使用“默认 / 自定义”中的地址、Key 和图像模型，文本平台切换不覆盖这些配置。

## 火山方舟 Seedream 图像

`.env.vocels` 使用普通方舟 API `/api/v3`，图像模型更新为 `doubao-seedream-5-0-flash-260915`（Seedream 5.0 Flash）。填写已有方舟 Key 后显式加载此文件，在界面选择“默认 / 自定义”，图像模型留空继承该配置。已开通 Seedream 5.0 Pro 的账户也可改填 `doubao-seedream-5-0-pro-260628`。普通 API 与 Plan 的 Key 和额度独立，不会自动改用 Plan。

Seedream 5.0 Pro / Flash 的文生图和参考图编辑统一使用 JSON `images/generations`，参考图传入 `image` 数组，不调用 multipart `images/edits`。按横竖方向请求 `2816x1584` / `1584x2816`，显式指定 `response_format=b64_json`、`output_format=png`、`watermark=false`，直接返回可保存的 PNG 数据。请求参数见[火山方舟官方文档](https://console.volcengine.com/ark/region:cn-beijing/docs/image-generation-api)。

## 百炼千问图像

`.env.ali` 默认配置 `AI_IMAGE_MODEL=qwen-image-2.1-pro`，与文本共用北京地域普通 API Key。填写 Key 后使用文件注释中的命令启动，并在界面选择“默认 / 自定义”；图像模型留空即可继承该值。

支持千问图像 `qwen-image-2.1-pro`、`qwen-image-2.1-turbo`、`qwen-image-3.0` 和 `qwen-image-3.0-pro`，接口规则见[百炼官方文档](https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference)。文生图和参考图编辑均走同域的原生同步接口 `/api/v1/services/aigc/multimodal-generation/generation`，通过 JSON `input.messages` 和 `parameters` 发送，不依赖文本域名是否提供 OpenAI Images 入口。参考图只接受本地 JPEG、PNG、WebP，每张最多 10 MiB。2.1 模型覆盖项目现有的 6 张参考图上限，3.0 模型最多 3 张。输出按所选方向请求 `1536x864` 或 `864x1536`。

百炼返回临时图片 URL，服务端只下载官方 `dashscope-*.oss-*.aliyuncs.com` 的 HTTPS 图片，验证公网 DNS 并固定连接地址，拒绝重定向，限制图片大小为 25 MiB，校验 PNG 签名后转换为 Base64。下载不携带 API Key，结果仍可用于当前项目的会话保存和导出。

若本地代理为官方 OSS 域名返回 `198.18.0.0/15` Fake-IP，下载前会通过阿里公共 DNS 的 HTTPS 接口取得真实 A 记录，继续验证所有地址为公网地址后固定连接。该处理仅限官方百炼结果域名，不放开内网、环回和其他保留地址，也不修改系统代理配置。

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
- **404 / 不支持模型**：确认地址为服务根地址或带版本号的 API 基础地址，且服务商支持所需接口和模型；火山方舟普通 API、Agent Plan 和 Coding Plan 的地址、Key 与模型名称需对应。
- **502 / 图像响应格式不支持**：通用图像接口需返回 Base64 `b64_json`；百炼千问图像需返回官方 DashScope OSS PNG 地址，不能返回其他域名或重定向。
- **请求超时**：检查上游状态、反向代理超时和部署平台执行时限。
- **无法恢复会话**：确认使用同一浏览器、同一网站地址，并允许 IndexedDB；浏览器隐私模式可能不保留数据。
