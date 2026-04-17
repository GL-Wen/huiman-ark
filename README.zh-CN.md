# Huiman Ark (绘漫方舟)

<p align="center">
  <img src="./public/favicon.svg" alt="Huiman Ark Logo" width="120" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.x-blue" alt="React" />
  <img src="https://img.shields.io/badge/Next.js-16.x-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC" alt="Tailwind CSS" />
</p>

<p align="center">
  中文 | <a href="./README.en.md">English</a>
</p>

> Huiman Ark (绘漫方舟) 是一个开源的 AI 漫画生成工具。
>
> 它结合大语言模型 (LLM) 与 AI 图像生成能力，帮助用户将文字故事快速转化为分镜脚本和漫画画面。

## 在线演示

- Demo: [https://huiman.antmoo.com](https://huiman.antmoo.com)

## 特性

- 故事转漫画: 输入故事内容，自动生成分镜脚本和对应画面。
- 角色与画风控制: 支持自定义角色设定和多种动漫风格配置。
- 灵活排版: 可在侧边栏配置段落数与每段格子数，参数会自动持久化。
- 国际化支持: 基于 `next-intl` 提供多语言界面。
- 轻量状态管理: 使用 Zustand 管理交互状态，提升编辑体验。

## 界面预览

<div align="center">
  <img src="./public/1.png" alt="Huiman Ark Screenshot 1" width="800" />
</div>

<br />

<div align="center">
  <img src="./public/2.png" alt="Huiman Ark Screenshot 2" width="800" />
</div>

## 技术栈

- 框架: [Next.js](https://nextjs.org/) (App Router)
- UI: [React](https://reactjs.org/)
- 语言: [TypeScript](https://www.typescriptlang.org/)
- 样式: [Tailwind CSS](https://tailwindcss.com/)
- 状态管理: [Zustand](https://github.com/pmndrs/zustand)
- 国际化: [next-intl](https://next-intl.dev/)
- 图标: [Lucide React](https://lucide.dev/)

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/huiman-ark.git
cd huiman-ark
```

### 2. 安装依赖

```bash
npm install
```

或使用：

```bash
yarn install
pnpm install
```

### 3. 配置接口信息

核心功能依赖外部 AI 接口，请先在 `src/config/app.ts` 中配置 API 域名与 Key。

### 4. 启动开发环境

```bash
npm run dev
```

或使用：

```bash
yarn dev
pnpm dev
```

启动后访问 [http://localhost:3000](http://localhost:3000)。

## 国际化文档结构

- `README.md`: 默认入口页，用于 GitHub 首页展示与语言切换。
- `README.zh-CN.md`: 中文完整文档。
- `README.en.md`: 英文完整文档。

## 参与贡献

欢迎通过 Issue 或 Pull Request 参与改进。

1. Fork 本仓库
2. 创建分支: `git checkout -b feature/AmazingFeature`
3. 提交修改: `git commit -m "Add some AmazingFeature"`
4. 推送分支: `git push origin feature/AmazingFeature`
5. 发起 Pull Request

## 协议与商用

- 开源协议: 当前 README 标注为 MIT，建议补充正式 `LICENSE` 文件以便仓库声明更完整。
- 商用授权: 如需商用，请联系 `toowell2015@126.com`。
