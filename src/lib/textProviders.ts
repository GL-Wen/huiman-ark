// shortcut: providers use OpenAI compatibility; add Messages support when native Claude features are needed.
export const TEXT_PROVIDER_PRESETS = {
  volcengine: { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seed-2-1-lite-260915' },
  'volcengine-agent': { baseUrl: 'https://ark.cn-beijing.volces.com/api/plan/v3', model: 'doubao-seed-2.1-lite' },
  'volcengine-coding': { baseUrl: 'https://ark.cn-beijing.volces.com/api/coding/v3', model: 'doubao-seed-2.1-lite' },
  aliyun: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  'aliyun-coding': { baseUrl: 'https://coding.dashscope.aliyuncs.com/v1', model: 'qwen3.7-plus' },
  claude: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-opus-5-5' },
} as const;

export type TextProvider = 'default' | keyof typeof TEXT_PROVIDER_PRESETS;
export interface TextProviderConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  workspaceId: string;
}
export type TextProviderConfigs = Record<Exclude<TextProvider, 'default'>, TextProviderConfig>;

export const createTextProviderConfigs = (): TextProviderConfigs => Object.fromEntries(
  Object.entries(TEXT_PROVIDER_PRESETS).map(([provider, config]) => [provider, { ...config, apiKey: '', workspaceId: '' }]),
) as TextProviderConfigs;

export const getTextApiConfig = (state: {
  textProvider: TextProvider;
  textProviderConfigs: TextProviderConfigs;
  apiBaseUrl: string;
  textModel: string;
  apiKey: string;
  hasDefaultApiKey: boolean;
}, apiKey = state.apiKey) => {
  if (state.textProvider === 'default') {
    return {
      baseUrl: state.apiBaseUrl.trim(), model: state.textModel.trim(), apiKey: apiKey.trim(),
      workspaceId: '', hasApiKey: Boolean(apiKey.trim() || state.hasDefaultApiKey),
    };
  }
  const config = state.textProviderConfigs[state.textProvider];
  const preset = TEXT_PROVIDER_PRESETS[state.textProvider];
  return {
    baseUrl: config.baseUrl.trim() || preset.baseUrl,
    model: config.model.trim() || preset.model,
    apiKey: config.apiKey.trim(),
    workspaceId: config.workspaceId.trim(),
    hasApiKey: Boolean(config.apiKey.trim()),
  };
};
