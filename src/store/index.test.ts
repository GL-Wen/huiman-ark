import assert from 'node:assert/strict';
import { test } from 'node:test';

test('API overrides persist, credentials and server defaults stay in memory, and overrides can be reset', async () => {
  const values = new Map<string, string>([
    ['huiman-ark-storage', JSON.stringify({ state: {
      apiKey: 'old-saved-key', model: 'obsolete-model', language: 'English',
      apiBaseUrl: 'https://saved.example', textModel: 'saved-text', imageModel: 'saved-image',
      defaultApiBaseUrl: 'https://stale-default.example', defaultTextModel: 'stale-text',
      defaultImageModel: 'stale-image', hasDefaultApiKey: true,
      textProvider: 'claude', textProviderConfigs: {
        claude: { baseUrl: 'https://saved-claude.example/v1', model: 'saved-claude', apiKey: 'old-profile-key', workspaceId: 'wrkspc_saved' },
      },
    }, version: 0 })],
  ]);
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (name: string) => values.get(name) ?? null,
        setItem: (name: string, value: string) => values.set(name, value),
        removeItem: (name: string) => values.delete(name),
      },
    },
  });

  try {
    const { useAppStore } = await import('./index.ts');
    const { getTextApiConfig } = await import('../lib/textProviders.ts');
    assert.equal(useAppStore.getState().apiKey, '');
    assert.equal('model' in useAppStore.getState(), false);
    assert.equal('setModel' in useAppStore.getState(), false);
    assert.equal(useAppStore.getState().language, 'English');
    assert.equal(useAppStore.getState().apiBaseUrl, 'https://saved.example');
    assert.equal(useAppStore.getState().textModel, 'saved-text');
    assert.equal(useAppStore.getState().imageModel, 'saved-image');
    assert.equal(useAppStore.getState().defaultApiBaseUrl, 'https://api.antmoo.cc');
    assert.equal(useAppStore.getState().defaultTextModel, 'claude-opus-5-5');
    assert.equal(useAppStore.getState().defaultImageModel, 'gpt-image-2');
    assert.equal(useAppStore.getState().hasDefaultApiKey, false);
    assert.equal(useAppStore.getState().textProvider, 'claude');
    assert.equal(useAppStore.getState().textProviderConfigs.claude.apiKey, '');
    assert.equal(useAppStore.getState().textProviderConfigs.claude.model, 'saved-claude');

    useAppStore.getState().setAiDefaults({
      baseUrl: 'https://server.example', textModel: 'server-text', imageModel: 'server-image', hasApiKey: true,
    });
    useAppStore.getState().setApiBaseUrl('https://user.example');
    useAppStore.getState().setTextModel('user-text');
    useAppStore.getState().setImageModel('user-image');
    useAppStore.getState().setApiKey('current-page-key');
    assert.equal(getTextApiConfig(useAppStore.getState()).hasApiKey, false);
    const configs = {
      ...useAppStore.getState().textProviderConfigs,
      claude: { baseUrl: 'https://claude.example/v1', model: 'claude-opus-5-5', apiKey: 'claude-page-key', workspaceId: 'wrkspc_current' },
    };
    useAppStore.getState().setTextApiSettings('claude', configs);
    assert.equal(getTextApiConfig(useAppStore.getState()).apiKey, 'claude-page-key');
    useAppStore.getState().setTextApiSettings('aliyun', configs);
    assert.equal(getTextApiConfig(useAppStore.getState()).hasApiKey, false);
    useAppStore.getState().setTextApiSettings('claude', configs);
    assert.equal(getTextApiConfig(useAppStore.getState()).apiKey, 'claude-page-key');
    useAppStore.getState().closeApiSettings();
    assert.equal(useAppStore.getState().apiKey, 'current-page-key');
    const persisted = JSON.parse(values.get('huiman-ark-storage')!).state;
    assert.equal(persisted.apiBaseUrl, 'https://user.example');
    assert.equal(persisted.textModel, 'user-text');
    assert.equal(persisted.imageModel, 'user-image');
    assert.equal(persisted.textProvider, 'claude');
    assert.equal(persisted.textProviderConfigs.claude.workspaceId, 'wrkspc_current');
    assert.doesNotMatch(values.get('huiman-ark-storage')!, /apiKey|current-page-key|claude-page-key|old-profile-key|old-saved-key|obsolete-model|defaultApi|defaultText|defaultImage|hasDefault|server\.example|server-text|server-image/);
    assert.equal('model' in persisted, false);

    useAppStore.getState().clearHistory();
    assert.equal(useAppStore.getState().apiKey, 'current-page-key');
    assert.equal(useAppStore.getState().apiBaseUrl, 'https://user.example');
    await useAppStore.persist.rehydrate();
    assert.equal(useAppStore.getState().apiKey, '');
    assert.equal(useAppStore.getState().textProviderConfigs.claude.apiKey, '');
    assert.equal(getTextApiConfig(useAppStore.getState()).hasApiKey, false);
    assert.equal(useAppStore.getState().textModel, 'user-text');
    assert.equal(useAppStore.getState().hasDefaultApiKey, true);

    useAppStore.getState().resetApiOverrides();
    assert.equal(useAppStore.getState().apiBaseUrl, '');
    assert.equal(useAppStore.getState().textModel, '');
    assert.equal(useAppStore.getState().imageModel, '');
    assert.equal(useAppStore.getState().apiKey, '');
    assert.equal(useAppStore.getState().textProvider, 'default');
    assert.equal(useAppStore.getState().textProviderConfigs.claude.baseUrl, 'https://api.anthropic.com/v1');
    assert.equal(useAppStore.getState().defaultApiBaseUrl, 'https://server.example');
    assert.equal(useAppStore.getState().defaultTextModel, 'server-text');
    assert.equal(useAppStore.getState().defaultImageModel, 'server-image');
    assert.equal(useAppStore.getState().hasDefaultApiKey, true);
    const resetPersisted = JSON.parse(values.get('huiman-ark-storage')!).state;
    assert.equal(resetPersisted.apiBaseUrl, '');
    assert.equal(resetPersisted.textModel, '');
    assert.equal(resetPersisted.imageModel, '');
  } finally {
    Reflect.deleteProperty(globalThis, 'window');
  }
});
