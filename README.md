# Huiman Ark（绘漫方舟）

<p align="center">
  <img src="./public/favicon.svg" alt="Huiman Ark Logo" width="120" />
</p>
<p align="center">
  <a href="https://github.com/GL-Wen/huiman-ark"><img src="https://img.shields.io/github/stars/GL-Wen/huiman-ark?style=social" alt="GitHub Repo stars" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js" alt="Next.js" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript" alt="TypeScript" /></a>
  <a href="https://huiman.antmoo.com"><img src="https://img.shields.io/badge/Live_Demo-huiman.antmoo.com-brightgreen" alt="Live Demo" /></a>
  <a href="https://x.com/antmoch"><img src="https://img.shields.io/badge/X-@antmoch-000000?style=flat&logo=x" alt="Twitter/X" /></a>
</p>

中文 | [English](./README.en.md)

> ⭐️ **如果这个项目对你的 AI 漫画创作、分镜生成或 Next.js 全栈开发有所启发，欢迎右上角点个 Star ⭐️ 支持一下！**

将故事变成分镜脚本、角色设定和漫画画面的 AI 创作工具。使用 Next.js、React、TypeScript 和 Tailwind CSS 构建，支持中文、英文和日文界面。

项目采用 [MIT 许可证](./LICENSE)，可免费使用、修改、分发和商业使用。无需注册、登录或充值；支持使用部署者的默认 API 配置，也可在界面填写自己的配置。接口费用由所使用 Key 对应的服务商账户承担。

## 在线使用与支持

不会部署可以先访问 [在线体验站](https://huiman.antmoo.com)。**目前体验站仍为旧积分版，本仓库的免费版尚未同步部署。** 需要新版使用帮助或部署协助，请联系作者。

公开支持联系方式：微信 **13623839679** · 邮箱 [toowell2015@126.com](mailto:toowell2015@126.com) · QQ **3575554244** · X (Twitter) [@antmoch](https://x.com/antmoch)。这些是作者授权公开的使用支持信息。

在已部署的新版页面中，无需自行部署或注册绘漫方舟账号：

1. 点击绘漫方舟右上角“API 设置”。请求地址、文本模型、图像模型和 API Key 均可留空，继承部署者提供的默认配置。
2. 如需自备 Key，填写对应接口的 Key。使用默认 AntMoo 接口时，可在 [AntMoo API 注册账号](https://api.antmoo.cc/register)，登录后前往 [API 令牌页](https://api.antmoo.cc/console/token) 创建 Key。
3. 输入故事，生成大纲、角色和漫画。使用步骤和联系方式也可从“使用帮助”打开。

软件免费；API 服务商可能收取模型调用费用，具体以服务商说明为准。

## 功能

- 从故事生成分镜脚本、角色设定图和漫画页。
- 自定义接口、文本与图像模型，以及角色、画风、画面比例、段落数和每页格数。
- 使用参考图片保持角色和画面风格。
- 在当前浏览器的 IndexedDB 中保存创作会话，无需数据库或云账户。
- 请求地址和模型偏好保存在本地；界面填写的 API Key 仅保存在页面内存中，刷新后需要重新填写。

## 界面预览

![Huiman Ark Screenshot 1](./public/1.png)
![Huiman Ark Screenshot 2](./public/2.png)

截图用于展示创作界面，具体控件以当前版本为准。

## 本地运行

需要 Node.js **22.18 或以上**、**pnpm 10.34.5**。API Key 可由部署环境提供，也可在界面填写。

```bash
git clone https://github.com/GL-Wen/huiman-ark.git
cd huiman-ark
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)，按需填写 API 设置，然后输入故事开始创作。

内置默认接口为 `https://api.antmoo.cc`，文本模型为 `claude-opus-5-5`，图像模型为 `gpt-image-2`。部署者可在 `.env.local` 中修改默认值，并按需提供服务端默认 Key：

```dotenv
AI_API_BASE_URL=https://api.antmoo.cc
AI_TEXT_MODEL=claude-opus-5-5
AI_IMAGE_MODEL=gpt-image-2
AI_API_KEY=
```

每项按“用户填写的非空值 → 环境变量非空值 → 内置默认值”生效；Key 没有内置值。若部署者配置了默认 Key，访客留空即使用部署者的接口额度。更换为不同 origin 的接口时必须填写自己的 Key，服务器不会把默认 Key 转发到其他 origin。

地址填写服务根地址，不添加 `/v1`；用户改用不同地址时仅支持公网 HTTPS。兼容服务需提供所配置模型，支持文本 `chat/completions`、图像 `images/generations` 和 `images/edits` 接口，并返回 Base64 图像（`b64_json`）；仅返回远程图片 URL 的服务不受支持。

生产运行与完整配置见 [部署指南](./docs/deployment.md)。

## 数据与 API Key

创作会话、请求地址和模型偏好保存在当前浏览器，清除网站数据或更换浏览器后无法恢复，请及时下载需要保留的作品。界面填写的 API Key 不写入 IndexedDB 或 localStorage；环境变量中的默认 Key 仅留在服务端。公开配置接口 `/api/ai/config` 仅返回默认地址、模型和 `hasApiKey`，不返回真实 Key。生成请求经过本应用服务器转发给配置的 AI 服务。

仅在自己部署或信任的 HTTPS 站点中输入 Key。部署者能够接触转发请求，应避免记录请求头、请求体及 Key。

## 开发与贡献

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

欢迎提交 Issue 和 Pull Request，步骤见 [贡献指南](./CONTRIBUTING.md)。安全问题请按 [安全报告说明](./SECURITY.md) 私下反馈。

第三方依赖遵循各自许可证。上传素材和生成内容的使用应尊重相关权利，并遵守所使用 API 服务商的条款。
