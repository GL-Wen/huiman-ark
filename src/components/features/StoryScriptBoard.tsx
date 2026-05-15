import React from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '../../store';
import {
  generateCharacterAssets,
  isInvalidStoryMetaBlock,
  sanitizeStorySegmentText,
} from '../../api/llm';
import { Users, FastForward, PlaySquare } from 'lucide-react';
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
    setCharacterDesignImage(null);

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
    setPendingComicId('__all__');
    setCurrentStep('generating_comics');
  };

  const handleGenerateSingleComic = (scriptId: string) => {
    setPendingComicId(scriptId);
    setCurrentStep('generating_comics');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="shrink-0 border-b border-gray-100 px-5 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-gray-800">{t('title')}</span>
          <span className="ml-2 text-xs text-gray-400">{t('subtitle', { count: generatedScript.length })}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSkipToComics}
            disabled={isGeneratingCharacters}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center transition-colors ${
              isGeneratingCharacters
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <FastForward className="w-3.5 h-3.5 mr-1.5" />
            {t('skipToComics')}
          </button>
          <button
            onClick={handleGenerateCharacters}
            disabled={isGeneratingCharacters}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center transition-colors ${
              isGeneratingCharacters
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <Users className="w-3.5 h-3.5 mr-1.5" />
            {isGeneratingCharacters ? t('generatingCharacters') : t('generateCharacters')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 bg-gray-50/40">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-6 content-start">
          {generatedScript.map((script, index) => (
            <div
              key={script.id}
              className="bg-white border border-gray-200 rounded-md overflow-hidden flex flex-col h-[380px]"
            >
              <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-700">
                  {script.title || getDefaultTitle(index + 1)}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">{script.cut}</span>
              </div>

              <div className="p-3 flex-1 overflow-y-auto">
                <div className="text-[13px] text-gray-700 whitespace-pre-wrap leading-6 tracking-[0.01em]">
                  {getSegmentDisplayContent(script.raw)}
                </div>
              </div>

              <div className="px-3 py-2 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => handleGenerateSingleComic(script.id)}
                  disabled={isGeneratingCharacters}
                  className={`px-3 py-1 rounded text-[11px] font-medium flex items-center transition-colors ${
                    isGeneratingCharacters
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  <PlaySquare className="w-3 h-3 mr-1" />
                  {t('generateCurrentPage')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
