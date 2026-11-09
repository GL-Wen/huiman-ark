import React from 'react';
import { useTranslations } from 'next-intl';
import { APP_LINKS, AUTHOR_CONTACT } from '@/config/app';
import { Logo } from '../common/Logo';

export const Footer: React.FC = () => {
  const t = useTranslations('Header');
  const tFooter = useTranslations('Footer');

  return (
    <footer className="border-t border-gray-100 bg-white py-6">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 sm:flex-row">
        <div className="flex items-center gap-3 text-left">
          <Logo className="h-8 w-8" />
          <div>
            <p className="text-sm font-semibold text-gray-800">{t('appName')}</p>
            <p className="text-xs text-gray-400">{tFooter('subtitle')}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm text-gray-500">
          <p className="font-medium text-gray-700">{t('contactAuthor')}</p>
          <p>{t('wechat')}: {AUTHOR_CONTACT.wechat} · QQ: {AUTHOR_CONTACT.qq}</p>
          <a href={`mailto:${AUTHOR_CONTACT.email}`} className="block break-all hover:text-gray-800">{AUTHOR_CONTACT.email}</a>
        </div>
        <div className="flex flex-col gap-2 text-sm text-gray-500">
          <a href={APP_LINKS.online} target="_blank" rel="noreferrer" className="hover:text-gray-800">{t('online')}</a>
          <a href={APP_LINKS.apiPortal} target="_blank" rel="noreferrer" className="hover:text-gray-800">{tFooter('apiPortal')}</a>
          <a href={APP_LINKS.github} target="_blank" rel="noreferrer" className="hover:text-gray-800">GitHub</a>
        </div>
      </div>
    </footer>
  );
};
