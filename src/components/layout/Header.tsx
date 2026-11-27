import React, { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleHelp, Github, KeyRound, X } from 'lucide-react';
import { APP_LINKS, AUTHOR_CONTACT } from '@/config/app';
import { useAppStore } from '../../store';
import { Logo } from '../common/Logo';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { Select } from '../common/Select';
import {
  createImageProviderConfigs,
  createTextProviderConfigs,
  getImageApiConfig,
  getTextApiConfig,
  IMAGE_PROVIDER_PRESETS,
  TEXT_PROVIDER_PRESETS,
  type ImageProvider,
  type ImageProviderConfig,
  type TextProvider,
  type TextProviderConfig,
} from '../../lib/textProviders.ts';

export const Header: React.FC = () => {
  const {
    apiKey, setApiKey, apiBaseUrl, setApiBaseUrl, textModel, setTextModel, imageModel, setImageModel,
    defaultApiBaseUrl, defaultTextModel, defaultImageModel, hasDefaultApiKey, setAiDefaults,
    resetApiOverrides, isApiSettingsOpen, openApiSettings, closeApiSettings,
    textProvider, textProviderConfigs, setTextApiSettings,
    imageProvider, imageProviderConfigs, setImageApiSettings,
    rememberApiKey, setRememberApiKey,
  } = useAppStore();
  const t = useTranslations('Header');
  const [draftKey, setDraftKey] = useState('');
  const [draftBaseUrl, setDraftBaseUrl] = useState('');
  const [draftTextModel, setDraftTextModel] = useState('');
  const [draftImageModel, setDraftImageModel] = useState('');
  const [draftTextProvider, setDraftTextProvider] = useState<TextProvider>('default');
  const [draftProviderConfigs, setDraftProviderConfigs] = useState(createTextProviderConfigs);
  const [draftImageProvider, setDraftImageProvider] = useState<ImageProvider>('default');
  const [draftImageProviderConfigs, setDraftImageProviderConfigs] = useState(createImageProviderConfigs);
  const [draftRememberKey, setDraftRememberKey] = useState(false);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);
  const [defaultsFailed, setDefaultsFailed] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const activeDialog = isApiSettingsOpen ? 'api' : isHelpOpen ? 'help' : null;
  const storeState = useAppStore.getState();
  const textApiReady = getTextApiConfig(storeState).hasApiKey && getImageApiConfig(storeState).hasApiKey;
  const draftConfig: TextProviderConfig = draftTextProvider === 'default'
    ? { baseUrl: draftBaseUrl, model: draftTextModel, apiKey: draftKey, workspaceId: '' }
    : draftProviderConfigs[draftTextProvider];
  const draftDefaults = draftTextProvider === 'default'
    ? { baseUrl: defaultApiBaseUrl, model: defaultTextModel }
    : TEXT_PROVIDER_PRESETS[draftTextProvider];
  const draftImgConfig: ImageProviderConfig = draftImageProvider === 'default'
    ? { baseUrl: draftBaseUrl, model: draftImageModel, apiKey: draftKey }
    : draftImageProviderConfigs[draftImageProvider];
  const draftImgDefaults = draftImageProvider === 'default'
    ? { baseUrl: defaultApiBaseUrl, model: defaultImageModel }
    : IMAGE_PROVIDER_PRESETS[draftImageProvider];

  React.useEffect(() => {
    let disposed = false;
    const loadDefaults = async () => {
      try {
        const response = await fetch('/api/ai/config', { cache: 'no-store' });
        if (!response.ok) throw new Error('Config unavailable');
        const config = await response.json();
        if (typeof config?.baseUrl !== 'string' || typeof config?.textModel !== 'string' ||
            typeof config?.imageModel !== 'string' || typeof config?.hasApiKey !== 'boolean') {
          throw new Error('Invalid config');
        }
        if (!disposed) setAiDefaults({
          baseUrl: config.baseUrl, textModel: config.textModel, imageModel: config.imageModel, hasApiKey: config.hasApiKey,
        });
      } catch {
        if (!disposed) setDefaultsFailed(true);
      } finally {
        if (!disposed) setIsLoadingDefaults(false);
      }
    };
    loadDefaults();
    return () => { disposed = true; };
  }, [setAiDefaults]);

  React.useEffect(() => {
    if (!isApiSettingsOpen) return;
    setDraftKey(apiKey);
    setDraftBaseUrl(apiBaseUrl);
    setDraftTextModel(textModel);
    setDraftImageModel(imageModel);
    setDraftTextProvider(textProvider);
    setDraftProviderConfigs(textProviderConfigs);
    setDraftImageProvider(imageProvider);
    setDraftImageProviderConfigs(imageProviderConfigs);
    setDraftRememberKey(rememberApiKey || (!hasDefaultApiKey && !apiKey && Object.values(textProviderConfigs).every((c) => !c.apiKey) && Object.values(imageProviderConfigs).every((c) => !c.apiKey)));
    setIsHelpOpen(false);
  }, [apiKey, apiBaseUrl, textModel, imageModel, textProvider, textProviderConfigs, imageProvider, imageProviderConfigs, rememberApiKey, hasDefaultApiKey, isApiSettingsOpen]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!activeDialog || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const helpButton = helpButtonRef.current;
    const getFocusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled])'));
    (dialog.querySelector<HTMLElement>('[data-dialog-autofocus]') ?? getFocusable()[0])?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (activeDialog === 'api') closeApiSettings();
        else setIsHelpOpen(false);
      }
      if (event.key !== 'Tab') return;
      const items = getFocusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus();
      else helpButton?.focus();
    };
  }, [activeDialog, closeApiSettings]);

  const openHelp = () => {
    closeApiSettings();
    setIsHelpOpen(true);
  };

  const showApiSettings = () => {
    setIsHelpOpen(false);
    openApiSettings();
  };

  const closeDialog = () => {
    if (activeDialog === 'api') closeApiSettings();
    else setIsHelpOpen(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setRememberApiKey(draftRememberKey);
    setApiKey(draftKey.trim());
    setApiBaseUrl(draftBaseUrl.trim());
    setTextModel(draftTextModel.trim());
    setImageModel(draftImageModel.trim());
    setTextApiSettings(draftTextProvider, draftProviderConfigs);
    setImageApiSettings(draftImageProvider, draftImageProviderConfigs);
    setDraftKey('');
    closeApiSettings();
  };

  const updateDraftConfig = (field: keyof TextProviderConfig, value: string) => {
    if (draftTextProvider === 'default') {
      if (field === 'baseUrl') setDraftBaseUrl(value);
      if (field === 'model') setDraftTextModel(value);
      if (field === 'apiKey') setDraftKey(value);
    } else {
      setDraftProviderConfigs((configs) => ({ ...configs, [draftTextProvider]: { ...configs[draftTextProvider], [field]: value } }));
    }
  };

  const updateDraftImgConfig = (field: keyof ImageProviderConfig, value: string) => {
    if (draftImageProvider === 'default') {
      if (field === 'baseUrl') setDraftBaseUrl(value);
      if (field === 'model') setDraftImageModel(value);
      if (field === 'apiKey') setDraftKey(value);
    } else {
      setDraftImageProviderConfigs((configs) => ({ ...configs, [draftImageProvider]: { ...configs[draftImageProvider], [field]: value } }));
    }
  };

  return (
    <>
      <header className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-gray-200 sm:px-6">
        <div className="flex items-center space-x-3">
          <Logo className="w-8 h-8" />
          <span className="text-lg font-bold text-gray-800">{t('appName')}</span>
          <span className="hidden rounded-md bg-indigo-50 px-2 py-1 text-xs text-indigo-600 sm:inline">{t('freeSoftware')}</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <a
            href={APP_LINKS.github}
            target="_blank"
            rel="noreferrer"
            className="h-9 w-9 text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 flex items-center justify-center transition-colors"
            aria-label={t('github')}
            title={t('github')}
          >
            <Github className="w-4 h-4" />
          </a>
          <button
            ref={helpButtonRef}
            type="button"
            onClick={openHelp}
            className="h-9 px-3 text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 flex items-center gap-1.5 transition-colors text-sm"
            aria-label={t('help')}
            title={t('help')}
          >
            <CircleHelp className="w-4 h-4" />
            <span className="hidden sm:inline">{t('help')}</span>
          </button>
          <button
            type="button"
            onClick={showApiSettings}
            className="h-9 px-3 text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 flex items-center gap-1.5 transition-colors text-sm"
            aria-label={t('apiSettings')}
            title={t('apiSettings')}
          >
            <KeyRound className="w-4 h-4" />
            <span>{textApiReady ? t('apiConfigured') : t('apiSettings')}</span>
          </button>
        </div>
      </header>

      {activeDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <div
            ref={dialogRef}
            className={`max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white p-6 shadow-xl ${activeDialog === 'api' ? 'max-w-md' : 'max-w-lg'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="header-dialog-title"
            aria-describedby="header-dialog-description"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 id="header-dialog-title" className="text-lg font-bold text-gray-800">{activeDialog === 'api' ? t('apiSettings') : t('help')}</h3>
              <button type="button" onClick={closeDialog} className="p-1 text-gray-400 hover:text-gray-600" aria-label={t('close')} data-dialog-autofocus={activeDialog === 'help' ? true : undefined}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {activeDialog === 'api' ? (
              <>
                <p id="header-dialog-description" className="mb-4 text-sm leading-6 text-gray-600">{t('apiDescription')}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="rounded-lg border border-gray-200 p-3.5 space-y-3 bg-gray-50/50">
                    <div>
                      <label htmlFor="text-provider" className="mb-1.5 block text-sm font-semibold text-gray-800">{t('textProvider')}</label>
                      <Select
                        id="text-provider"
                        value={draftTextProvider}
                        onChange={(value) => setDraftTextProvider(value as TextProvider)}
                        options={[
                          { value: 'default', label: t('providers.default') },
                          ...(Object.keys(TEXT_PROVIDER_PRESETS) as Array<Exclude<TextProvider, 'default'>>).map((provider) => ({
                            value: provider,
                            label: t(`providers.${provider}`),
                          })),
                        ]}
                      />
                    </div>
                    <div>
                      <label htmlFor="api-base-url" className="mb-1 block text-xs font-medium text-gray-600">{t('apiBaseUrl')}</label>
                      <input
                        id="api-base-url"
                        type="url"
                        value={draftConfig.baseUrl}
                        onChange={(event) => updateDraftConfig('baseUrl', event.target.value)}
                        placeholder={draftDefaults.baseUrl}
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                    <div>
                      <label htmlFor="text-model" className="mb-1 block text-xs font-medium text-gray-600">{t('textModel')}</label>
                      <input
                        id="text-model"
                        value={draftConfig.model}
                        onChange={(event) => updateDraftConfig('model', event.target.value)}
                        placeholder={draftDefaults.model}
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                    <div>
                      <label htmlFor="api-key" className="mb-1 block text-xs font-medium text-gray-600">API Key</label>
                      <input
                        id="api-key"
                        type="password"
                        value={draftConfig.apiKey}
                        onChange={(event) => updateDraftConfig('apiKey', event.target.value)}
                        placeholder={t(draftTextProvider === 'default' ? 'apiKeyPlaceholder' : 'textProviderKeyPlaceholder')}
                        autoComplete="off"
                        data-dialog-autofocus
                        spellCheck={false}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                    {draftTextProvider === 'claude' && (
                      <div>
                        <label htmlFor="claude-workspace" className="mb-1 block text-xs font-medium text-gray-600">{t('workspaceId')}</label>
                        <input
                          id="claude-workspace"
                          value={draftConfig.workspaceId}
                          onChange={(event) => updateDraftConfig('workspaceId', event.target.value)}
                          placeholder="wrkspc_..."
                          autoComplete="off"
                          spellCheck={false}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <p className="mt-1 text-xs leading-5 text-gray-500">{t('workspaceIdHint')}</p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-200 p-3.5 space-y-3 bg-gray-50/50">
                    <div>
                      <label htmlFor="image-provider" className="mb-1.5 block text-sm font-semibold text-gray-800">{t('imageProvider')}</label>
                      <Select
                        id="image-provider"
                        value={draftImageProvider}
                        onChange={(value) => setDraftImageProvider(value as ImageProvider)}
                        options={[
                          { value: 'default', label: t('imageProviders.default') },
                          ...(Object.keys(IMAGE_PROVIDER_PRESETS) as Array<Exclude<ImageProvider, 'default'>>).map((provider) => ({
                            value: provider,
                            label: t(`imageProviders.${provider}`),
                          })),
                        ]}
                      />
                    </div>
                    {draftImageProvider !== 'default' && (
                      <div>
                        <label htmlFor="image-base-url" className="mb-1 block text-xs font-medium text-gray-600">{t('apiBaseUrl')}</label>
                        <input
                          id="image-base-url"
                          type="url"
                          value={draftImgConfig.baseUrl}
                          onChange={(event) => updateDraftImgConfig('baseUrl', event.target.value)}
                          placeholder={draftImgDefaults.baseUrl}
                          autoComplete="off"
                          spellCheck={false}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                    )}
                    <div>
                      <label htmlFor="image-model" className="mb-1 block text-xs font-medium text-gray-600">{t('imageModel')}</label>
                      <input
                        id="image-model"
                        value={draftImgConfig.model}
                        onChange={(event) => updateDraftImgConfig('model', event.target.value)}
                        placeholder={draftImgDefaults.model}
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                    {draftImageProvider !== 'default' && (
                      <div>
                        <label htmlFor="image-api-key" className="mb-1 block text-xs font-medium text-gray-600">{t('imageApiKey')}</label>
                        <input
                          id="image-api-key"
                          type="password"
                          value={draftImgConfig.apiKey}
                          onChange={(event) => updateDraftImgConfig('apiKey', event.target.value)}
                          placeholder={t('imageProviderKeyPlaceholder')}
                          autoComplete="off"
                          spellCheck={false}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                    )}
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={draftRememberKey}
                      onChange={(event) => setDraftRememberKey(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs leading-5 text-gray-700">{t('rememberApiKey')}</span>
                  </label>

                  <p className="text-xs leading-5 text-gray-500" role="status">
                    {draftTextProvider !== 'default' || draftImageProvider !== 'default'
                      ? t('textProviderKeyHint')
                      : isLoadingDefaults
                        ? t('loadingDefaults')
                        : defaultsFailed
                          ? t('defaultsFailed')
                          : hasDefaultApiKey
                            ? t('defaultKeyAvailable')
                            : t('defaultKeyMissing')}
                  </p>
                  <p className="rounded-lg bg-indigo-50 p-3 text-xs leading-5 text-indigo-800">{t('apiKeyPrivacy')}</p>
                  <div className="flex gap-3">
                    {(textProvider !== 'default' || imageProvider !== 'default' || rememberApiKey || apiKey || apiBaseUrl || textModel || imageModel || Object.values(textProviderConfigs).some((config) => config.apiKey) || Object.values(imageProviderConfigs).some((config) => config.apiKey)) && (
                      <button
                        type="button"
                        onClick={() => {
                          resetApiOverrides();
                          setDraftKey('');
                          setDraftBaseUrl('');
                          setDraftTextModel('');
                          setDraftImageModel('');
                          setDraftRememberKey(false);
                          closeApiSettings();
                        }}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        {t('resetApiSettings')}
                      </button>
                    )}
                    <button type="submit" className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300">
                      {t('saveApiKey')}
                    </button>
                  </div>
                </form>
                <button type="button" onClick={openHelp} className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 hover:underline">{t('needHelp')}</button>
              </>
            ) : (
              <div className="space-y-5 text-sm leading-6 text-gray-600">
                <p id="header-dialog-description">{t('helpIntro')}</p>
                <ol className="list-decimal space-y-3 pl-5">
                  <li>{t.rich('helpGetKey', {
                    volcengine: (chunks) => <a href={APP_LINKS.volcengineConsoleUrl} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline">{chunks}</a>,
                    aliyun: (chunks) => <a href={APP_LINKS.aliyunConsoleUrl} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline">{chunks}</a>,
                  })}</li>
                  <li><button type="button" onClick={showApiSettings} className="font-medium text-indigo-600 hover:underline">{t('helpConfigureKey')}</button></li>
                  <li>{t('helpCreate')}</li>
                </ol>
                <p className="rounded-lg bg-indigo-50 p-3 text-indigo-800">{t('helpPricing')}</p>
                <section aria-labelledby="author-contact-title" className="rounded-lg border border-gray-200 p-4">
                  <h4 id="author-contact-title" className="font-semibold text-gray-800">{t('contactAuthor')}</h4>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{t('contactHint')}</p>
                  <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                    <dt>{t('wechat')}</dt><dd className="font-medium text-gray-800">{AUTHOR_CONTACT.wechat}</dd>
                    <dt>{t('email')}</dt><dd><a href={`mailto:${AUTHOR_CONTACT.email}`} className="break-all font-medium text-indigo-600 hover:underline">{AUTHOR_CONTACT.email}</a></dd>
                    <dt>QQ</dt><dd className="font-medium text-gray-800">{AUTHOR_CONTACT.qq}</dd>
                  </dl>
                </section>
                <div className="border-t border-gray-100 pt-3 text-xs leading-5 text-gray-500">
                  <a href={APP_LINKS.online} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{t('online')}</a>
                  <p>{t('onlineHint')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
