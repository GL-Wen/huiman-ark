export class GenerationHttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const getAiConfig = (request: Request) => {
  const apiKey = request.headers.get('authorization')?.match(/^Bearer[ \t]+(\S+)$/i)?.[1];
  if (!apiKey || apiKey.length > 4096) {
    throw new GenerationHttpError('请先在设置中填写自己的 AI API Key', 401);
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(process.env.AI_API_BASE_URL || 'https://api.antmoo.cc');
  } catch {
    throw new GenerationHttpError('部署环境的 AI_API_BASE_URL 格式不正确', 503);
  }
  if (!['https:', 'http:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    throw new GenerationHttpError('部署环境的 AI_API_BASE_URL 格式不正确', 503);
  }

  return { apiKey, baseUrl: baseUrl.href.replace(/\/+$/, '') };
};

export const readJsonBody = async (request: Request, maxBytes: number): Promise<Record<string, unknown>> => {
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

export const requestAi = async (url: string, init: RequestInit) => {
  try {
    return await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(285_000) });
  } catch {
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
