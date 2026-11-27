'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore, Step } from '@/store';
import { Check, Sparkles, FileText, Users, Image as ImageIcon } from 'lucide-react';

export const Stepper: React.FC = () => {
  const t = useTranslations('Stepper');
  const { currentStep, setCurrentStep, generatedScript, characterDesign, characterDesignImage, setSidebarCollapsed } = useAppStore();

  const steps = [
    {
      id: 'story',
      title: t('stepStory'),
      icon: Sparkles,
      stepKey: 'initial' as Step,
      isCompleted: generatedScript.length > 0 || currentStep !== 'initial',
      isActive: currentStep === 'initial' || currentStep === 'generating_story',
      isClickable: currentStep !== 'generating_story' && currentStep !== 'generating_characters' && currentStep !== 'generating_comics',
      onClick: () => {
        if (currentStep !== 'generating_story' && currentStep !== 'generating_characters' && currentStep !== 'generating_comics') {
          setSidebarCollapsed(false);
          if (!generatedScript.length) {
            setCurrentStep('initial');
          }
        }
      },
    },
    {
      id: 'script',
      title: t('stepScript'),
      icon: FileText,
      stepKey: 'story_done' as Step,
      isCompleted:
        currentStep === 'characters_done' ||
        currentStep === 'generating_comics' ||
        currentStep === 'done',
      isActive: currentStep === 'story_done' || currentStep === 'generating_characters',
      isClickable: generatedScript.length > 0 && currentStep !== 'generating_characters' && currentStep !== 'generating_comics',
      onClick: () => {
        if (generatedScript.length > 0 && currentStep !== 'generating_characters' && currentStep !== 'generating_comics') {
          setCurrentStep('story_done');
        }
      },
    },
    {
      id: 'characters',
      title: t('stepCharacters'),
      icon: Users,
      stepKey: 'characters_done' as Step,
      isCompleted:
        Boolean(characterDesign || characterDesignImage) &&
        (currentStep === 'characters_done' || currentStep === 'generating_comics' || currentStep === 'done'),
      isActive: currentStep === 'generating_characters',
      isClickable:
        Boolean(characterDesign || characterDesignImage) &&
        currentStep !== 'generating_characters' &&
        currentStep !== 'generating_comics',
      onClick: () => {
        if (characterDesign || characterDesignImage) {
          setCurrentStep('characters_done');
        }
      },
    },
    {
      id: 'comics',
      title: t('stepComics'),
      icon: ImageIcon,
      stepKey: 'done' as Step,
      isCompleted: currentStep === 'done',
      isActive: currentStep === 'characters_done' || currentStep === 'generating_comics' || currentStep === 'done',
      isClickable:
        (currentStep === 'characters_done' || currentStep === 'done') &&
        generatedScript.length > 0,
      onClick: () => {
        if (generatedScript.length > 0) {
          setCurrentStep('characters_done');
        }
      },
    },
  ];

  return (
    <nav aria-label="Progress" className="w-full bg-white border-b border-gray-100 py-2 px-4 select-none shrink-0">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={step.onClick}
                disabled={!step.isClickable}
                className={`flex items-center gap-1.5 text-xs font-medium transition-all group ${
                  step.isActive
                    ? 'text-indigo-600 font-semibold'
                    : step.isCompleted
                      ? 'text-gray-700 hover:text-indigo-600 cursor-pointer'
                      : 'text-gray-400 cursor-default'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-colors ${
                    step.isActive
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-100'
                      : step.isCompleted
                        ? 'bg-emerald-500 text-white group-hover:bg-indigo-600'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}
                >
                  {step.isCompleted && !step.isActive ? (
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  ) : (
                    <Icon className="w-2.5 h-2.5" />
                  )}
                </div>
                <span className="hidden sm:inline">{step.title}</span>
              </button>

              {!isLast && (
                <div
                  className={`flex-1 mx-2 sm:mx-3 h-0.5 rounded transition-colors ${
                    step.isCompleted ? 'bg-emerald-200' : 'bg-gray-100'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};
