import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

test('browser requests carry user overrides and omit empty fields for server defaults', async () => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      setTimeout,
      localStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
    },
  });
  const calls: Array<{ url: string; headers: Headers; body: Record<string, unknown> }> = [];
  mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    calls.push({ url, headers: new Headers(init.headers), body: JSON.parse(String(init.body)) });
    return Response.json(url.endsWith('/image') ? { imageUrl: 'data:image/png;base64,aW1hZ2U=' } : { content: 'A story' });
  });

  try {
    const { useAppStore } = await import('../store/index.ts');
    const { generateContent, generateImage } = await import('./llm.ts');
    useAppStore.getState().setApiBaseUrl(' https://user-provider.example ');
    useAppStore.getState().setTextModel(' user-text-model ');
    useAppStore.getState().setImageModel(' user-image-model ');

    assert.equal(await generateContent(' user-key ', 'Story prompt', 'Write'), 'A story');
    assert.equal(calls[0].url, '/api/ai/chat');
    assert.equal(calls[0].headers.get('Authorization'), 'Bearer user-key');
    assert.deepEqual(calls[0].body, {
      prompt: 'Story prompt', systemPrompt: 'Write', baseUrl: 'https://user-provider.example', model: 'user-text-model',
    });

    assert.equal(await generateImage('user-key', 'Draw'), 'data:image/png;base64,aW1hZ2U=');
    assert.equal(calls[1].url, '/api/ai/image');
    assert.equal(calls[1].body.baseUrl, 'https://user-provider.example');
    assert.equal(calls[1].body.model, 'user-image-model');
    assert.equal(calls[1].headers.get('Authorization'), 'Bearer user-key');
    assert.equal('apiKey' in calls[1].body, false);

    useAppStore.getState().resetApiOverrides();
    await generateContent('', 'Story prompt', 'Write');
    await generateImage('', 'Draw');
    for (const call of calls.slice(2)) {
      assert.equal(call.headers.has('Authorization'), false);
      assert.equal('baseUrl' in call.body, false);
      assert.equal('model' in call.body, false);
    }
  } finally {
    mock.restoreAll();
    Reflect.deleteProperty(globalThis, 'window');
  }
});
