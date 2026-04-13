<!--
 * @Author: wenguoliang
 * @Date: 2026-03-29 16:19:32
 * @FilePath: /huiman-ark/README.md
 * @Description: Do not edit
-->

# Huiman Ark (绘漫方舟)

<p align="center">
  <img src="./public/favicon.svg" alt="Huiman Ark Logo" width="120" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
  <img src="https://img.shields.io/badge/React-18.x-blue" alt="React" />
  <img src="https://img.shields.io/badge/Next.js-15.x-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC" alt="Tailwind CSS" />
</p>

> 🚀 **Huiman Ark (绘漫方舟)** 是一个开源的 <span style="font-size: 1.1em; color: #E91E63; font-weight: bold;">AI 漫画生成工具</span>。
>
> 通过结合 <span style="color: #2196F3; font-weight: bold;">大语言模型 (LLM)</span> 和 <span style="color: #00BCD4; font-weight: bold;">AI 图像生成技术</span>，它能帮助用户轻松地将文字故事转化为精美的漫画。

## ✨ 特性 (Features)

- **📖 故事到漫画的智能转换**: 输入你的故事，自动生成分镜脚本和画面。
- **🎨 角色与画风控制**: 支持自定义角色设定和多种动漫风格 (`animeStyles`)。
- **📐 灵活的排版控制**: 支持在侧边栏自定义段落数和每段漫画格子数，参数自动持久化保存，精准控制 LLM 提示词。
- **🌐 国际化支持**: 内置多语言支持 (基于 `next-intl`)。
- **⚡ 极致体验**: 基于 Next.js 构建，搭配 Zustand 状态管理，提供流畅的交互和极速的响应。

## 📸 界面预览 (Screenshots)

<div align="center">
  <img src="./public/1.png" alt="Huiman Ark Screenshot 1" width="800" />
</div>

<br />

<div align="center">
  <img src="./public/2.png" alt="Huiman Ark Screenshot 2" width="800" />
</div>

## 🛠️ 技术栈 (Tech Stack)

- **框架**: [Next.js](https://nextjs.org/) (App Router)
- **UI 库**: [React](https://reactjs.org/)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **状态管理**: [Zustand](https://github.com/pmndrs/zustand)
- **国际化**: [next-intl](https://next-intl-docs.vercel.app/)
- **图标**: [Lucide React](https://lucide.dev/)

## 🚀 快速开始 (Getting Started)

### 1. 克隆项目

```bash
git clone https://github.com/your-username/huiman-ark.git
cd huiman-ark
```

### 2. 安装依赖

```bash
npm install
# 或者使用 yarn / pnpm
yarn install
pnpm install
```

### 3. 配置 API Key

<p style="background-color: #fff3cd; color: #856404; padding: 10px; border-left: 5px solid #ffeeba; border-radius: 4px;">
  ⚠️ <strong>重要提示：</strong> 项目需要在 <code>src/config/app.ts</code> 中配置 API 请求域名和 Key。请打开该文件并填入相应的配置才能正常运行核心功能！
</p>

### 4. 运行开发服务器

```bash
npm run dev
# 或者
yarn dev
pnpm dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可预览。

## 🤝 参与贡献 (Contributing)

我们非常欢迎所有的贡献！如果你有任何想法、建议或发现了 Bug，请提交 Issue 或 Pull Request。

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 开源协议 (License)

本项目基于 [MIT 协议](LICENSE) 开源。请自由地使用、修改和分发。

---

<p align="center">
  Made with ❤️ by the open source community.
</p>
