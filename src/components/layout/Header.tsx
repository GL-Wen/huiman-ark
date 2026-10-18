import React, { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleHelp, Github, KeyRound, X } from 'lucide-react';
import { APP_LINKS, AUTHOR_CONTACT } from '@/config/app';
import { useAppStore } from '../../store';
import { Logo } from '../common/Logo';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

export const Header: React.FC = () => {
  const {
    apiKey, setApiKey, apiBaseUrl, setApiBaseUrl, textModel, setTextModel, imageModel, setImageModel,
    defaultApiBaseUrl, defaultTextModel, defaultImageModel, hasDefaultApiKey, setAiDefaults,
    resetApiOverrides, isApiSettingsOpen, openApiSettings, closeApiSettings,
  } = useAppStore();
  const t = useTranslations('Header');
  const [draftKey, setDraftKey] = useState('');
  const [draftBaseUrl, setDraftBaseUrl] = useState('');
  const [draftTextModel, setDraftTextModel] = useState('');
  const [draftImageModel, setDraftImageModel] = useState('');
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);
  const [defaultsFailed, setDefaultsFailed] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const activeDialog = isApiSettingsOpen ? 'api' : isHelpOpen ? 'help' : null;

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
    setIsHelpOpen(false);
  }, [apiKey, apiBaseUrl, textModel, imageModel, isApiSettingsOpen]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!activeDialog || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const helpButton = helpButtonRef.current;
    const getFocusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])'));
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
    setApiKey(draftKey.trim());
    setApiBaseUrl(draftBaseUrl.trim());
    setTextModel(draftTextModel.trim());
    setImageModel(draftImageModel.trim());
    setDraftKey('');
    closeApiSettings();
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
            <span>{apiKey.trim() || hasDefaultApiKey ? t('apiConfigured') : t('apiSettings')}</span>
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
                  <div>
                    <label htmlFor="api-base-url" className="mb-2 block text-sm font-medium text-gray-700">{t('apiBaseUrl')}</label>
                    <input
                      id="api-base-url"
                      type="url"
                      value={draftBaseUrl}
                      onChange={(event) => setDraftBaseUrl(event.target.value)}
                      placeholder={defaultApiBaseUrl}
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <p className="mt-1 break-all text-xs text-gray-400">{t('defaultValue', { value: defaultApiBaseUrl })}</p>
                  </div>
                  <div>
                    <label htmlFor="text-model" className="mb-2 block text-sm font-medium text-gray-700">{t('textModel')}</label>
                    <input
                      id="text-model"
                      value={draftTextModel}
                      onChange={(event) => setDraftTextModel(event.target.value)}
                      placeholder={defaultTextModel}
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <p className="mt-1 text-xs text-gray-400">{t('defaultValue', { value: defaultTextModel })}</p>
                  </div>
                  <div>
                    <label htmlFor="image-model" className="mb-2 block text-sm font-medium text-gray-700">{t('imageModel')}</label>
                    <input
                      id="image-model"
                      value={draftImageModel}
                      onChange={(event) => setDraftImageModel(event.target.value)}
                      placeholder={defaultImageModel}
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <p className="mt-1 text-xs text-gray-400">{t('defaultValue', { value: defaultImageModel })}</p>
                  </div>
                  <div>
                    <label htmlFor="api-key" className="mb-2 block text-sm font-medium text-gray-700">API Key</label>
                    <input
                      id="api-key"
                      type="password"
                      value={draftKey}
                      onChange={(event) => setDraftKey(event.target.value)}
                      placeholder={t('apiKeyPlaceholder')}
                      autoComplete="off"
                      data-dialog-autofocus
                      spellCheck={false}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                  <p className="text-xs leading-5 text-gray-500" role="status">
                    {isLoadingDefaults ? t('loadingDefaults') : defaultsFailed ? t('defaultsFailed') : hasDefaultApiKey ? t('defaultKeyAvailable') : t('defaultKeyMissing')}
                  </p>
                  <p className="text-xs leading-5 text-amber-700">{t('providerKeyHint')}</p>
                  <p className="rounded-lg bg-indigo-50 p-3 text-xs leading-5 text-indigo-800">{t('apiKeyPrivacy')}</p>
                  <div className="flex gap-3">
                    {(apiKey || apiBaseUrl || textModel || imageModel) && (
                      <button
                        type="button"
                        onClick={() => {
                          resetApiOverrides();
                          setDraftKey('');
                          setDraftBaseUrl('');
                          setDraftTextModel('');
                          setDraftImageModel('');
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
                    register: (chunks) => <a href={APP_LINKS.apiRegistrationUrl} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline">{chunks}</a>,
                    tokens: (chunks) => <a href={APP_LINKS.apiTokensUrl} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline">{chunks}</a>,
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
                  <a href={APP_LINKS.online} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{t('onlineLegacy')}</a>
                  <p>{t('onlineLegacyHint')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
