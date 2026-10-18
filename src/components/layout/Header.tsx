import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Github, KeyRound, X } from 'lucide-react';
import { useAppStore } from '../../store';
import { Logo } from '../common/Logo';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

export const Header: React.FC = () => {
  const { apiKey, setApiKey, isApiSettingsOpen, openApiSettings, closeApiSettings } = useAppStore();
  const t = useTranslations('Header');
  const [draftKey, setDraftKey] = useState('');

  React.useEffect(() => {
    if (!isApiSettingsOpen) return;
    setDraftKey(apiKey);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeApiSettings();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [apiKey, closeApiSettings, isApiSettingsOpen]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draftKey.trim()) return;
    setApiKey(draftKey.trim());
    setDraftKey('');
    closeApiSettings();
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Logo className="w-8 h-8" />
          <span className="text-lg font-bold text-gray-800">{t('appName')}</span>
          <span className="hidden rounded-md bg-indigo-50 px-2 py-1 text-xs text-indigo-600 sm:inline">{t('freeSoftware')}</span>
        </div>

        <div className="flex items-center space-x-3">
          <LanguageSwitcher />
          <a
            href="https://github.com/GL-Wen/huiman-ark"
            target="_blank"
            rel="noreferrer"
            className="h-9 w-9 text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 flex items-center justify-center transition-colors"
            aria-label={t('github')}
            title={t('github')}
          >
            <Github className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={openApiSettings}
            className="h-9 px-3 text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 flex items-center gap-1.5 transition-colors text-sm"
            aria-label={t('apiSettings')}
            title={t('apiSettings')}
          >
            <KeyRound className="w-4 h-4" />
            <span>{apiKey ? t('apiConfigured') : t('apiSettings')}</span>
          </button>
        </div>
      </header>

      {isApiSettingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeApiSettings();
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="api-settings-title"
            aria-describedby="api-settings-description"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 id="api-settings-title" className="text-lg font-bold text-gray-800">{t('apiSettings')}</h3>
              <button type="button" onClick={closeApiSettings} className="p-1 text-gray-400 hover:text-gray-600" aria-label={t('close')}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p id="api-settings-description" className="mb-4 text-sm leading-6 text-gray-600">{t('apiDescription')}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="api-key" className="mb-2 block text-sm font-medium text-gray-700">API Key</label>
                <input
                  id="api-key"
                  type="password"
                  value={draftKey}
                  onChange={(event) => setDraftKey(event.target.value)}
                  placeholder={t('apiKeyPlaceholder')}
                  autoComplete="off"
                  autoFocus
                  spellCheck={false}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
              <p className="rounded-lg bg-indigo-50 p-3 text-xs leading-5 text-indigo-800">{t('apiKeyPrivacy')}</p>
              <div className="flex gap-3">
                {apiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setApiKey('');
                      setDraftKey('');
                      closeApiSettings();
                    }}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    {t('clearApiKey')}
                  </button>
                )}
                <button type="submit" disabled={!draftKey.trim()} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300">
                  {t('saveApiKey')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
