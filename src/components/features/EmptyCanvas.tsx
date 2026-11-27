import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, Eye, KeyRound } from 'lucide-react';
import { loadBuiltinShowcase } from '../../lib/showcase';
import { useAppStore } from '../../store';

export const EmptyCanvas: React.FC = () => {
  const t = useTranslations('EmptyCanvas');
  const openApiSettings = useAppStore((s) => s.openApiSettings);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  const steps = [
    { num: '01', title: t('step1Title'), desc: t('step1Desc') },
    { num: '02', title: t('step2Title'), desc: t('step2Desc') },
    { num: '03', title: t('step3Title'), desc: t('step3Desc') },
    { num: '04', title: t('step4Title'), desc: t('step4Desc') },
  ];

  const handleLoadShowcase = async () => {
    setIsLoadingDemo(true);
    try {
      await loadBuiltinShowcase();
    } finally {
      setIsLoadingDemo(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-white px-8">
      <BookOpen className="w-8 h-8 text-indigo-500 mb-4" strokeWidth={1.5} />
      <h2 className="text-base font-semibold text-gray-800 mb-1.5 text-center">
        {t('welcomePrefix')}
        <span className="text-indigo-600 mx-0.5">{t('brand')}</span>
        {t('welcomeSuffix')}
      </h2>
      <p className="text-xs text-gray-500 text-center max-w-sm leading-5">{t('description')}</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleLoadShowcase}
          disabled={isLoadingDemo}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{isLoadingDemo ? t('loadingShowcase') : t('loadShowcase')}</span>
        </button>
        <button
          type="button"
          onClick={openApiSettings}
          className="px-4 py-2 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-gray-700 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
          <span>{t('configureApiKey')}</span>
        </button>
      </div>
      <p className="mt-2.5 text-[11px] text-gray-400 text-center">{t('apiKeyHint')}</p>

      <div className="mt-10 grid grid-cols-2 xl:grid-cols-4 gap-5 w-full max-w-xl">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col min-w-0">
            <span className="text-[10px] font-mono text-gray-300 mb-1.5">{step.num}</span>
            <p className="text-xs font-medium text-gray-700 mb-0.5">{step.title}</p>
            <p className="text-[11px] text-gray-400 leading-4">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
