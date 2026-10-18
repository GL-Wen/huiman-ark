# Huiman Ark

<p align="center">
  <img src="./public/favicon.svg" alt="Huiman Ark Logo" width="120" />
</p>

[中文](./README.md) | English

Turn stories into storyboard scripts, character designs, and comic pages. Built with Next.js, React, TypeScript, and Tailwind CSS, with Chinese, English, and Japanese interfaces.

Huiman Ark uses the [MIT license](./LICENSE): free to use, modify, distribute, and use commercially. No registration, login, or recharge is required. Bring your own API Key; your API provider charges for generation.

## Features

- Generate storyboard scripts, character sheets, and comic pages from a story.
- Customize characters, art style, aspect ratio, paragraphs, and panels.
- Supply reference images for character and style consistency.
- Save the current creative session in your browser's IndexedDB; no database or cloud account is needed.
- Keep the API Key in page memory only; enter it again after refreshing.

## Screenshots

![Huiman Ark Screenshot 1](./public/1.png)
![Huiman Ark Screenshot 2](./public/2.png)

Screenshots illustrate the creative workspace; controls may differ in the current version.

## Run locally

Requirements: **Node.js 22.18 or later**, **pnpm 10.34.5**, and an API Key for the deployment's configured provider.

```bash
git clone https://github.com/GL-Wen/huiman-ark.git
cd huiman-ark
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), enter your own API Key in the API settings, and start with a story.

The default API is `https://api.antmoo.cc`. Text requests always use `claude-opus-5-5`, and images always use `gpt-image-2`. Your Key must belong to the deployment's configured provider; API usage is billed to your provider account. When deploying your own instance, set a compatible provider in `.env.local`:

```dotenv
AI_API_BASE_URL=https://api.antmoo.cc
```

Use the service root URL without `/v1`. Compatible providers must offer both fixed models, support `chat/completions`, `images/generations`, and `images/edits`, and return Base64 images through `b64_json`. Providers that only return remote image URLs are not supported.

See the [deployment guide](./docs/deployment.md) for production commands and configuration.

## Data and API Keys

Creative sessions stay in the current browser. Clearing site data or switching browsers removes access to that session; download work you want to keep. The API Key is not stored in IndexedDB or localStorage. Generation requests pass through this application's server to the configured AI provider.

Enter a Key only on your own deployment or a trusted HTTPS site. Deployment operators can access forwarded requests and should avoid logging headers, bodies, or Keys.

## Development and contributions

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Issues and pull requests are welcome; see [CONTRIBUTING.md](./CONTRIBUTING.md). Report vulnerabilities privately as described in [SECURITY.md](./SECURITY.md).

Third-party dependencies retain their own licenses. Respect the rights associated with uploaded and generated content, along with your API provider's terms.
