/*
 * @Author: wenguoliang
 * @Date: 2026-03-29 16:26:51
 * @FilePath: /huiman-ark/src/components/features/StoryInput.tsx
 * @Description: Do not edit
 */
import React from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '../../store';
import { Sparkles } from 'lucide-react';

export const StoryInput: React.FC = () => {
  const { storyInput, setStoryInput } = useAppStore();
  const t = useTranslations('LegacyPanels.storyInput');

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-lg font-medium text-gray-800 flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-blue-500" />
          {t('title')}
        </h2>
        <p className="text-sm text-gray-500 mt-1">{t('description')}</p>
      </div>

      <div className="flex-1 p-4">
        <textarea
          value={storyInput}
          onChange={(e) => setStoryInput(e.target.value)}
          placeholder={t('placeholder')}
          className="w-full h-full p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
        <div className="text-xs text-gray-500">{t('hint')}</div>
      </div>
    </div>
  );
};
