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

    const { createTextProviderConfigs, getTextApiConfig } = await import('../lib/textProviders.ts');
    const configs = createTextProviderConfigs();
    for (const [provider, config] of Object.entries(configs)) {
      config.apiKey = `${provider}-key`;
      if (provider === 'claude') config.workspaceId = 'wrkspc_browser';
    }
    useAppStore.getState().setApiBaseUrl('https://image-provider.example');
    useAppStore.getState().setApiKey('image-provider-key');
    useAppStore.getState().setImageModel('image-only-model');
    for (const provider of Object.keys(configs) as Array<keyof typeof configs>) {
      useAppStore.getState().setTextApiSettings(provider, configs);
      await generateContent('image-provider-key', 'Story prompt', 'Write');
      const call = calls[calls.length - 1];
      assert.equal(call.headers.get('Authorization'), `Bearer ${provider}-key`);
      assert.equal(call.body.baseUrl, configs[provider].baseUrl);
      assert.equal(call.body.model, configs[provider].model);
      assert.equal(call.body.provider, provider);
      assert.equal(call.body.workspaceId, provider === 'claude' ? 'wrkspc_browser' : undefined);
    }
    await generateImage('image-provider-key', 'Draw');
    const imageCall = calls[calls.length - 1];
    assert.equal(imageCall.body.baseUrl, 'https://image-provider.example');
    assert.equal(imageCall.body.model, 'image-only-model');
    assert.equal(imageCall.headers.get('Authorization'), 'Bearer image-provider-key');
    assert.equal('provider' in imageCall.body, false);

    useAppStore.getState().setTextApiSettings('claude', createTextProviderConfigs());
    useAppStore.getState().setAiDefaults({ baseUrl: 'https://server.example', textModel: 'server-text', imageModel: 'server-image', hasApiKey: true });
    assert.equal(getTextApiConfig(useAppStore.getState()).hasApiKey, false);
    const callCount = calls.length;
    await assert.rejects(generateContent('image-provider-key', 'Story prompt', 'Write'), /API Key/);
    assert.equal(calls.length, callCount);
  } finally {
    mock.restoreAll();
    Reflect.deleteProperty(globalThis, 'window');
  }
});
