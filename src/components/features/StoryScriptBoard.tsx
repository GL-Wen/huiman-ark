import React from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '../../store';
import {
  generateCharacterAssets,
  isInvalidStoryMetaBlock,
  sanitizeStorySegmentText,
} from '../../api/llm';
import { Users, FastForward, PlaySquare, Pencil, Check, X } from 'lucide-react';
import { getAnimeStylePrompt } from '../../lib/animeStyles';
import { getTextApiConfig } from '../../lib/textProviders.ts';

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
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState('');
  const [draftRaw, setDraftRaw] = React.useState('');
  const t = useTranslations('StoryBoard');
  const {
    generatedScript,
    setGeneratedScript,
    updateScriptSegment,
    setCurrentStep,
    apiKey,
    hasDefaultApiKey,
    openApiSettings,
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
    if ((!apiKey.trim() && !hasDefaultApiKey) || !getTextApiConfig(useAppStore.getState()).hasApiKey) {
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
    if (!apiKey.trim() && !hasDefaultApiKey) {
      openApiSettings();
      return;
    }

    setCharacterDesign(null);
    setCharacterDesignImage(null);
    setCharacterNames([]);
    setPendingComicId('__all__');
    setCurrentStep('generating_comics');
  };

  const handleGenerateSingleComic = (scriptId: string) => {
    if (!apiKey.trim() && !hasDefaultApiKey) {
      openApiSettings();
      return;
    }

    setPendingComicId(scriptId);
    setCurrentStep('generating_comics');
  };

  const handleStartEdit = (script: (typeof generatedScript)[number], fallbackTitle: string) => {
    setEditingId(script.id);
    setDraftTitle(script.title || fallbackTitle);
    setDraftRaw(script.raw);
  };

  const handleSaveEdit = (scriptId: string) => {
    updateScriptSegment(scriptId, {
      title: draftTitle.trim(),
      raw: draftRaw.trim(),
    });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] justify-items-start gap-3 pb-6 content-start">
          {generatedScript.map((script, index) => {
            const isEditing = editingId === script.id;
            const currentTitle = script.title || getDefaultTitle(index + 1);

            return (
              <div
                key={script.id}
                className={`w-full min-w-0 max-w-[300px] bg-white border rounded-md overflow-hidden flex flex-col h-[380px] transition-all ${
                  isEditing
                    ? 'border-indigo-400 ring-2 ring-indigo-100 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center gap-2">
                  {isEditing ? (
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder={t('editTitlePlaceholder')}
                      className="text-xs font-semibold text-gray-800 border border-indigo-200 rounded px-1.5 py-0.5 flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center min-w-0 flex-1">
                      <span className="text-xs font-semibold text-gray-700 truncate" title={currentTitle}>
                        {currentTitle}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(script, getDefaultTitle(index + 1))}
                        disabled={isGeneratingCharacters}
                        className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors ml-1 shrink-0"
                        title={t('edit')}
                        aria-label={t('edit')}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <span className="text-[10px] text-gray-400 font-mono shrink-0">{script.cut}</span>
                </div>

                <div className="p-3 flex-1 overflow-y-auto">
                  {isEditing ? (
                    <textarea
                      value={draftRaw}
                      onChange={(e) => setDraftRaw(e.target.value)}
                      placeholder={t('editContentPlaceholder')}
                      className="w-full h-full p-2 text-[12px] text-gray-700 leading-5 border border-indigo-200 rounded-md bg-indigo-50/20 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  ) : (
                    <div className="text-[13px] text-gray-700 whitespace-pre-wrap leading-6 tracking-[0.01em]">
                      {getSegmentDisplayContent(script.raw)}
                    </div>
                  )}
                </div>

                <div className="px-3 py-2 border-t border-gray-100 flex justify-between items-center">
                  {isEditing ? (
                    <div className="flex justify-end items-center gap-2 w-full">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-2.5 py-1 rounded text-[11px] font-medium text-gray-500 hover:bg-gray-100 transition-colors flex items-center"
                      >
                        <X className="w-3 h-3 mr-1" />
                        {t('cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(script.id)}
                        className="px-2.5 py-1 rounded text-[11px] font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        {t('save')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(script, getDefaultTitle(index + 1))}
                        disabled={isGeneratingCharacters}
                        className="text-[11px] font-medium text-gray-400 hover:text-indigo-600 flex items-center transition-colors"
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        {t('edit')}
                      </button>
                      <button
                        type="button"
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
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
