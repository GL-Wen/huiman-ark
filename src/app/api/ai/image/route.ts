import {
  errorResponse,
  GenerationHttpError,
  getAiConfig,
  isBailianResultHost,
  readAiResponse,
  readJsonBody,
  requestAi,
  upstreamError,
} from '../../../../lib/server/generation.ts';

export const runtime = 'nodejs';
export const maxDuration = 300;

const DATA_URL_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i;
const SUPPORTED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']);
const MAX_REFERENCE_BYTES = 20 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 25 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');

const loadBailianResult = async (config: ReturnType<typeof getAiConfig>, value: unknown) => {
  let url: URL;
  try {
    if (typeof value !== 'string' || value.length > 8192) throw new Error('Invalid image URL');
    url = new URL(value);
  } catch {
    throw new GenerationHttpError('百炼返回的图片地址格式不正确', 502);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash ||
      !isBailianResultHost(url.hostname)) {
    throw new GenerationHttpError('百炼图片地址必须来自官方 DashScope OSS 域名', 502);
  }
  const response = await requestAi({ ...config, baseUrl: url.href, apiKey: '', userProvidedBaseUrl: true }, '', { method: 'GET' }).catch((error) => {
    if (error instanceof GenerationHttpError && error.status === 400) {
      throw new GenerationHttpError('无法安全访问百炼返回的图片地址', 502);
    }
    throw error;
  });
  if (!response.ok) throw new GenerationHttpError('无法下载百炼生成的图片，请稍后重试', 502);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_OUTPUT_BYTES) throw new GenerationHttpError('百炼返回的图片体积过大', 502);
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new GenerationHttpError('百炼返回的图片不是有效的 PNG 数据', 502);
  }
  return buffer;
};

const decodeImage = (value: string, maxBytes: number, status: number, oversizeStatus = status) => {
  if (value.length > Math.ceil(maxBytes / 3) * 4) throw new GenerationHttpError('图片体积过大', oversizeStatus);
  if (!/^[a-z0-9+/]+={0,2}$/i.test(value) || value.length % 4 === 1) {
    throw new GenerationHttpError('图片 Base64 数据无效', status);
  }
  const buffer = Buffer.from(value, 'base64');
  if (!buffer.length || buffer.toString('base64').replace(/=+$/, '') !== value.replace(/=+$/, '')) {
    throw new GenerationHttpError('图片 Base64 数据无效', status);
  }
  if (buffer.byteLength > maxBytes) throw new GenerationHttpError('图片体积过大', oversizeStatus);
  return buffer;
};

const loadReference = (value: string, maxBytes: number) => {
  const match = value.match(DATA_URL_PATTERN);
  if (!match) throw new GenerationHttpError('请上传本地参考图片，不支持远程图片链接', 400);
  const mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
  if (!SUPPORTED_MIME_TYPES.has(mimeType)) throw new GenerationHttpError('参考图片格式不支持', 400);
  const buffer = decodeImage(match[2], maxBytes, 400, 413);
  return { blob: new Blob([buffer], { type: mimeType }), mimeType };
};

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request, 170 * 1024 * 1024);
    const config = getAiConfig(request, body, 'image');
    const { apiKey, model } = config;
    const host = new URL(config.baseUrl).hostname;
    const isSeedream = host === 'ark.cn-beijing.volces.com' && /^doubao-seedream-5-0-(?:pro|flash)-\d{6}$/.test(model);
    const isBailian = (/^dashscope(?:-[a-z0-9-]+)?\.aliyuncs\.com$/i.test(host) || host.endsWith('.maas.aliyuncs.com')) &&
      /^qwen-image-(?:2\.1-(?:pro|turbo)|3\.0(?:-pro)?)$/i.test(model);
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) throw new GenerationHttpError('生图提示词不能为空', 400);
    if (body.aspectRatio !== undefined && body.aspectRatio !== '16:9' && body.aspectRatio !== '9:16') {
      throw new GenerationHttpError('图片比例格式不正确', 400);
    }
    const references = body.referenceImages ?? [];
    const labels = body.referenceLabels ?? [];
    if (!Array.isArray(references) || references.some((reference) => typeof reference !== 'string')) {
      throw new GenerationHttpError('参考图片格式不正确', 400);
    }
    if (references.length > 6) throw new GenerationHttpError('参考图片最多 6 张', 400);
    if (!Array.isArray(labels) || labels.length > 6 || labels.some((label) => typeof label !== 'string')) {
      throw new GenerationHttpError('参考图片标签格式不正确', 400);
    }
    if (body.referenceInstruction !== undefined && typeof body.referenceInstruction !== 'string') {
      throw new GenerationHttpError('参考图片说明格式不正确', 400);
    }
    const finalPrompt = [
      typeof body.referenceInstruction === 'string' ? body.referenceInstruction.trim() : '',
      ...references.map((_reference, index) => typeof labels[index] === 'string' ? labels[index].trim() : ''),
      prompt,
    ].filter(Boolean).join('\n\n');
    if (finalPrompt.length > 120_000) throw new GenerationHttpError('生图提示词过长', 413);
    const loadedReferences = references.map((value) => loadReference(value, isBailian ? 10 * 1024 * 1024 : MAX_REFERENCE_BYTES));
    const portrait = body.aspectRatio === '9:16';
    let size = portrait ? '1024x1536' : '1536x1024';
    if (isSeedream) size = portrait ? '1584x2816' : '2816x1584';
    else if (isBailian) size = portrait ? '864x1536' : '1536x864';

    let upstream: Response;
    if (isSeedream) {
      upstream = await requestAi(config, '/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model, prompt: finalPrompt, size,
          response_format: 'b64_json', output_format: 'png', watermark: false,
          ...(references.length ? { image: references.map((value, index) =>
            value.replace(/^data:[^;]+;/i, `data:${loadedReferences[index].mimeType};`)) } : {}),
        }),
      });
    } else if (isBailian) {
      if (loadedReferences.some(({ mimeType }) => !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType))) {
        throw new GenerationHttpError('百炼参考图请使用 JPEG、PNG 或 WebP 格式', 400);
      }
      if (/^qwen-image-3\.0/i.test(model) && references.length > 3) {
        throw new GenerationHttpError('千问图像 3.0 最多支持 3 张参考图，请减少参考图或选择 2.1 模型', 400);
      }
      upstream = await requestAi({ ...config, baseUrl: new URL(config.baseUrl).origin }, '/api/v1/services/aigc/multimodal-generation/generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          input: { messages: [{ role: 'user', content: [
            ...references.map((value) => ({ image: value.replace(/^data:image\/jpg;/i, 'data:image/jpeg;') })),
            { text: finalPrompt },
          ] }] },
          parameters: { size: size.replace('x', '*'), n: 1 },
        }),
      });
    } else if (loadedReferences.length) {
      const form = new FormData();
      form.append('model', model);
      form.append('prompt', finalPrompt);
      form.append('size', size);
      form.append('n', '1');
      form.append('quality', 'high');
      form.append('output_format', 'png');
      loadedReferences.forEach(({ blob, mimeType }, index) => {
        form.append(loadedReferences.length > 1 ? 'image[]' : 'image', blob, `reference-${index + 1}.${mimeType.split('/')[1] || 'png'}`);
      });
      upstream = await requestAi(config, '/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    } else {
      upstream = await requestAi(config, '/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, prompt: finalPrompt, size, n: 1, quality: 'high', output_format: 'png' }),
      });
    }

    if (!upstream.ok) {
      throw new GenerationHttpError((await upstreamError(upstream, apiKey)) || `上游生图失败：${upstream.status}`, 502);
    }
    const data = await readAiResponse(upstream);
    const content = data?.output?.choices?.[0]?.message?.content;
    const image = isBailian
      ? { url: Array.isArray(content) ? content.find((item) => item?.image)?.image : undefined }
      : data?.data?.[0];
    let buffer: Buffer;
    if (!image?.b64_json) {
      if (isBailian && image?.url) {
        buffer = await loadBailianResult(config, image.url);
      } else if (image?.url) {
        throw new GenerationHttpError('当前接口仅返回远程图片链接，请使用支持 Base64 图片输出的 AI 接口', 502);
      } else {
        throw new GenerationHttpError('上游没有返回图片', 502);
      }
    } else {
      if (typeof image.b64_json !== 'string') throw new GenerationHttpError('上游图片数据格式不正确', 502);
      buffer = decodeImage(image.b64_json, MAX_OUTPUT_BYTES, 502);
    }
    return Response.json({ imageUrl: `data:image/png;base64,${buffer.toString('base64')}` });
  } catch (error) {
    return errorResponse(error);
  }
}
