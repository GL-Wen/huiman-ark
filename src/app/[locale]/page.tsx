'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { EmptyCanvas } from '@/components/features/EmptyCanvas';
import { StoryScriptBoard } from '@/components/features/StoryScriptBoard';
import { CharacterBoard } from '@/components/features/CharacterBoard';
import { useSessionPersistence } from '@/lib/sessionPersistence';
import { useAppStore } from '@/store';

const ensureMeta = (selector: string, attr: 'name' | 'property', value: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, selector.match(/"(.*)"/)?.[1] || '');
    document.head.appendChild(element);
  }
  element.setAttribute('content', value);
};

const getQuotedSummary = (locale: string, summary: string) => {
  if (!summary) {
    return '';
  }

  const truncatedSummary = summary.slice(0, 30);

  if (locale === 'en') {
    return `"${truncatedSummary}"`;
  }

  return `「${truncatedSummary}」`;
};

const getSegmentCountText = (locale: string, count: number) => {
  if (!count) {
    return '';
  }

  if (locale === 'en') {
    return `, ${count} pages in total`;
  }

  if (locale === 'ja') {
    return `、全${count}ページ`;
  }

  return `，共 ${count} 页`;
};

export default function App() {
  useSessionPersistence();
  const { currentStep, generatedScript, storyInput } = useAppStore();
  const locale = useLocale();
  const tSeo = useTranslations('SeoMap');
  const tPage = useTranslations('Page');

  const currentSeo = React.useMemo(() => {
    const storySummary = storyInput.trim();
    const segmentCount = generatedScript.length;

    return {
      initial: {
        title: tSeo('initial.title'),
        description: tSeo('initial.description'),
      },
      generating_story: {
        title: tSeo('generating_story.title'),
        description: tSeo('generating_story.description'),
      },
      story_done: {
        title: tSeo('story_done.title'),
        description: tSeo('story_done.description', { segmentCount }),
      },
      generating_characters: {
        title: tSeo('generating_characters.title'),
        description: tSeo('generating_characters.description'),
      },
      characters_done: {
        title: tSeo('characters_done.title'),
        description: tSeo('characters_done.description', { segmentCount }),
      },
      generating_comics: {
        title: tSeo('generating_comics.title'),
        description: tSeo('generating_comics.description', {
          storySummary: getQuotedSummary(locale, storySummary),
        }),
      },
      done: {
        title: tSeo('done.title'),
        description: tSeo('done.description', { segmentCountText: getSegmentCountText(locale, segmentCount) }),
      },
    } as const;
  }, [generatedScript.length, locale, storyInput, tSeo])[currentStep];

  React.useEffect(() => {
    document.title = currentSeo.title;

    ensureMeta('meta[name="description"]', 'name', currentSeo.description);
    ensureMeta('meta[property="og:title"]', 'property', currentSeo.title);
    ensureMeta('meta[property="og:description"]', 'property', currentSeo.description);
    ensureMeta('meta[name="twitter:title"]', 'name', currentSeo.title);
    ensureMeta('meta[name="twitter:description"]', 'name', currentSeo.description);
  }, [currentSeo]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-hidden bg-[#f8f9fa] relative" aria-labelledby="app-page-title">
          <h1 id="app-page-title" className="sr-only">
            {tPage('sr_title')}
          </h1>
          <p className="sr-only">{tPage('sr_description')}</p>
          {currentStep === 'initial' && <EmptyCanvas />}

          {currentStep === 'generating_story' && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4"></div>
              <p className="text-gray-800 font-medium">{tPage('stage1')}</p>
            </div>
          )}

          {(currentStep === 'story_done' || currentStep === 'generating_characters') && <StoryScriptBoard />}

          {currentStep === 'generating_characters' && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-400 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-800 font-medium flex items-center">
                <span className="text-pink-400 mr-2">🌸</span>
                {tPage('generating_characters')}
              </p>
            </div>
          )}

          {(currentStep === 'characters_done' || currentStep === 'generating_comics' || currentStep === 'done') && (
            <CharacterBoard />
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}
