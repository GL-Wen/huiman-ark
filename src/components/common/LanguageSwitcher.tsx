/*
 * @Author: wenguoliang
 * @Date: 2026-04-05 13:21:21
 * @FilePath: /huiman-ark/src/components/common/LanguageSwitcher.tsx
 * @Description: Do not edit
 */
'use client';

import React from 'react';
import { ChevronDown, Languages } from 'lucide-react';
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
    <div className="relative">
      <label htmlFor="language-select" className="sr-only">
        {t('language')}
      </label>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-600">
        <Languages className="h-4 w-4" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
        <ChevronDown className="h-4 w-4" />
      </div>
      <select
        id="language-select"
        value={locale}
        onChange={handleLanguageChange}
        disabled={isPending}
        className="h-9 w-11 appearance-none rounded-md bg-gray-50 text-transparent hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors"
        aria-label={t('language')}
        title={t('language')}
      >
        <option value="zh">{t('zh')}</option>
        <option value="en">{t('en')}</option>
        <option value="ja">{t('ja')}</option>
      </select>
    </div>
  );
};
