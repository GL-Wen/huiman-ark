import assert from 'node:assert/strict';
import { test } from 'node:test';

test('API keys stay in memory and obsolete model settings are not restored', async () => {
  const values = new Map<string, string>([
    ['huiman-ark-storage', JSON.stringify({ state: { apiKey: 'old-saved-key', model: 'custom-model', language: 'English' }, version: 0 })],
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
    assert.equal(useAppStore.getState().apiKey, '');
    assert.equal('model' in useAppStore.getState(), false);
    assert.equal('setModel' in useAppStore.getState(), false);
    assert.equal(useAppStore.getState().language, 'English');

    useAppStore.getState().setApiKey('current-page-key');
    useAppStore.getState().closeApiSettings();
    assert.equal(useAppStore.getState().apiKey, 'current-page-key');
    assert.doesNotMatch(values.get('huiman-ark-storage')!, /apiKey|current-page-key|old-saved-key|model|custom-model/);

    useAppStore.getState().clearHistory();
    assert.equal(useAppStore.getState().apiKey, 'current-page-key');
    assert.equal('model' in useAppStore.getState(), false);

    await useAppStore.persist.rehydrate();
    assert.equal(useAppStore.getState().apiKey, '');
    assert.equal('model' in useAppStore.getState(), false);
  } finally {
    Reflect.deleteProperty(globalThis, 'window');
  }
});
