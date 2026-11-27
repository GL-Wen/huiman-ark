# Huiman Ark

<p align="center">
  <img src="./public/favicon.svg" alt="Huiman Ark Logo" width="96" />
</p>
<p align="center">
  <strong>Turn stories and novels into character-consistent multi-panel comics & vertical webtoon strips</strong>
</p>
<p align="center">
  <a href="https://github.com/GL-Wen/huiman-ark"><img src="https://img.shields.io/github/stars/GL-Wen/huiman-ark?style=social" alt="GitHub Repo stars" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js" alt="Next.js" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.8-blue?style=flat&logo=typescript" alt="TypeScript" /></a>
  <a href="https://huiman.antmoo.com"><img src="https://img.shields.io/badge/Live_Workspace-huiman.antmoo.com-brightgreen" alt="Live Workspace" /></a>
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FGL-Wen%2Fhuiman-ark"><img src="https://vercel.com/button" alt="Deploy with Vercel" /></a>
</p>

<p align="center">
  <a href="./README.md">中文</a> | English · <a href="https://huiman.antmoo.com">Live Workspace (Built-in No-Key Example)</a> · <a href="./docs/deployment.md">Deployment Guide</a>
</p>

---

## Showcase: Character Sheet → Consistent Multi-Panel Pages

No LoRA training required: Huiman Ark extracts structured character profiles from your story script, generates an ensemble design sheet and standalone portraits, and **dynamically injects appearing characters' portraits** into each cut to keep faces, hairstyles, and outfits consistent across pages.

<p align="center">
  <img src="./public/showcase/sheet.png" alt="Character Design Sheet Example" width="100%" />
</p>
<p align="center">
  <sub>▲ Structured character extraction & unified ensemble reference sheet</sub>
</p>

<p align="center">
  <img src="./public/showcase/preview-grid.png" alt="Multi-Panel Comic Pages Example" width="100%" />
</p>
<p align="center">
  <sub>▲ Dynamic per-cut character reference injection across sequential multi-panel comic pages</sub>
</p>

> 💡 **Try with zero API setup**: Open the [Live Workspace](https://huiman.antmoo.com) or run locally and click **"View Built-in Example (No Key)"** on the home screen to inspect the full storyboard, standalone portraits, lightbox viewer, Webtoon long-strip stitcher, and ZIP exporter at zero cost.

---

## Highlights

- **Local-First & Pure BYOK (Bring Your Own Key)**: No database, account sign-up, or billing middleman. Sessions persist automatically in browser IndexedDB (including character portraits and comic pages), with an opt-in toggle to save your API keys in local `localStorage` across reloads.
- **Dynamic Per-Cut Portrait Reference**: Decouples style reference uploads from character identity references. Each segment automatically matches appearing characters and attaches their standalone portraits within the target model's reference limit.
- **Guided 4-Step Studio**: `1. Story & Inspiration Templates → 2. Inline Storyboard Script Editing → 3. Ensemble Sheet & Individual Portraits → 4. Batch Generation, Resume Remaining & Export`.
- **Multi-Provider Presets Out of the Box**:
  - **Text**: Volcengine Ark (Doubao standard / Agent Plan / Coding Plan), Alibaba Bailian (Qwen standard / Coding Plan), official Claude API, and OpenAI-compatible `chat/completions` endpoints.
  - **Image**: Native adapters for **Volcengine Seedream 5.0 Flash / Pro** (2K PNG), **Alibaba Bailian Qwen Image 2.1 / 3.0**, and OpenAI-compatible `images/generations` & `images/edits` (`b64_json`). Same-vendor standard API keys are shared automatically.
- **Zero-Dependency Rich Export**: Built-in pure TypeScript PKZip builder (bundles Markdown outline, JSON storyboard, ensemble sheet, individual portraits, and all comic pages) plus seamless vertical **Webtoon long-strip PNG stitching**.
- **Hardened Server Relay**: Private/reserved IP blocklists, DNS-pinned sockets (anti-DNS rebinding), redirect rejection, strict streaming payload bounds, and automatic API key redaction on upstream errors.
- **Multilingual UI & Output**: Chinese, English, and Japanese interfaces and comic dialogue generation.

---

## Quick Start

### Option 1: One-Click Deploy on Vercel

Click the **Deploy with Vercel** button above to deploy your own instance, then open **API settings** in the top-right corner to configure your provider keys.

### Option 2: Run Locally

Requirements: **Node.js >= 22.18.0** and **pnpm 10.34.5**.

```bash
git clone https://github.com/GL-Wen/huiman-ark.git
cd huiman-ark
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000):

1. Click **"View Built-in Example (No Key)"** to explore a complete sample project immediately;
2. Open **API settings**, select **Volcengine Ark**, **Alibaba Bailian**, **Claude**, or any **OpenAI-compatible** endpoint, paste your API key, and optionally check **Remember API Key**;
3. Enter your story idea (or pick a genre template) to generate scripts, character portraits, and comic pages.

---

## Environment Variables (Optional)

For private self-hosted instances, you can configure default endpoints, models, or a server-side key in `.env.local` (leave `AI_API_KEY` empty on public deployments for pure BYOK mode):

```dotenv
AI_API_BASE_URL=https://api.antmoo.cc
AI_TEXT_MODEL=claude-opus-5-5
AI_IMAGE_MODEL=gpt-image-2
AI_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

See [docs/deployment.md](./docs/deployment.md) for full provider details and reverse-proxy timeout recommendations.

---

## Workspace Screenshots

![Character Reference & Profiles Workspace](./public/1.png)
![Storyboard Cards & Comic Generation](./public/2.png)

---

## Development

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Contributions are welcome—see [CONTRIBUTING.md](./CONTRIBUTING.md). Please report security vulnerabilities privately per [SECURITY.md](./SECURITY.md).

---

## Support & Contact

If Huiman Ark helps your AI comic workflow or Next.js development, please consider giving the repo a **Star ⭐️**!

- **Support & Custom Workflow Inquiries**: WeChat `13623839679` · QQ `3575554244` · Email [toowell2015@126.com](mailto:toowell2015@126.com) · X [@antmoch](https://x.com/antmoch)
- **License**: [MIT License](./LICENSE)
