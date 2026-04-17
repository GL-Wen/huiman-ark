/*
 * @Author: wenguoliang
 * @Date: 2026-03-29 16:38:15
 * @FilePath: /huiman-ark/src/components/features/StoryScriptBoard.tsx
 * @Description: Do not edit
 */
import React from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '../../store';
import {
  generateCharacterAssets,
  generateCharacterPortraits,
  isInvalidStoryMetaBlock,
  parseCharacterProfiles,
  sanitizeCharacterDesignText,
  sanitizeStorySegmentText,
} from '../../api/llm';
import { Clapperboard, Users, FastForward, PlaySquare } from 'lucide-react';
import { getAnimeStylePrompt } from '../../lib/animeStyles';

const getSegmentDisplayContent = (raw: string) => sanitizeStorySegmentText(raw);
const normalizeSegments = <T extends { title: string; raw: string }>(
  segments: T[],
  getDefaultTitle: (index: number) => string,
) =>
  segments.map((segment, index) => ({
    ...segment,
    id: `cut-${index + 1}`,
    title: segment.title || getDefaultTitle(index + 1),
    cut: `Cut ${index + 1}`,
  }));

export const StoryScriptBoard: React.FC = () => {
  const [isGeneratingCharacters, setIsGeneratingCharacters] = React.useState(false);
  const t = useTranslations('StoryBoard');
  const {
    generatedScript,
    setGeneratedScript,
    setCurrentStep,
    apiKey,
    openApiSettings,
    model,
    ratio,
    language,
    animeStyle,
    customAnimeStyle,
    style,
    storyInput,
    referenceImages,
    setCharacterDesign,
    setCharacterDesignImage,
    setCharacterNames,
    setCharacterPortraits,
    clearCharacterPortraits,
    setPortraitGenerating,
    setPendingComicId,
  } = useAppStore();
  const getDefaultTitle = React.useCallback((index: number) => t('defaultSegmentTitle', { index }), [t]);

  React.useEffect(() => {
    const validSegments = generatedScript.filter((segment) => !isInvalidStoryMetaBlock(segment.raw));
    if (validSegments.length !== generatedScript.length) {
      setGeneratedScript(normalizeSegments(validSegments, getDefaultTitle));
    }
  }, [generatedScript, getDefaultTitle, setGeneratedScript]);

  const handleGenerateCharacters = async () => {
    if (!apiKey) {
      openApiSettings();
      return;
    }

    setIsGeneratingCharacters(true);
    setCurrentStep('generating_characters');
    clearCharacterPortraits();

    try {
      const selectedAnimeStyle = getAnimeStylePrompt(animeStyle, customAnimeStyle);
      const { characterText, characterNames, characterImage } = await generateCharacterAssets({
        apiKey,
        model,
        storyInput,
        generatedScript,
        language,
        aspectRatio: ratio,
        animeStyle: selectedAnimeStyle,
        style,
        referenceImages,
      });

      setCharacterDesign(characterText);
      setCharacterDesignImage(characterImage);
      setCharacterNames(characterNames);
      setPendingComicId(null);

      const profiles = parseCharacterProfiles(sanitizeCharacterDesignText(characterText));
      if (profiles.length > 0) {
        const targetProfiles = profiles.map((profile, i) => ({ profile, originalIndex: i }));
        for (const { profile, originalIndex } of targetProfiles) {
          setPortraitGenerating(`${profile.name}#${originalIndex}`, true);
        }
        try {
          const { portraits } = await generateCharacterPortraits(apiKey, {
            characterText,
            language,
            animeStyle: selectedAnimeStyle,
            style,
            sheetImage: characterImage,
            referenceImages,
            targetProfiles,
          });
          setCharacterPortraits(portraits);
        } finally {
          for (const { profile, originalIndex } of targetProfiles) {
            setPortraitGenerating(`${profile.name}#${originalIndex}`, false);
          }
        }
      }

      setCurrentStep('characters_done');
    } catch (error) {
      alert(error instanceof Error ? error.message : t('alerts.generateCharactersFailed'));
      setCurrentStep('story_done');
    } finally {
      setIsGeneratingCharacters(false);
    }
  };

  const handleSkipToComics = () => {
    setCharacterDesign(null);
    setCharacterDesignImage(null);
    setCharacterNames([]);
    clearCharacterPortraits();
    setPendingComicId('__all__');
    setCurrentStep('generating_comics');
  };

  const handleGenerateSingleComic = (scriptId: string) => {
    setPendingComicId(scriptId);
    setCurrentStep('generating_comics');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-6">
      <div className="bg-[#fff9e6] rounded-xl p-5 mb-6 border border-[#ffeeb5] shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 flex items-center mb-2">
          <Clapperboard className="w-5 h-5 text-purple-600 mr-2" />
          {t('title')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">{t('subtitle', { count: generatedScript.length })}</p>

        <div className="flex items-center space-x-4 flex-wrap gap-y-3">
          <button
            onClick={handleGenerateCharacters}
            disabled={isGeneratingCharacters}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium flex items-center transition-colors ${
              isGeneratingCharacters
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#2c2c3e] text-white hover:bg-black'
            }`}
          >
            <Users className="w-4 h-4 mr-2 text-purple-400" />
            {isGeneratingCharacters ? t('generatingCharacters') : t('generateCharacters')}
          </button>

          <button
            onClick={handleSkipToComics}
            disabled={isGeneratingCharacters}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium flex items-center transition-colors ${
              isGeneratingCharacters
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#4e5969] text-white hover:bg-gray-700'
            }`}
          >
            <FastForward className="w-4 h-4 mr-2" />
            {t('skipToComics')}
          </button>
        </div>

        <p className="text-xs text-yellow-600 mt-3 flex items-center">
          <span className="mr-1">💡</span> {t('helper')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-8">
        {generatedScript.map((script, index) => (
          <div
            key={script.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm h-[400px]"
          >
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-700">
                {script.title || getDefaultTitle(index + 1)}
              </span>
              <span className="text-xs text-gray-400 font-medium">{script.cut}</span>
            </div>

            <div className="p-4 flex-1 overflow-y-auto min-h-[250px] max-h-[400px]">
              <div className="text-[14px] text-slate-700 whitespace-pre-wrap leading-7 tracking-[0.01em] pb-4 font-medium">
                {getSegmentDisplayContent(script.raw)}
              </div>
            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => handleGenerateSingleComic(script.id)}
                disabled={isGeneratingCharacters}
                className={`px-4 py-1.5 rounded-md text-xs font-medium flex items-center transition-colors ${
                  isGeneratingCharacters
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                <PlaySquare className="w-3 h-3 mr-1.5 text-green-400" />
                {t('generateCurrentPage')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
