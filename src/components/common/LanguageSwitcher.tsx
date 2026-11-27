'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type AppLocale, usePathname, useRouter } from '@/i18n/routing';

export const LanguageSwitcher: React.FC = () => {
  const t = useTranslations('Header');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const locales: Array<{ value: AppLocale; label: string }> = [
    { value: 'zh', label: t('zh') },
    { value: 'en', label: t('en') },
    { value: 'ja', label: t('ja') },
  ];

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (nextLocale: AppLocale) => {
    setIsOpen(false);
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={isPending}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t('language')}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={t('language')}
        className={`h-9 px-2.5 rounded-md flex items-center gap-1 text-gray-600 transition-colors cursor-pointer disabled:opacity-50 ${
          isOpen ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <Languages className="h-4 w-4" />
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t('language')}
          className="absolute right-0 mt-1.5 w-32 rounded-xl border border-gray-200/90 bg-white p-1 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.12),0_4px_10px_-4px_rgba(15,23,42,0.06)] z-50"
        >
          {locales.map((item) => {
            const isSelected = item.value === locale;
            return (
              <button
                key={item.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(item.value)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{item.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
