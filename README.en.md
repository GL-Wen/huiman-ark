# Huiman Ark

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
  <a href="./README.zh-CN.md">中文</a> | English
</p>

> Huiman Ark is an open source AI comic generation tool.
>
> It combines LLMs and AI image generation to turn text stories into storyboard scripts and comic panels.

## Demo

- Online demo: [https://huiman.antmoo.com](https://huiman.antmoo.com)

## Features

- Story to comic: Generate storyboard scripts and panels from story input.
- Character and style control: Supports custom character settings and multiple anime style presets.
- Flexible layout: Configure paragraph count and panel count per paragraph in the sidebar with persisted settings.
- Internationalization: Built-in multilingual UI support powered by `next-intl`.
- Smooth experience: Built with Next.js and Zustand for responsive interactions.

## Screenshots

<div align="center">
  <img src="./public/1.png" alt="Huiman Ark Screenshot 1" width="800" />
</div>

<br />

<div align="center">
  <img src="./public/2.png" alt="Huiman Ark Screenshot 2" width="800" />
</div>

## Tech Stack

- Framework: [Next.js](https://nextjs.org/) (App Router)
- UI: [React](https://reactjs.org/)
- Language: [TypeScript](https://www.typescriptlang.org/)
- Styling: [Tailwind CSS](https://tailwindcss.com/)
- State management: [Zustand](https://github.com/pmndrs/zustand)
- i18n: [next-intl](https://next-intl.dev/)
- Icons: [Lucide React](https://lucide.dev/)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/huiman-ark.git
cd huiman-ark
```

### 2. Install dependencies

```bash
npm install
```

Or use:

```bash
yarn install
pnpm install
```

### 3. Configure API settings

Core features rely on external AI services. Configure the API host and key in `src/config/app.ts` before running the app.

### 4. Start the development server

```bash
npm run dev
```

Or use:

```bash
yarn dev
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Documentation Structure

- `README.md`: Default landing page with language navigation.
- `README.zh-CN.md`: Full Chinese documentation.
- `README.en.md`: Full English documentation.

## Contributing

Contributions via Issues and Pull Requests are welcome.

1. Fork the repository
2. Create a branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m "Add some AmazingFeature"`
4. Push the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

## License and Commercial Use

- License: The README currently references MIT. Adding an actual `LICENSE` file is recommended for a complete repository setup.
- Commercial use: Contact `toowell2015@126.com` for authorization.
