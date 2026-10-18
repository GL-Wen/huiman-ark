import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { POST as chat } from '../../app/api/ai/chat/route.ts';
import { POST as image } from '../../app/api/ai/image/route.ts';
import { readJsonBody } from './generation.ts';

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCLsAAAAASUVORK5CYII=';
const reference = `data:image/png;base64,${png}`;
const originalEnv = {
  AI_API_BASE_URL: process.env.AI_API_BASE_URL,
  AI_API_KEY: process.env.AI_API_KEY,
  AI_IMAGE_MODEL: process.env.AI_IMAGE_MODEL,
};
let calls: Array<{ url: string; init?: RequestInit }>;
let upstream: () => Response | Promise<Response>;

beforeEach(() => {
  process.env.AI_API_BASE_URL = 'https://provider.example/';
  process.env.AI_API_KEY = 'server-key-must-never-be-used';
  delete process.env.AI_IMAGE_MODEL;
  calls = [];
  upstream = () => { throw new Error('Unexpected upstream request'); };
  mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return upstream();
  });
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

test('both endpoints require the caller key even when a server key exists', async () => {
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

test('chat sends only the caller key to the configured host and uses the fixed text model', async () => {
  upstream = () => Response.json({ choices: [{ message: { content: 'A short story' } }] });
  const response = await chat(request({
    prompt: 'Hello', systemPrompt: 'Write', apiKey: 'body-key', baseURL: 'https://untrusted.example', model: 'custom-model',
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { content: 'A short story' });
  assert.equal(calls[0].url, 'https://provider.example/v1/chat/completions');
  assert.equal(new Headers(calls[0].init?.headers).get('Authorization'), 'Bearer user-key');
  assert.equal(calls[0].init?.redirect, 'error');
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    model: 'claude-opus-5-5', messages: [{ role: 'system', content: 'Write' }, { role: 'user', content: 'Hello' }], temperature: 0.7,
  });
});

test('chat defaults to AntMoo and ignores caller model fields', async () => {
  delete process.env.AI_API_BASE_URL;
  upstream = () => Response.json({ choices: [{ message: { content: 'Text' } }] });
  for (const model of ['custom-model', 42, { model: 'ignored' }]) {
    assert.equal((await chat(request({ prompt: 'Hi', systemPrompt: 'Write', model }))).status, 200);
    const call = calls[calls.length - 1];
    assert.equal(call.url, 'https://api.antmoo.cc/v1/chat/completions');
    assert.equal(JSON.parse(String(call.init?.body)).model, 'claude-opus-5-5');
  }
});

test('upstream errors, network failures and invalid responses produce a useful 502', async () => {
  const payload = { prompt: 'Hi', systemPrompt: 'Write' };
  upstream = () => Response.json({ error: { message: 'Model unavailable' } }, { status: 429 });
  const rejected = await chat(request(payload));
  assert.equal(rejected.status, 502);
  assert.match(await rejected.text(), /Model unavailable/);
  upstream = () => { throw new Error('network error with secret details'); };
  const disconnected = await chat(request(payload));
  assert.equal(disconnected.status, 502);
  assert.doesNotMatch(await disconnected.text(), /secret details|user-key/);
  upstream = () => new Response('not json');
  assert.equal((await chat(request(payload))).status, 502);
  upstream = () => Response.json({ choices: [] });
  assert.equal((await chat(request(payload))).status, 502);
});

test('both endpoints redact caller keys echoed by upstream errors', async () => {
  upstream = () => Response.json({ error: { message: 'Invalid key user-key; received user-key' } }, { status: 401 });
  for (const handler of [chat, image]) {
    const response = await handler(request({ prompt: 'Hi', systemPrompt: 'Write' }));
    assert.equal(response.status, 502);
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

test('image edits accept local references and preserve their labels and instruction', async () => {
  process.env.AI_IMAGE_MODEL = 'custom-image-model';
  upstream = () => Response.json({ data: [{ b64_json: png }] });
  const response = await image(request({
    prompt: 'Draw', referenceImages: [reference], referenceLabels: ['Character A'], referenceInstruction: 'Keep identity',
  }));
  assert.equal(response.status, 200);
  assert.equal(calls[0].url, 'https://provider.example/v1/images/edits');
  const form = calls[0].init?.body as FormData;
  assert.equal(form.get('model'), 'gpt-image-2');
  assert.equal(form.get('prompt'), 'Keep identity\n\nCharacter A\n\nDraw');
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
  assert.equal(form.get('prompt'), 'Reference 1: Character A\n\nReference 2: Character B\n\nDraw both characters');
});

test('image model ignores stale environment and request overrides and defaults to AntMoo', async () => {
  delete process.env.AI_API_BASE_URL;
  upstream = () => Response.json({ data: [{ b64_json: png }] });
  for (const model of ['gpt-image-1', 'gpt-image-1.5', 'custom-image-model']) {
    process.env.AI_IMAGE_MODEL = model;
    assert.equal((await image(request({ prompt: 'Draw', referenceImages: [reference], model }))).status, 200);
    const call = calls[calls.length - 1];
    assert.equal(call.url, 'https://api.antmoo.cc/v1/images/edits');
    const form = call.init?.body as FormData;
    assert.equal(form.get('model'), 'gpt-image-2');
    assert.equal(form.get('input_fidelity'), null);
  }
  assert.equal((await image(request({ prompt: 'Draw', model: 'custom-image-model' }))).status, 200);
  const call = calls[calls.length - 1];
  assert.equal(call.url, 'https://api.antmoo.cc/v1/images/generations');
  assert.equal(JSON.parse(String(call.init?.body)).model, 'gpt-image-2');
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
