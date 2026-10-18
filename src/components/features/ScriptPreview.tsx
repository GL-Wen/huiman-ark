/*
 * @Author: wenguoliang
 * @Date: 2026-03-29 16:26:55
 * @FilePath: /huiman-ark/src/components/features/ScriptPreview.tsx
 * @Description: Do not edit
 */
import React from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '../../store';
import { FileText } from 'lucide-react';

export const ScriptPreview: React.FC = () => {
  const { generatedScript } = useAppStore();
  const t = useTranslations('LegacyPanels.scriptPreview');
  const content = generatedScript.map((segment) => segment.raw).join('\n\n<scene>\n\n');

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-800 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-green-500" />
            {t('title')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{t('description')}</p>
        </div>
        <div className="text-xs text-gray-500">{t('segmentCount', { count: generatedScript.length })}</div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100">
            {content || t('empty')}
          </pre>
        </div>
      </div>
    </div>
  );
};
