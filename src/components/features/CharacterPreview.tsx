/*
 * @Author: wenguoliang
 * @Date: 2026-03-29 16:27:11
 * @FilePath: /huiman-ark/src/components/features/CharacterPreview.tsx
 * @Description: Do not edit
 */
import React from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '../../store';
import { Image as ImageIcon } from 'lucide-react';

export const CharacterPreview: React.FC = () => {
  const { characterDesign, characterDesignImage, characterNames } = useAppStore();
  const t = useTranslations('LegacyPanels.characterPreview');

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-800 flex items-center">
            <ImageIcon className="w-5 h-5 mr-2 text-purple-500" />
            {t('title')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{t('description')}</p>
        </div>
        <div className="text-xs text-gray-500">
          {characterNames.length ? t('characterCount', { count: characterNames.length }) : t('noCharacters')}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {characterDesignImage && (
          <div className="mb-4 border border-gray-100 rounded-lg overflow-hidden">
            <img src={characterDesignImage} alt={t('imageAlt')} className="w-full h-auto object-contain bg-gray-50" />
          </div>
        )}
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100">
            {characterDesign || t('empty')}
          </pre>
        </div>
      </div>
    </div>
  );
};
