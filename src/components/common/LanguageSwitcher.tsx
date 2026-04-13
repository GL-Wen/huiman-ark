/*
 * @Author: wenguoliang
 * @Date: 2026-04-05 13:21:21
 * @FilePath: /huiman-ark/src/components/common/LanguageSwitcher.tsx
 * @Description: Do not edit
 */
'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { type AppLocale } from '@/i18n/routing';
import { useRouter, usePathname } from '@/i18n/routing';

export const LanguageSwitcher: React.FC = () => {
  const t = useTranslations('Header');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = e.target.value as AppLocale;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="language-select" className="sr-only">
        {t('language')}
      </label>
      <select
        id="language-select"
        value={locale}
        onChange={handleLanguageChange}
        disabled={isPending}
        className="px-2 py-1 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors"
        aria-label={t('language')}
      >
        <option value="zh">{t('zh')}</option>
        <option value="en">{t('en')}</option>
        <option value="ja">{t('ja')}</option>
      </select>
    </div>
  );
};
