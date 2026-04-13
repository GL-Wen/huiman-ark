import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink, Settings, X } from 'lucide-react';
import { appConfig } from '@/config/app';
import { useAppStore } from '../../store';
import { Logo } from '../common/Logo';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

export const Header: React.FC = () => {
  const { apiKey, setApiKey, isApiSettingsOpen, openApiSettings, closeApiSettings } = useAppStore();
  const t = useTranslations('Header');

  const [tempKey, setTempKey] = useState(apiKey);

  React.useEffect(() => {
    if (isApiSettingsOpen) {
      setTempKey(apiKey);
    }
  }, [apiKey, isApiSettingsOpen]);

  const handleSave = () => {
    setApiKey(tempKey);
    closeApiSettings();
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Logo className="w-8 h-8" />
          <span className="text-lg font-bold text-gray-800">{t('appName')}</span>
        </div>

        <div className="flex items-center space-x-4">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={openApiSettings}
            className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 flex items-center space-x-2 transition-colors"
            aria-label={t('settings')}
          >
            <Settings className="w-4 h-4" />
            <span>{t('settings')}</span>
          </button>
        </div>
      </header>

      {isApiSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-800">{t('settings')}</h3>
              <button
                type="button"
                onClick={closeApiSettings}
                className="p-1 text-gray-400 hover:text-gray-600"
                aria-label={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('apiKey')}</label>
                <input
                  type="password"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                />
              </div>

              <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">{t('apiKeyHint')}</p>

              <div className="flex items-center justify-end text-sm text-gray-500">
                <span>{t('buyApiKeyHelper')}</span>
                <a
                  href={appConfig.apiKeyPurchaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 inline-flex items-center gap-1 font-medium text-blue-600 transition-colors hover:text-blue-700"
                >
                  <span>{t('buyApiKeyLinkText')}</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeApiSettings}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
