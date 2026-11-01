import assert from 'node:assert/strict';
import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { Readable, Writable } from 'node:stream';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { GET as publicConfig } from '../../app/api/ai/config/route.ts';
import { POST as chat } from '../../app/api/ai/chat/route.ts';
import { POST as image } from '../../app/api/ai/image/route.ts';
import { isPublicAddress, readJsonBody } from './generation.ts';
import { TEXT_PROVIDER_PRESETS } from '../textProviders.ts';
import type { LookupAddress } from 'node:dns';

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCLsAAAAASUVORK5CYII=';
const reference = `data:image/png;base64,${png}`;
const originalEnv = {
  AI_API_BASE_URL: process.env.AI_API_BASE_URL,
  AI_API_KEY: process.env.AI_API_KEY,
  AI_IMAGE_MODEL: process.env.AI_IMAGE_MODEL,
  AI_TEXT_MODEL: process.env.AI_TEXT_MODEL,
};
let calls: Array<{ url: string; init?: RequestInit; options: http.RequestOptions }>;
let upstream: () => Response | Promise<Response>;
let dnsAnswers: LookupAddress[] | Error;
let lookups: string[];
let responseStatusOverride: number | undefined;

beforeEach(() => {
  process.env.AI_API_BASE_URL = 'https://provider.example/';
  process.env.AI_API_KEY = 'server-default-key';
  delete process.env.AI_IMAGE_MODEL;
  delete process.env.AI_TEXT_MODEL;
  calls = [];
  lookups = [];
  dnsAnswers = [{ address: '93.184.216.34', family: 4 }];
  responseStatusOverride = undefined;
  upstream = () => { throw new Error('Unexpected upstream request'); };
  mock.method(dns, 'lookup', async (hostname: string) => {
    lookups.push(hostname);
    if (dnsAnswers instanceof Error) throw dnsAnswers;
    return dnsAnswers;
  });
  const send = (url: URL, options: http.RequestOptions, receive: (incoming: http.IncomingMessage) => void) => {
    const chunks: Buffer[] = [];
    const outgoing = new Writable({
      autoDestroy: false,
      write(chunk, _encoding, done) { chunks.push(Buffer.from(chunk)); done(); },
      final(done) {
        done();
        void (async () => {
          const raw = Buffer.concat(chunks);
          const headers = new Headers(options.headers as Record<string, string>);
          const body = headers.get('content-type')?.includes('multipart/form-data')
            ? await new Response(raw, { headers }).formData() : raw.toString('utf8');
          calls.push({ url: url.href, options, init: { headers, body, method: options.method } });
          const response = await upstream();
          const incoming = Object.assign(Readable.from([Buffer.from(await response.arrayBuffer())]), {
            statusCode: responseStatusOverride ?? response.status, headers: Object.fromEntries(response.headers),
          });
          receive(incoming as http.IncomingMessage);
        })().catch((error) => outgoing.destroy(error));
      },
    });
    return outgoing;
  };
  mock.method(https, 'request', send);
  mock.method(http, 'request', send);
});

afterEach(() => {
  mock.restoreAll();
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

const request = (body: unknown, apiKey: string | null = 'user-key') => new Request('https://app.example/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
  body: JSON.stringify(body),
});

test('both endpoints require a key when neither caller nor environment provides one', async () => {
  delete process.env.AI_API_KEY;
  for (const handler of [chat, image]) {
    const response = await handler(request({ prompt: 'Hello', systemPrompt: 'Write' }, null));
    assert.equal(response.status, 401);
    assert.doesNotMatch(await response.text(), /server-key/);
  }
  assert.equal(calls.length, 0);
});

test('chat rejects malformed JSON and missing prompts before fetching', async () => {
  const malformed = new Request('https://app.example/api/ai/chat', {
    method: 'POST', headers: { Authorization: 'Bearer user-key' }, body: '{',
  });
  assert.equal((await chat(malformed)).status, 400);
  for (const body of [null, [], { prompt: 123, systemPrompt: 'Write' }, { prompt: 'Hi' }]) {
    assert.equal((await chat(request(body))).status, 400);
  }
  assert.equal((await chat(request({ prompt: 'a'.repeat(120_001), systemPrompt: 'Write' }))).status, 413);
  assert.equal(calls.length, 0);
});

test('chat uses caller fields before environment defaults', async () => {
  upstream = () => Response.json({ choices: [{ message: { content: 'A short story' } }] });
  const response = await chat(request({
    prompt: 'Hello', systemPrompt: 'Write', apiKey: 'body-key', baseUrl: 'https://custom.example', model: 'custom-model',
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { content: 'A short story' });
  assert.equal(calls[0].url, 'https://custom.example/v1/chat/completions');
  assert.equal(new Headers(calls[0].init?.headers).get('Authorization'), 'Bearer user-key');
  assert.equal(new Headers(calls[0].init?.headers).get('Accept-Encoding'), 'identity');
  assert.equal(calls[0].options.agent, false);
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    model: 'custom-model', messages: [{ role: 'system', content: 'Write' }, { role: 'user', content: 'Hello' }], temperature: 0.7,
  });
});

test('chat accepts service roots and versioned API base URLs without duplicating versions', async () => {
  upstream = () => Response.json({ choices: [{ message: { content: 'OK' } }] });
  for (const [baseUrl, expectedUrl] of [
    ['https://provider.example', 'https://provider.example/v1/chat/completions'],
    ['https://provider.example/custom/', 'https://provider.example/custom/v1/chat/completions'],
    ['https://provider.example/v1/', 'https://provider.example/v1/chat/completions'],
    ['https://ark.cn-beijing.volces.com/api/v3', 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'],
    ['https://ark.cn-beijing.volces.com/api/plan/v3/', 'https://ark.cn-beijing.volces.com/api/plan/v3/chat/completions'],
    ['https://ark.cn-beijing.volces.com/api/coding/v3', 'https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions'],
  ]) {
    process.env.AI_API_BASE_URL = baseUrl;
    const response = await chat(request({ prompt: 'Hi', systemPrompt: 'Write' }, null));
    assert.equal(response.status, 200, baseUrl);
    assert.deepEqual(await response.json(), { content: 'OK' });
    assert.equal(calls[calls.length - 1].url, expectedUrl);
  }
});

test('chat falls back to built-in defaults when deployment fields are blank', async () => {
  delete process.env.AI_API_BASE_URL;
  upstream = () => Response.json({ choices: [{ message: { content: 'Text' } }] });
  process.env.AI_TEXT_MODEL = '  ';
  for (const body of [{ prompt: 'Hi', systemPrompt: 'Write' }, { prompt: 'Hi', systemPrompt: 'Write', baseUrl: ' ', model: '  ' }]) {
    assert.equal((await chat(request(body, null))).status, 200);
    const call = calls[calls.length - 1];
    assert.equal(call.url, 'https://api.antmoo.cc/v1/chat/completions');
    assert.equal(JSON.parse(String(call.init?.body)).model, 'claude-opus-5-5');
  }
});

test('text providers use their own endpoint, model and key without changing image defaults', async () => {
  upstream = () => Response.json({ choices: [{ message: { content: 'OK' } }], data: [{ b64_json: png }] });
  for (const [provider, preset] of Object.entries(TEXT_PROVIDER_PRESETS)) {
    for (const fields of [{}, { baseUrl: ' ', model: ' ' }]) {
      const response = await chat(request({ prompt: 'Hi', systemPrompt: 'Write', provider, ...fields }, `${provider}-key`));
      assert.equal(response.status, 200, provider);
      const call = calls[calls.length - 1];
      assert.equal(call.url, `${preset.baseUrl}/chat/completions`);
      assert.equal(new Headers(call.init?.headers).get('Authorization'), `Bearer ${provider}-key`);
      const body = JSON.parse(String(call.init?.body));
      assert.equal(body.model, preset.model);
      assert.equal('temperature' in body, provider !== 'claude');
    }
  }
  assert.equal((await image(request({ prompt: 'Draw', provider: 'claude' }, null))).status, 200);
  assert.equal(calls[calls.length - 1].url, 'https://provider.example/v1/images/generations');
  assert.equal(new Headers(calls[calls.length - 1].init?.headers).get('Authorization'), 'Bearer server-default-key');
});

test('named text providers never inherit the deployment key, including same-host Plan endpoints', async () => {
  process.env.AI_API_BASE_URL = TEXT_PROVIDER_PRESETS.volcengine.baseUrl;
  for (const provider of Object.keys(TEXT_PROVIDER_PRESETS)) {
    for (const key of [null, ' ']) {
      const response = await chat(request({ prompt: 'Hi', systemPrompt: 'Write', provider }, key));
      assert.equal(response.status, 401);
      assert.doesNotMatch(await response.text(), /server-default-key/);
    }
  }
  assert.equal(calls.length, 0);
});

test('chat rejects unknown providers and invalid workspace IDs before fetching', async () => {
  for (const provider of [null, false, 42, {}, [], '', '__proto__', 'constructor', 'unsupported']) {
    assert.equal((await chat(request({ prompt: 'Hi', systemPrompt: 'Write', provider }))).status, 400);
  }
  for (const workspaceId of [null, 42, {}, 'a b', 'wrkspc_\r\nInjected', 'x'.repeat(201)]) {
    assert.equal((await chat(request({ prompt: 'Hi', systemPrompt: 'Write', provider: 'claude', workspaceId }))).status, 400);
  }
  assert.equal((await chat(request({ prompt: 'Hi', systemPrompt: 'Write', provider: 'claude', baseUrl: 'https://127.0.0.1' }))).status, 400);
  assert.equal(calls.length, 0);
});

test('Claude requests support workspace selection and omit incompatible sampling parameters', async () => {
  upstream = () => Response.json({ choices: [{ message: { content: 'Claude text' } }] });
  for (const fields of [
    { model: 'claude-opus-5-5' }, { model: 'claude-sonnet-4-6' },
    { provider: 'claude', model: 'custom-deployment-alias', workspaceId: 'wrkspc_example' },
  ]) {
    const response = await chat(request({ prompt: 'Hi', systemPrompt: 'Write', ...fields }));
    assert.equal(response.status, 200);
    const call = calls[calls.length - 1];
    assert.equal('temperature' in JSON.parse(String(call.init?.body)), false);
    assert.equal(new Headers(call.init?.headers).get('anthropic-workspace-id'), fields.workspaceId || null);
  }
});

test('upstream authentication and rate-limit statuses remain actionable without leaking keys', async () => {
  for (const status of [401, 403, 429]) {
    upstream = () => Response.json({ error: { message: `Rejected user-key (${status})` } }, { status });
    const response = await chat(request({ prompt: 'Hi', systemPrompt: 'Write', provider: 'aliyun' }));
    assert.equal(response.status, status);
    assert.match(await response.text(), /Rejected \[REDACTED\]/);
  }
});

test('upstream errors, timeouts, network failures and invalid responses are handled', async () => {
  const payload = { prompt: 'Hi', systemPrompt: 'Write' };
  upstream = () => Response.json({ error: { message: 'Model unavailable' } }, { status: 429 });
  const rejected = await chat(request(payload));
  assert.equal(rejected.status, 429);
  assert.match(await rejected.text(), /Model unavailable/);
  upstream = () => { throw new Error('network error with secret details'); };
  const disconnected = await chat(request(payload));
  assert.equal(disconnected.status, 502);
  assert.doesNotMatch(await disconnected.text(), /secret details|user-key/);
  upstream = () => { throw new DOMException('sensitive timeout details', 'AbortError'); };
  const timedOut = await chat(request(payload));
  assert.equal(timedOut.status, 504);
  assert.match(await timedOut.text(), /超时/);
  upstream = () => new Response('not json');
  assert.equal((await chat(request(payload))).status, 502);
  upstream = () => Response.json({ choices: [] });
  assert.equal((await chat(request(payload))).status, 502);
});

test('both endpoints redact caller keys echoed by upstream errors', async () => {
  upstream = () => Response.json({ error: { message: 'Invalid key user-key; received user-key' } }, { status: 401 });
  for (const handler of [chat, image]) {
    const response = await handler(request({ prompt: 'Hi', systemPrompt: 'Write' }));
    assert.equal(response.status, handler === chat ? 401 : 502);
    const body = await response.text();
    assert.doesNotMatch(body, /user-key|server-key/);
    assert.match(body, /Invalid key \[REDACTED\]; received \[REDACTED\]/);
  }
});

test('image input rejects unsupported formats, remote references and malformed parameters', async () => {
  for (const body of [
    { prompt: 'Draw', referenceImages: ['https://private.example/image.png'] },
    { prompt: 'Draw', referenceImages: ['data:image/svg+xml;base64,PHN2Zy8+'] },
    { prompt: 'Draw', referenceImages: ['data:image/png;base64,!!invalid!!'] },
    { prompt: 'Draw', referenceImages: [42] },
    { prompt: 'Draw', referenceImages: reference },
    { prompt: 'Draw', referenceImages: Array(7).fill(reference) },
    { prompt: 'Draw', referenceLabels: [1] },
    { prompt: 'Draw', referenceInstruction: {} },
    { prompt: 'Draw', aspectRatio: '1:1' },
  ]) assert.equal((await image(request(body))).status, 400);
  assert.equal((await image(request({ prompt: 'a'.repeat(120_001) }))).status, 413);
  assert.equal(calls.length, 0);
});

test('image generation returns reusable Base64 PNG data without an asset account', async () => {
  upstream = () => Response.json({ data: [{ b64_json: png }] });
  const response = await image(request({ prompt: 'Draw a character', aspectRatio: '9:16', baseURL: 'https://untrusted.example' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { imageUrl: reference });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://provider.example/v1/images/generations');
  assert.equal(new Headers(calls[0].init?.headers).get('Authorization'), 'Bearer user-key');
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    model: 'gpt-image-2', prompt: 'Draw a character', size: '1024x1536', n: 1, quality: 'high', output_format: 'png',
  });
});

test('Seedream 5.0 uses its native JSON API, 2K dimensions and explicit Base64 PNG output', async () => {
  process.env.AI_API_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
  upstream = () => Response.json({ data: [{ b64_json: png }] });
  for (const model of ['doubao-seedream-5-0-pro-260628', 'doubao-seedream-5-0-flash-260915']) {
    process.env.AI_IMAGE_MODEL = model;
    for (const aspectRatio of ['16:9', '9:16']) {
      const response = await image(request({ prompt: 'Draw', aspectRatio }, null));
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { imageUrl: reference });
      const call = calls[calls.length - 1];
      assert.equal(call.url, 'https://ark.cn-beijing.volces.com/api/v3/images/generations');
      assert.equal(new Headers(call.init?.headers).get('Authorization'), 'Bearer server-default-key');
      assert.deepEqual(JSON.parse(String(call.init?.body)), {
        model, prompt: 'Draw', size: aspectRatio === '9:16' ? '1584x2816' : '2816x1584',
        response_format: 'b64_json', output_format: 'png', watermark: false,
      });
    }
  }
});

test('Seedream reference edits share the generation endpoint and normalize local image MIME types', async () => {
  process.env.AI_API_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
  process.env.AI_IMAGE_MODEL = 'doubao-seedream-5-0-pro-260628';
  upstream = () => Response.json({ data: [{ b64_json: png }] });
  const references = [reference.replace('image/png', 'IMAGE/PNG'), reference.replace('image/png', 'image/jpg')];
  const response = await image(request({
    prompt: 'Draw both characters', referenceImages: references,
    referenceLabels: ['Character A', 'Character B'], referenceInstruction: 'Keep identity',
  }));
  assert.equal(response.status, 200);
  assert.equal(calls[0].url, 'https://ark.cn-beijing.volces.com/api/v3/images/generations');
  const body = JSON.parse(String(calls[0].init?.body));
  assert.equal(body.prompt, 'Keep identity\n\nCharacter A\n\nCharacter B\n\nDraw both characters');
  assert.deepEqual(body.image, [reference, reference.replace('image/png', 'image/jpeg')]);
  assert.equal('quality' in body, false);
  assert.equal('n' in body, false);
  assert.equal('sequential_image_generation' in body, false);
});

test('image edits accept local references and preserve their labels and instruction', async () => {
  process.env.AI_IMAGE_MODEL = 'custom-image-model';
  upstream = () => Response.json({ data: [{ b64_json: png }] });
  const response = await image(request({
    prompt: 'Draw', referenceImages: [reference], referenceLabels: ['Character A'], referenceInstruction: 'Keep identity',
  }));
  assert.equal(response.status, 200);
  assert.equal(calls[0].url, 'https://provider.example/v1/images/edits');
  const form = calls[0].init?.body as FormData;
  assert.equal(form.get('model'), 'custom-image-model');
  assert.equal(form.get('prompt'), 'Keep identity\r\n\r\nCharacter A\r\n\r\nDraw');
  assert.equal(form.get('size'), '1536x1024');
  assert.equal(form.get('input_fidelity'), null);
  const file = form.get('image') as File;
  assert.equal(file.type, 'image/png');
  assert.equal(Buffer.from(await file.arrayBuffer()).toString('base64'), png);
});

test('multiple image references use array fields in the same order as their labels', async () => {
  upstream = () => Response.json({ data: [{ b64_json: png }] });
  const response = await image(request({
    prompt: 'Draw both characters',
    referenceImages: [reference, reference],
    referenceLabels: ['Reference 1: Character A', 'Reference 2: Character B'],
  }));
  assert.equal(response.status, 200);
  const form = calls[0].init?.body as FormData;
  assert.equal(form.get('image'), null);
  const files = form.getAll('image[]') as File[];
  assert.equal(files.length, 2);
  assert.deepEqual(files.map((file) => file.name), ['reference-1.png', 'reference-2.png']);
  for (const file of files) {
    assert.equal(file.type, 'image/png');
    assert.equal(Buffer.from(await file.arrayBuffer()).toString('base64'), png);
  }
  assert.equal(form.get('prompt'), 'Reference 1: Character A\r\n\r\nReference 2: Character B\r\n\r\nDraw both characters');
});

test('image model uses caller values before environment and built-in values', async () => {
  delete process.env.AI_API_BASE_URL;
  upstream = () => Response.json({ data: [{ b64_json: png }] });
  process.env.AI_IMAGE_MODEL = 'env-image-model';
  for (const model of ['gpt-image-1', 'gpt-image-1.5', 'custom-image-model']) {
    assert.equal((await image(request({ prompt: 'Draw', referenceImages: [reference], model }))).status, 200);
    const call = calls[calls.length - 1];
    assert.equal(call.url, 'https://api.antmoo.cc/v1/images/edits');
    const form = call.init?.body as FormData;
    assert.equal(form.get('model'), model);
    assert.equal(form.get('input_fidelity'), null);
  }
  for (const model of [undefined, '  ']) {
    assert.equal((await image(request({ prompt: 'Draw', model }))).status, 200);
    assert.equal(JSON.parse(String(calls[calls.length - 1].init?.body)).model, 'env-image-model');
  }
  process.env.AI_IMAGE_MODEL = ' ';
  assert.equal((await image(request({ prompt: 'Draw', model: ' ' }))).status, 200);
  assert.equal(JSON.parse(String(calls[calls.length - 1].init?.body)).model, 'gpt-image-2');
});

test('image errors reject missing, invalid and oversized output without fetching URL responses', async () => {
  for (const data of [[], [{ b64_json: 123 }], [{ b64_json: 'invalid!' }], [{ url: 'http://127.0.0.1/private' }]]) {
    upstream = () => Response.json({ data });
    assert.equal((await image(request({ prompt: 'Draw' }))).status, 502);
  }
  assert.equal(calls.length, 4);
  upstream = () => Response.json({ data: [{ b64_json: 'A'.repeat(35_000_000) }] });
  assert.equal((await image(request({ prompt: 'Draw' }))).status, 502);
  upstream = () => Response.json({ error: { message: 'Image model unavailable' } }, { status: 500 });
  const response = await image(request({ prompt: 'Draw' }));
  assert.equal(response.status, 502);
  assert.match(await response.text(), /Image model unavailable/);
});

test('Bailian generates and edits with JSON and returns persistent PNG data without forwarding the key to OSS', async () => {
  process.env.AI_IMAGE_MODEL = 'qwen-image-2.1-pro';
  const resultUrl = 'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/result.png?Expires=123&Signature=example';
  upstream = () => calls[calls.length - 1].init?.method === 'GET'
    ? new Response(Buffer.from(png, 'base64')) : Response.json({ output: { choices: [{ message: { content: [{ image: resultUrl }] } }] } });
  for (const [baseUrl, referenceImages, aspectRatio] of [
    ['https://dashscope.aliyuncs.com/compatible-mode/v1', [], '16:9'],
    ['https://workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1', Array(6).fill(reference), '9:16'],
  ] as const) {
    process.env.AI_API_BASE_URL = baseUrl;
    const response = await image(request({ prompt: 'Draw', referenceImages, aspectRatio, referenceLabels: ['Character A'] }, null));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { imageUrl: reference });
    const generation = calls[calls.length - 2];
    const download = calls[calls.length - 1];
    assert.equal(generation.url, `${new URL(baseUrl).origin}/api/v1/services/aigc/multimodal-generation/generation`);
    assert.equal(new Headers(generation.init?.headers).get('Authorization'), 'Bearer server-default-key');
    const body = JSON.parse(String(generation.init?.body));
    assert.deepEqual(body, {
      model: 'qwen-image-2.1-pro',
      input: { messages: [{ role: 'user', content: [
        ...referenceImages.map((value) => ({ image: value })),
        { text: referenceImages.length ? 'Character A\n\nDraw' : 'Draw' },
      ] }] },
      parameters: { size: aspectRatio === '9:16' ? '864*1536' : '1536*864', n: 1 },
    });
    assert.equal(download.url, resultUrl);
    assert.equal(download.init?.method, 'GET');
    assert.equal(new Headers(download.init?.headers).get('Authorization'), null);
    assert.ok(download.options.lookup);
  }
});

test('Bailian applies native reference count, format and size limits before requesting images', async () => {
  process.env.AI_API_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  process.env.AI_IMAGE_MODEL = 'qwen-image-3.0-pro';
  assert.equal((await image(request({ prompt: 'Draw', referenceImages: Array(4).fill(reference) }))).status, 400);
  process.env.AI_IMAGE_MODEL = 'qwen-image-2.1-pro';
  assert.equal((await image(request({ prompt: 'Draw', referenceImages: [reference.replace('image/png', 'image/heic')] }))).status, 400);
  const oversized = `data:image/png;base64,${Buffer.alloc(10 * 1024 * 1024 + 1).toString('base64')}`;
  assert.equal((await image(request({ prompt: 'Draw', referenceImages: [oversized] }))).status, 413);
  assert.equal(calls.length, 0);
});

test('Bailian result downloads reject untrusted URLs without making another request', async () => {
  process.env.AI_API_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  process.env.AI_IMAGE_MODEL = 'qwen-image-2.1-pro';
  for (const url of [
    'https://127.0.0.1/image.png', 'https://untrusted.example/image.png',
    'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com.evil.example/image.png',
    'http://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/image.png',
    'https://user:password@dashscope-result-bj.oss-cn-beijing.aliyuncs.com/image.png',
    'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com:8443/image.png',
    'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/image.png#fragment',
    'invalid-url', { value: 'invalid' },
  ]) {
    upstream = () => Response.json({ output: { choices: [{ message: { content: [{ image: url }] } }] } });
    const before = calls.length;
    assert.equal((await image(request({ prompt: 'Draw' }))).status, 502);
    assert.equal(calls.length, before + 1);
  }
  assert.equal(lookups.length, 0);
});

test('Bailian result URLs cannot reach private addresses or follow redirects', async () => {
  process.env.AI_API_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  process.env.AI_IMAGE_MODEL = 'qwen-image-2.1-pro';
  const resultUrl = 'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/result.png';
  upstream = () => calls[calls.length - 1].init?.method === 'GET'
    ? new Response('Redirecting', { status: 302, headers: { Location: 'https://127.0.0.1/private' } })
    : Response.json({ output: { choices: [{ message: { content: [{ image: resultUrl }] } }] } });
  dnsAnswers = [{ address: '127.0.0.1', family: 4 }];
  assert.equal((await image(request({ prompt: 'Draw' }))).status, 502);
  assert.equal(calls.length, 1);
  dnsAnswers = [{ address: '93.184.216.34', family: 4 }];
  assert.equal((await image(request({ prompt: 'Draw' }))).status, 502);
  assert.equal(calls.length, 3);
  assert.equal(new Headers(calls[2].init?.headers).get('Authorization'), null);
});

test('Bailian downloads reject failed responses, non-PNG data and oversized images', async () => {
  process.env.AI_API_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  process.env.AI_IMAGE_MODEL = 'qwen-image-2.1-pro';
  const oversized = Buffer.alloc(25 * 1024 * 1024 + 1);
  Buffer.from(png, 'base64').copy(oversized);
  for (const result of [new Response('Expired', { status: 403 }), new Response('<svg/>'), new Response(oversized)]) {
    upstream = () => calls[calls.length - 1].init?.method === 'GET'
      ? result : Response.json({ output: { choices: [{ message: { content: [{ image: 'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/result.png' }] } }] } });
    assert.equal((await image(request({ prompt: 'Draw' }))).status, 502);
  }
});

test('Bailian Fake-IP DNS uses verified public DoH answers and pins the real address', async () => {
  process.env.AI_API_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  process.env.AI_IMAGE_MODEL = 'qwen-image-2.1-pro';
  dnsAnswers = [{ address: '198.18.0.5', family: 4 }];
  const resolutions: Array<{ url: string; init: RequestInit }> = [];
  mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    resolutions.push({ url, init });
    return Response.json({ Status: 0, Answer: [{ type: 1, data: '93.184.216.34' }] });
  });
  upstream = () => calls[calls.length - 1].init?.method === 'GET'
    ? new Response(Buffer.from(png, 'base64'))
    : Response.json({ output: { choices: [{ message: { content: [{ image: 'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/result.png' }] } }] } });
  assert.equal((await image(request({ prompt: 'Draw' }))).status, 200);
  assert.equal(resolutions.length, 1);
  assert.equal(new URL(resolutions[0].url).hostname, 'dns.alidns.com');
  assert.equal(new URL(resolutions[0].url).searchParams.get('name'), 'dashscope-result-bj.oss-cn-beijing.aliyuncs.com');
  assert.equal(resolutions[0].init.redirect, 'error');
  assert.equal(new Headers(resolutions[0].init.headers).get('Authorization'), null);
  const lookup = calls[1].options.lookup as (hostname: string, options: object, callback: (error: Error | null, address: string, family: number) => void) => void;
  lookup('dashscope-result-bj.oss-cn-beijing.aliyuncs.com', {}, (error, address, family) => {
    assert.equal(error, null);
    assert.equal(address, '93.184.216.34');
    assert.equal(family, 4);
  });
});

test('Bailian Fake-IP fallback rejects private or malformed DoH answers', async () => {
  process.env.AI_API_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  process.env.AI_IMAGE_MODEL = 'qwen-image-2.1-pro';
  dnsAnswers = [{ address: '198.18.0.5', family: 4 }];
  let answer: unknown;
  mock.method(globalThis, 'fetch', async () => Response.json(answer));
  upstream = () => Response.json({ output: { choices: [{ message: { content: [{ image: 'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/result.png' }] } }] } });
  for (const data of [
    { Status: 0, Answer: [{ type: 1, data: '127.0.0.1' }] },
    { Status: 0, Answer: [{ type: 1, data: '198.18.1.1' }] },
    { Status: 0, Answer: [{ type: 1, data: 42 }] },
    { Status: 0, Answer: [{ type: 1, data: '93.184.216.34' }, { type: 1, data: '10.0.0.1' }] },
    { Status: 0, Answer: [] }, { Status: 3, Answer: [] }, [],
  ]) {
    answer = data;
    const before = calls.length;
    assert.equal((await image(request({ prompt: 'Draw' }))).status, 502);
    assert.equal(calls.length, before + 1);
  }
});

test('request size limits work without trusting content-length', async () => {
  await assert.rejects(readJsonBody(request({ value: 'too large' }), 3), { status: 413 });
  const declared = request({});
  declared.headers.set('content-length', '100');
  await assert.rejects(readJsonBody(declared, 10), { status: 413 });
});

test('invalid deployment URLs never receive the caller key', async () => {
  process.env.AI_API_BASE_URL = 'https://provider.example/?redirect=private';
  assert.equal((await chat(request({ prompt: 'Hi', systemPrompt: 'Write' }))).status, 503);
  assert.equal(calls.length, 0);
});

test('public configuration exposes only defaults and key availability without caching', async () => {
  process.env.AI_TEXT_MODEL = 'env-text-model';
  process.env.AI_IMAGE_MODEL = 'env-image-model';
  const response = publicConfig();
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), {
    baseUrl: 'https://provider.example', textModel: 'env-text-model', imageModel: 'env-image-model', hasApiKey: true,
  });
  process.env.AI_API_KEY = ' ';
  assert.equal((await publicConfig().json()).hasApiKey, false);
  process.env.AI_API_BASE_URL = 'invalid';
  const invalid = publicConfig();
  assert.equal(invalid.status, 503);
  assert.equal(invalid.headers.get('Cache-Control'), 'no-store');
  assert.equal(calls.length, 0);
});

test('blank user fields inherit each environment default including the server key', async () => {
  process.env.AI_TEXT_MODEL = 'env-text-model';
  process.env.AI_IMAGE_MODEL = 'env-image-model';
  upstream = () => Response.json({ choices: [{ message: { content: 'Text' } }], data: [{ b64_json: png }] });
  for (const handler of [chat, image]) {
    const response = await handler(request({ prompt: 'Hi', systemPrompt: 'Write', baseUrl: '  ', model: '\t ' }, '  '));
    assert.equal(response.status, 200);
    assert.doesNotMatch(await response.text(), /server-default-key/);
    const call = calls[calls.length - 1];
    assert.match(call.url, /^https:\/\/provider\.example\//);
    assert.equal(new Headers(call.init?.headers).get('Authorization'), 'Bearer server-default-key');
    assert.equal(JSON.parse(String(call.init?.body)).model, handler === chat ? 'env-text-model' : 'env-image-model');
  }
});

test('user overrides are independent of invalid overridden or unrelated environment fields', async () => {
  process.env.AI_IMAGE_MODEL = 'a'.repeat(201);
  process.env.AI_TEXT_MODEL = 'b'.repeat(201);
  process.env.AI_API_BASE_URL = 'invalid';
  upstream = () => Response.json({ choices: [{ message: { content: 'Text' } }], data: [{ b64_json: png }] });
  for (const handler of [chat, image]) {
    assert.equal((await handler(request({ prompt: 'Hi', systemPrompt: 'Write', baseUrl: 'https://custom.example', model: 'user-model' }))).status, 200);
  }
  process.env.AI_API_BASE_URL = 'https://provider.example';
  process.env.AI_TEXT_MODEL = 'valid-text';
  assert.equal((await chat(request({ prompt: 'Hi', systemPrompt: 'Write' }))).status, 200);
  process.env.AI_TEXT_MODEL = 'b'.repeat(201);
  process.env.AI_IMAGE_MODEL = 'valid-image';
  assert.equal((await image(request({ prompt: 'Draw' }))).status, 200);
});

test('request configuration rejects invalid types, lengths, protocols and URL components', async () => {
  for (const body of [
    { model: 42 }, { model: null }, { model: 'a'.repeat(201) }, { model: 'model\nname' },
    { baseUrl: false }, { baseUrl: null }, { baseUrl: 'x'.repeat(2049) },
    { baseUrl: 'file:///etc/passwd' }, { baseUrl: 'http://public.example' },
    { baseUrl: 'https://name:password@public.example' }, { baseUrl: 'https://public.example/?query=value' },
    { baseUrl: 'https://public.example/?' }, { baseUrl: 'https://public.example/#' },
    { baseUrl: 'https://public.example/#fragment' }, { baseUrl: 'https://public.example/\\path' },
  ]) {
    assert.equal((await chat(request({ prompt: 'Hi', systemPrompt: 'Write', ...body }))).status, 400);
  }
  assert.equal((await chat(request({ prompt: 'Hi', systemPrompt: 'Write' }, 'a'.repeat(4097)))).status, 400);
  const invalidHeader = request({ prompt: 'Hi', systemPrompt: 'Write' });
  invalidHeader.headers.set('authorization', 'Basic secret');
  assert.equal((await chat(invalidHeader)).status, 400);
  assert.equal(calls.length, 0);
});

test('server keys cannot reach a different origin without a user supplied key', async () => {
  for (const handler of [chat, image]) {
    const response = await handler(request({ prompt: 'Hi', systemPrompt: 'Write', baseUrl: 'https://custom.example' }, null));
    assert.equal(response.status, 400);
    const body = await response.text();
    assert.match(body, /API Key/);
    assert.doesNotMatch(body, /server-default-key/);
  }
  assert.equal(calls.length, 0);
  assert.equal(lookups.length, 0);
});

test('a same-origin custom path may inherit the server key after public address validation', async () => {
  upstream = () => Response.json({ choices: [{ message: { content: 'Text' } }] });
  assert.equal((await chat(request({ prompt: 'Hi', systemPrompt: 'Write', baseUrl: 'https://provider.example/custom' }, null))).status, 200);
  assert.equal(calls[0].url, 'https://provider.example/custom/v1/chat/completions');
  assert.equal(new Headers(calls[0].init?.headers).get('Authorization'), 'Bearer server-default-key');
  assert.deepEqual(lookups, ['provider.example']);
});

test('custom URLs reject private, reserved, mapped IPv6 and unusual IPv4 addresses', async () => {
  for (const host of [
    'localhost', 'localhost.', 'metadata.google.internal', '127.0.0.1', '127.1', '2130706433', '0x7f000001',
    '10.0.0.1', '100.64.0.1', '169.254.169.254', '172.16.0.1', '192.168.0.1', '192.0.2.1',
    '198.18.0.1', '198.51.100.1', '203.0.113.1', '224.0.0.1', '240.0.0.1', '0.0.0.0',
    '[::1]', '[::]', '[::ffff:127.0.0.1]', '[::ffff:7f00:1]', '[fc00::1]', '[fe80::1]',
    '[2001:db8::1]', '[2002:7f00:1::1]', '[64:ff9b::7f00:1]',
  ]) {
    assert.equal((await chat(request({ prompt: 'Hi', systemPrompt: 'Write', baseUrl: `https://${host}` }))).status, 400, host);
  }
  assert.equal(calls.length, 0);
  assert.equal(lookups.length, 0);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
  assert.equal(isPublicAddress('2001:4860:4860::8888'), true);
});

test('DNS names resolving to any private address or failing resolution are rejected', async () => {
  const body = { prompt: 'Hi', systemPrompt: 'Write', baseUrl: 'https://custom.example' };
  for (const answers of [
    [{ address: '127.0.0.1', family: 4 }],
    [{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.1', family: 4 }],
    [{ address: '::ffff:7f00:1', family: 6 }],
    [], new Error('DNS failed with sensitive details'),
  ]) {
    dnsAnswers = answers;
    const response = await chat(request(body));
    assert.equal(response.status, 400);
    assert.doesNotMatch(await response.text(), /sensitive details|server-default-key|user-key/);
  }
  assert.equal(calls.length, 0);
});

test('verified DNS addresses are pinned to the actual socket lookup without connection pooling', async () => {
  upstream = () => Response.json({ choices: [{ message: { content: 'Text' } }] });
  assert.equal((await chat(request({ prompt: 'Hi', systemPrompt: 'Write', baseUrl: 'https://custom.example:8443' }))).status, 200);
  dnsAnswers = [{ address: '127.0.0.1', family: 4 }];
  const call = calls[0];
  assert.equal(call.options.agent, false);
  assert.equal(call.options.family, 4);
  const lookup = call.options.lookup as (hostname: string, options: object, callback: (error: Error | null, address: string, family: number) => void) => void;
  lookup('custom.example', {}, (error, address, family) => {
    assert.equal(error, null);
    assert.equal(address, '93.184.216.34');
    assert.equal(family, 4);
  });
  assert.deepEqual(lookups, ['custom.example']);
});

test('trusted deployment defaults may use an internal HTTP service', async () => {
  process.env.AI_API_BASE_URL = 'http://127.0.0.1:8080';
  upstream = () => Response.json({ choices: [{ message: { content: 'Text' } }] });
  for (const baseUrl of [undefined, 'http://127.0.0.1:8080']) {
    assert.equal((await chat(request({ prompt: 'Hi', systemPrompt: 'Write', baseUrl }, null))).status, 200);
  }
  assert.equal(calls[0].url, 'http://127.0.0.1:8080/v1/chat/completions');
  assert.equal(lookups.length, 0);
  assert.equal((await chat(request({ prompt: 'Hi', systemPrompt: 'Write', baseUrl: 'https://127.0.0.1:8080/custom' }))).status, 400);
});

test('redirects are rejected without issuing a second request', async () => {
  upstream = () => new Response('Redirecting', { status: 302, headers: { Location: 'https://127.0.0.1/private' } });
  const response = await chat(request({ prompt: 'Hi', systemPrompt: 'Write' }));
  assert.equal(response.status, 502);
  assert.match(await response.text(), /重定向/);
  assert.equal(calls.length, 1);
});

test('nonstandard upstream HTTP status codes produce a handled 502', async () => {
  upstream = () => Response.json({ choices: [{ message: { content: 'Text' } }] });
  for (const status of [199, 700]) {
    responseStatusOverride = status;
    const response = await chat(request({ prompt: 'Hi', systemPrompt: 'Write' }));
    assert.equal(response.status, 502);
    assert.match(await response.text(), /HTTP 状态码/);
  }
});

test('upstream success and error bodies have bounded byte sizes', async () => {
  upstream = () => new Response('{}', { headers: { 'Content-Length': String(40 * 1024 * 1024 + 1) } });
  assert.equal((await chat(request({ prompt: 'Hi', systemPrompt: 'Write' }))).status, 502);
  upstream = () => new Response('a'.repeat(64 * 1024 + 1), { status: 500 });
  const response = await chat(request({ prompt: 'Hi', systemPrompt: 'Write' }));
  assert.equal(response.status, 502);
  assert.match(await response.text(), /响应体积过大/);
});

test('both endpoints redact the actual inherited environment key from upstream errors', async () => {
  upstream = () => Response.json({ error: { message: 'Invalid server-default-key; key server-default-key' } }, { status: 401 });
  for (const handler of [chat, image]) {
    const response = await handler(request({ prompt: 'Hi', systemPrompt: 'Write' }, null));
    assert.equal(response.status, handler === chat ? 401 : 502);
    const body = await response.text();
    assert.doesNotMatch(body, /server-default-key/);
    assert.match(body, /\[REDACTED\]/);
  }
});
