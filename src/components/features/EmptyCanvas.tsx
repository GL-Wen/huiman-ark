/*
 * @Author: wenguoliang
 * @Date: 2026-03-29 16:37:49
 * @FilePath: /huiman-ark/src/components/features/EmptyCanvas.tsx
 * @Description: Do not edit
 */
import React from 'react';
import { useTranslations } from 'next-intl';

export const EmptyCanvas: React.FC = () => {
  const t = useTranslations('EmptyCanvas');

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-white">
      <div className="relative mb-8 w-32 h-32 flex items-center justify-center">
        <svg className="w-24 h-24 text-[#F4C84E] absolute z-10" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
        {/* 右上角副星星 (粉橘色) */}
        <svg
          className="w-12 h-12 text-[#F4A88A] absolute -top-2 right-2 z-0 opacity-90 transform rotate-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" strokeLinejoin="round" />
        </svg>
        <svg className="w-6 h-6 text-[#F4C84E] absolute bottom-4 left-2 z-20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4L13.5 10.5L20 12L13.5 13.5L12 20L10.5 13.5L4 12L10.5 10.5L12 4Z" />
        </svg>
        <svg className="w-4 h-4 text-[#F4A88A] absolute top-2 right-0 z-20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4L13.5 10.5L20 12L13.5 13.5L12 20L10.5 13.5L4 12L10.5 10.5L12 4Z" />
        </svg>
      </div>

      <h2 className="text-[#4A5568] text-xl font-medium mb-3 tracking-wide">
        {t('welcomePrefix')}
        <span className="font-bold text-black mx-1">{t('brand')}</span>
        {t('welcomeSuffix')}
      </h2>
      <p className="text-[#718096] text-sm tracking-wide">{t('description')}</p>
    </div>
  );
};
