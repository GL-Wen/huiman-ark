import {
  errorResponse,
  GenerationHttpError,
  getAiConfig,
  readAiResponse,
  readJsonBody,
  requestAi,
  upstreamError,
} from '../../../../lib/server/generation.ts';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request, 1024 * 1024);
    const config = getAiConfig(request, body, 'text');
    const { apiKey, model } = config;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt.trim() : '';
    if (!prompt || !systemPrompt) throw new GenerationHttpError('生成提示词不能为空', 400);
    if (prompt.length > 120_000 || systemPrompt.length > 40_000) {
      throw new GenerationHttpError('文本内容过长，请缩短后重试', 413);
    }
    const upstream = await requestAi(config, '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!upstream.ok) {
      throw new GenerationHttpError((await upstreamError(upstream, apiKey)) || `上游请求失败：${upstream.status}`, 502);
    }
    const data = await readAiResponse(upstream);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new GenerationHttpError('上游没有返回文本内容', 502);
    return Response.json({ content });
  } catch (error) {
    return errorResponse(error);
  }
}
