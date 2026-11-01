import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import { TEXT_PROVIDER_PRESETS, type TextProvider } from '../textProviders.ts';

export class GenerationHttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const parseBaseUrl = (value: string, status: number) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GenerationHttpError('AI 接口地址格式不正确', status);
  }
  if (value.length > 2048 || /[\s\\]/.test(value) || !['https:', 'http:'].includes(url.protocol) || url.username || url.password || value.includes('?') || value.includes('#')) {
    throw new GenerationHttpError('AI 接口地址须为 HTTP(S) 地址，且不能包含账号密码、查询参数或片段', status);
  }
  return url.href.replace(/\/+$/, '');
};

const modelName = (value: string, status: number) => {
  if (value.length > 200 || /\p{Cc}/u.test(value)) throw new GenerationHttpError('模型名称格式不正确', status);
  return value;
};

export const getPublicAiConfig = () => ({
  baseUrl: parseBaseUrl(process.env.AI_API_BASE_URL?.trim() || 'https://api.antmoo.cc', 503),
  textModel: modelName(process.env.AI_TEXT_MODEL?.trim() || 'claude-opus-5-5', 503),
  imageModel: modelName(process.env.AI_IMAGE_MODEL?.trim() || 'gpt-image-2', 503),
  hasApiKey: Boolean(process.env.AI_API_KEY?.trim()),
});

const override = (value: unknown, label: string) => {
  if (value === undefined) return '';
  if (typeof value !== 'string') throw new GenerationHttpError(`${label}格式不正确`, 400);
  return value.trim();
};

export const getAiConfig = (request: Request, body: Record<string, unknown>, kind: 'text' | 'image') => {
  const provider = kind === 'text' ? body.provider : undefined;
  if (provider !== undefined && provider !== 'default' && (typeof provider !== 'string' || !Object.keys(TEXT_PROVIDER_PRESETS).includes(provider))) {
    throw new GenerationHttpError('不支持的文本平台', 400);
  }
  const preset = provider && provider !== 'default' ? TEXT_PROVIDER_PRESETS[provider as Exclude<TextProvider, 'default'>] : undefined;
  const customBaseUrl = override(body.baseUrl, 'AI 接口地址');
  const customModel = override(body.model, '模型名称');
  const defaultModel = kind === 'text' ? preset?.model || process.env.AI_TEXT_MODEL?.trim() || 'claude-opus-5-5' : process.env.AI_IMAGE_MODEL?.trim() || 'gpt-image-2';
  const model = modelName(customModel || defaultModel, customModel ? 400 : 503);
  const authorization = request.headers.get('authorization')?.trim() || '';
  const match = authorization.match(/^Bearer(?:[ \t]+(\S+))?$/i);
  if (authorization && !match) throw new GenerationHttpError('API Key 请求头格式不正确', 400);
  const userApiKey = match?.[1] || '';
  const apiKey = userApiKey || (preset ? '' : process.env.AI_API_KEY?.trim()) || '';
  if (!apiKey) throw new GenerationHttpError(preset ? '请为所选文本平台填写自己的 API Key' : '请在设置或部署环境中填写 AI API Key', 401);
  if (apiKey.length > 4096 || !/^[\x21-\x7e]+$/.test(apiKey)) {
    throw new GenerationHttpError('API Key 格式不正确', userApiKey ? 400 : 503);
  }
  let defaultBaseUrl: string | undefined;
  try {
    defaultBaseUrl = parseBaseUrl(preset?.baseUrl || process.env.AI_API_BASE_URL?.trim() || 'https://api.antmoo.cc', 503);
  } catch (error) {
    if (!customBaseUrl || !userApiKey) throw error;
  }
  const baseUrl = customBaseUrl ? parseBaseUrl(customBaseUrl, 400) : defaultBaseUrl!;
  const userProvidedBaseUrl = baseUrl !== defaultBaseUrl;
  if (userProvidedBaseUrl && new URL(baseUrl).protocol !== 'https:') {
    throw new GenerationHttpError('自定义 AI 接口必须使用 HTTPS 公网地址', 400);
  }
  if (!userApiKey && new URL(baseUrl).origin !== new URL(defaultBaseUrl!).origin) {
    throw new GenerationHttpError('使用其他 AI 接口域名时，请同时填写自己的 API Key，服务器默认 Key 仅用于默认域名', 400);
  }
  return { apiKey, baseUrl, model, userProvidedBaseUrl };
};

export const readJsonBody = async (request: Request | Response, maxBytes: number): Promise<Record<string, unknown>> => {
  if (Number(request.headers.get('content-length')) > maxBytes) {
    throw new GenerationHttpError('请求内容过大', 413);
  }

  const reader = request.body?.getReader();
  if (!reader) throw new GenerationHttpError('请求内容不能为空', 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new GenerationHttpError('请求内容过大', 413);
    }
    chunks.push(value);
  }

  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new GenerationHttpError('请求内容必须是有效的 JSON', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new GenerationHttpError('请求参数格式不正确', 400);
  }
  return body as Record<string, unknown>;
};

const privateIpv4 = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) privateIpv4.addSubnet(address, prefix, 'ipv4');
const globalIpv6 = new BlockList();
globalIpv6.addSubnet('2000::', 3, 'ipv6');
const reservedIpv6 = new BlockList();
for (const [address, prefix] of [['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3ffe::', 16], ['3fff::', 20]] as const) {
  reservedIpv6.addSubnet(address, prefix, 'ipv6');
}

export const isPublicAddress = (address: string) => {
  const family = isIP(address);
  if (family === 4) return !privateIpv4.check(address, 'ipv4');
  return family === 6 && !address.includes('%') && globalIpv6.check(address, 'ipv6') && !reservedIpv6.check(address, 'ipv6');
};

export const isBailianResultHost = (hostname: string) => /^dashscope-[a-z0-9-]+\.oss-[a-z0-9-]+\.aliyuncs\.com$/i.test(hostname);

const publicAddress = async (url: URL) => {
  const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (hostname === 'localhost' || /\.(?:localhost|local|internal|home\.arpa)\.?$/i.test(hostname)) {
    throw new GenerationHttpError('自定义 AI 接口不能访问内网、环回或保留地址', 400);
  }
  let addresses: Array<{ address: string; family: number }>;
  if (isIP(hostname)) {
    addresses = [{ address: hostname, family: isIP(hostname) }];
  } else {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      addresses = await Promise.race([
        dns.lookup(hostname, { all: true, verbatim: true }),
        new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('DNS timeout')), 10_000); }),
      ]);
    } catch {
      throw new GenerationHttpError('无法解析自定义 AI 接口域名', 400);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  if (isBailianResultHost(hostname) && addresses.length && addresses.every(({ address, family }) =>
    family === 4 && isIP(address) === 4 && /^198\.(?:18|19)\./.test(address))) {
    // Fake-IP proxies require real DNS answers before a public address can be pinned.
    try {
      const response = await fetch(`https://dns.alidns.com/resolve?name=${encodeURIComponent(hostname)}&type=A`, {
        signal: AbortSignal.timeout(10_000), redirect: 'error',
      });
      if (!response.ok) throw new Error('DNS lookup failed');
      const data = await readJsonBody(response, 64 * 1024);
      if (data.Status !== 0 || !Array.isArray(data.Answer)) throw new Error('Invalid DNS response');
      addresses = data.Answer.filter((answer) => answer?.type === 1).map((answer) => {
        if (typeof answer.data !== 'string' || isIP(answer.data) !== 4) throw new Error('Invalid DNS address');
        return { address: answer.data, family: 4 };
      });
    } catch {
      throw new GenerationHttpError('无法解析百炼图片的真实公网地址', 400);
    }
  }
  if (!addresses.length || addresses.some(({ address, family }) => !isPublicAddress(address) || isIP(address) !== family)) {
    throw new GenerationHttpError('自定义 AI 接口不能访问内网、环回或保留地址', 400);
  }
  return addresses[0];
};

export const requestAi = async (config: ReturnType<typeof getAiConfig>, path: string, init: RequestInit) => {
  try {
    const apiPath = /\/v\d+$/.test(config.baseUrl) ? path.replace(/^\/v1\//, '/') : path;
    const url = new URL(`${config.baseUrl}${apiPath}`);
    const address = config.userProvidedBaseUrl ? await publicAddress(url) : undefined;
    const headers = new Headers(init.headers);
    if (config.apiKey) headers.set('Authorization', `Bearer ${config.apiKey}`);
    headers.set('Accept-Encoding', 'identity');
    const serialized = new Request(url, { method: init.method || 'POST', headers, body: init.body });
    return await new Promise<Response>((resolve, reject) => {
      const transport = url.protocol === 'https:' ? https : http;
      const outgoing = transport.request(url, {
        method: serialized.method,
        headers: Object.fromEntries(serialized.headers),
        agent: false,
        signal: AbortSignal.timeout(285_000),
        ...(address ? {
          family: address.family,
          lookup: (_hostname, options, callback) => options.all ? callback(null, [address]) : callback(null, address.address, address.family),
        } : {}),
      }, (incoming) => {
        const status = incoming.statusCode || 0;
        if (!Number.isInteger(status) || status < 200 || status > 599) {
          incoming.destroy();
          reject(new GenerationHttpError('AI 服务返回了无效的 HTTP 状态码', 502));
          return;
        }
        if (status >= 300 && status < 400) {
          incoming.destroy();
          reject(new GenerationHttpError('AI 接口返回重定向，请填写最终接口地址', 502));
          return;
        }
        const maxBytes = status >= 400 ? 64 * 1024 : 40 * 1024 * 1024;
        if (Number(incoming.headers['content-length']) > maxBytes) {
          incoming.destroy();
          reject(new GenerationHttpError('AI 服务响应体积过大', 502));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        incoming.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            incoming.destroy();
            reject(new GenerationHttpError('AI 服务响应体积过大', 502));
            return;
          }
          chunks.push(chunk);
        });
        incoming.on('error', reject);
        incoming.on('aborted', () => reject(new Error('Upstream response aborted')));
        incoming.on('end', () => resolve(new Response(status === 204 || status === 205 ? null : Buffer.concat(chunks), { status })));
      });
      outgoing.on('error', reject);
      if (serialized.body) {
        Readable.fromWeb(serialized.body as ReadableStream<Uint8Array>).on('error', (error) => outgoing.destroy(error)).pipe(outgoing);
      } else outgoing.end();
    });
  } catch (error) {
    if (error instanceof GenerationHttpError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GenerationHttpError('AI 服务响应超时，请稍后重试', 504);
    }
    throw new GenerationHttpError('无法连接 AI 服务，请检查接口配置或稍后重试', 502);
  }
};

export const upstreamError = async (response: Response, apiKey: string) => {
  const raw = await response.text().catch(() => '');
  let message: unknown = raw;
  try {
    const parsed = JSON.parse(raw);
    message = parsed?.error?.message || parsed?.message || raw;
  } catch {
    // Some compatible APIs return plain text errors.
  }
  return typeof message === 'string' ? message.split(apiKey).join('[REDACTED]').slice(0, 1000) : '';
};

export const readAiResponse = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    throw new GenerationHttpError('AI 服务返回了无法读取的响应', 502);
  }
};

export const errorResponse = (error: unknown) => {
  const status = error instanceof GenerationHttpError ? error.status : 500;
  const message = error instanceof GenerationHttpError ? error.message : '服务暂时不可用，请稍后重试';
  return Response.json({ error: { message } }, { status });
};
