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

test('generateCharacterPortraits produces portraits keyed by character name and original index', async () => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      setTimeout,
      clearTimeout,
    },
  });

  mock.method(globalThis, 'fetch', async () => {
    return Response.json({ imageUrl: 'data:image/png;base64,mockPortrait' });
  });

  try {
    const { generateCharacterPortraits } = await import('./llm.ts');
    const result = await generateCharacterPortraits('test-api-key', {
      characterText: '',
      language: 'zh',
      animeStyle: '日系二次元',
      style: '精致',
      sheetImage: 'data:image/png;base64,sheet',
      targetProfiles: [
        {
          profile: {
            name: '艾尔',
            appearance: '少年剑士',
            outfit: '披风',
            personality: '勇敢',
            role: '主角',
            staging: '站立',
            raw: '艾尔设定',
          },
          originalIndex: 0,
        },
      ],
    });

    assert.equal(result.failures.length, 0);
    assert.equal(result.portraits['艾尔'], 'data:image/png;base64,mockPortrait');
    assert.equal(result.portraits['艾尔#0'], 'data:image/png;base64,mockPortrait');
  } finally {
    mock.restoreAll();
    Reflect.deleteProperty(globalThis, 'window');
  }
});

test('getMaxReferenceImages caps Qwen 3.0 at 3 and parseSegmentFields extracts updated fields', async () => {
  const { getMaxReferenceImages, parseSegmentFields, buildComicPagePrompt } = await import('./llm.ts');
  assert.equal(getMaxReferenceImages('qwen-image-3.0-pro'), 3);
  assert.equal(getMaxReferenceImages('qwen-image-2.1-pro'), 6);
  assert.equal(getMaxReferenceImages('doubao-seedream-5-0-flash-260915'), 6);

  const parsed = parseSegmentFields('场景：荒野客栈\n情节概述：雪夜偶遇\n画面描述：灯火摇曳\n本段落漫画分格建议：\n- 第1格：推门');
  assert.deepEqual(parsed, { scene: '荒野客栈', plot: '雪夜偶遇', desc: '灯火摇曳' });

  const prompt = buildComicPagePrompt({
    segment: { id: 'cut-1', title: '开场', cut: 'Cut 1', ...parsed, raw: '场景：荒野客栈' },
    storyInput: '故事',
    characterDesign: null,
    characterNames: [],
    language: '中文（简体）',
    aspectRatio: '16:9',
    animeStyle: '国风',
    style: '',
    characterReferenceMode: 'none',
    portraitNames: [],
    panelsPerParagraph: '4~5',
  });
  assert.match(prompt, /4~5 个分格/);
});
