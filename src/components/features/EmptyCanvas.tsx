import React from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen } from 'lucide-react';

export const EmptyCanvas: React.FC = () => {
  const t = useTranslations('EmptyCanvas');

  const steps = [
    { num: '01', title: t('step1Title'), desc: t('step1Desc') },
    { num: '02', title: t('step2Title'), desc: t('step2Desc') },
    { num: '03', title: t('step3Title'), desc: t('step3Desc') },
    { num: '04', title: t('step4Title'), desc: t('step4Desc') },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-white px-8">
      <BookOpen className="w-8 h-8 text-gray-200 mb-5" strokeWidth={1.5} />
      <h2 className="text-sm font-semibold text-gray-700 mb-1 text-center">
        {t('welcomePrefix')}
        <span className="text-indigo-600 mx-0.5">{t('brand')}</span>
        {t('welcomeSuffix')}
      </h2>
      <p className="text-xs text-gray-400 text-center max-w-xs leading-5">{t('description')}</p>

      <div className="mt-10 flex gap-10">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col w-28">
            <span className="text-[10px] font-mono text-gray-300 mb-1.5">{step.num}</span>
            <p className="text-xs font-medium text-gray-700 mb-0.5">{step.title}</p>
            <p className="text-[11px] text-gray-400 leading-4">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
