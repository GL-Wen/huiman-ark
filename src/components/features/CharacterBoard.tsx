import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore, ScriptSegment } from '../../store';
import { Users, Download, PlaySquare, ImagePlus } from 'lucide-react';
import {
  buildComicPagePrompt,
  buildComicReferenceInstruction,
  buildComicReferenceLabels,
  generateCharacterAssets,
  generateImage,
  parseCharacterProfiles,
  sanitizeCharacterDesignText,
} from '../../api/llm';
import { getAnimeStylePrompt } from '../../lib/animeStyles';

const downloadImage = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const getSegmentDisplayContent = (raw: string) => raw.replace(/^\s*\[[^\]]+\]\s*\n?/, '').trim();

export const CharacterBoard: React.FC = () => {
  const t = useTranslations('CharacterBoard');
  const {
    apiKey,
    openApiSettings,
    currentStep,
    setCurrentStep,
    generatedScript,
    model,
    characterDesign,
    setCharacterDesign,
    characterDesignImage,
    setCharacterDesignImage,
    characterNames,
    setCharacterNames,
    generatedComics,
    setGeneratedComic,
    pendingComicId,
    setPendingComicId,
    storyInput,
    language,
    ratio,
    animeStyle,
    customAnimeStyle,
    style,
    referenceImages,
  } = useAppStore();
  const [generatingCuts, setGeneratingCuts] = useState<Record<string, boolean>>({});
  const [generationErrors, setGenerationErrors] = useState<Record<string, string>>({});
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isRegeneratingCharacterDesign, setIsRegeneratingCharacterDesign] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const autoRunRef = useRef<string | null>(null);
  const displayCharacterDesign = useMemo(
    () => (characterDesign ? sanitizeCharacterDesignText(characterDesign) : ''),
    [characterDesign],
  );
  const characterProfiles = useMemo(() => parseCharacterProfiles(displayCharacterDesign), [displayCharacterDesign]);

  const completedCount = useMemo(
    () => generatedScript.filter((script) => Boolean(generatedComics[script.id])).length,
    [generatedComics, generatedScript],
  );
  const isAllCompleted = generatedScript.length > 0 && completedCount >= generatedScript.length;
  const getDefaultTitle = useCallback((index: number) => t('defaultSegmentTitle', { index }), [t]);

  const buildReferenceImages = useCallback(
    () => (characterDesignImage ? [characterDesignImage] : referenceImages),
    [characterDesignImage, referenceImages],
  );

  const resolveStepAfterSingle = useCallback(
    (scriptId: string) => {
      const nextCompletedCount = new Set([...Object.keys(generatedComics), scriptId]).size;
      return nextCompletedCount >= generatedScript.length ? 'done' : 'characters_done';
    },
    [generatedComics, generatedScript.length],
  );

  const handleGenerateComic = useCallback(
    async (
      script: ScriptSegment,
      options: {
        silent?: boolean;
        manageStep?: boolean;
      } = {},
    ) => {
      if (!apiKey) {
        openApiSettings();
        return;
      }

      if (options.manageStep) {
        setCurrentStep('generating_comics');
      }

      setGeneratingCuts((prev) => ({ ...prev, [script.id]: true }));
      setGenerationErrors((prev) => {
        const next = { ...prev };
        delete next[script.id];
        return next;
      });

      try {
        const prompt = buildComicPagePrompt({
          segment: script,
          storyInput,
          characterDesign: displayCharacterDesign || characterDesign,
          characterNames,
          language,
          aspectRatio: ratio,
          animeStyle: getAnimeStylePrompt(animeStyle, customAnimeStyle),
          style,
          hasCharacterReference: Boolean(characterDesignImage),
          referenceImagesCount: referenceImages.length,
        });
        const imageUrl = await generateImage(apiKey, prompt, {
          referenceImages: buildReferenceImages(),
          aspectRatio: ratio,
          referenceInstruction: buildComicReferenceInstruction({
            hasCharacterReference: Boolean(characterDesignImage),
            referenceImagesCount: referenceImages.length,
          }),
          referenceLabels: buildComicReferenceLabels({
            hasCharacterReference: Boolean(characterDesignImage),
            referenceImagesCount: referenceImages.length,
          }),
        });

        setGeneratedComic(script.id, imageUrl);
        setPendingComicId(null);

        if (options.manageStep) {
          setCurrentStep(resolveStepAfterSingle(script.id));
        } else if (resolveStepAfterSingle(script.id) === 'done') {
          setCurrentStep('done');
        }

        return imageUrl;
      } catch (error) {
        const message = error instanceof Error ? error.message : t('alerts.imageFailed');
        setGenerationErrors((prev) => ({ ...prev, [script.id]: message }));
        if (options.manageStep) {
          setCurrentStep('characters_done');
        }
        if (!options.silent) {
          alert(message);
        }
        throw error;
      } finally {
        setGeneratingCuts((prev) => ({ ...prev, [script.id]: false }));
      }
    },
    [
      apiKey,
      buildReferenceImages,
      characterDesign,
      characterDesignImage,
      characterNames,
      displayCharacterDesign,
      animeStyle,
      customAnimeStyle,
      language,
      openApiSettings,
      ratio,
      referenceImages.length,
      resolveStepAfterSingle,
      setCurrentStep,
      setGeneratedComic,
      setPendingComicId,
      storyInput,
      style,
      t,
    ],
  );

  const handleRegenerateCharacterDesign = useCallback(async () => {
    if (!apiKey) {
      openApiSettings();
      return;
    }

    setIsRegeneratingCharacterDesign(true);

    try {
      const {
        characterText,
        characterNames: nextCharacterNames,
        characterImage,
      } = await generateCharacterAssets({
        apiKey,
        model,
        storyInput,
        generatedScript,
        language,
        aspectRatio: ratio,
        animeStyle: getAnimeStylePrompt(animeStyle, customAnimeStyle),
        style,
        referenceImages,
        existingCharacterText: displayCharacterDesign || characterDesign,
      });

      setCharacterDesign(characterText);
      setCharacterDesignImage(characterImage);
      setCharacterNames(nextCharacterNames);
    } catch (error) {
      alert(error instanceof Error ? error.message : t('alerts.characterDesignFailed'));
    } finally {
      setIsRegeneratingCharacterDesign(false);
    }
  }, [
    apiKey,
    animeStyle,
    characterDesign,
    customAnimeStyle,
    displayCharacterDesign,
    generatedScript,
    language,
    model,
    openApiSettings,
    ratio,
    referenceImages,
    setCharacterDesign,
    setCharacterDesignImage,
    setCharacterNames,
    storyInput,
    style,
    t,
  ]);

  const handleExportAll = useCallback(() => {
    const exportQueue: Array<{ url: string; filename: string }> = [];

    if (characterDesignImage) {
      exportQueue.push({
        url: characterDesignImage,
        filename: '00-character-design.png',
      });
    }

    generatedScript.forEach((script, index) => {
      const image = generatedComics[script.id];
      if (image) {
        exportQueue.push({
          url: image,
          filename: `${String(index + 1).padStart(2, '0')}-${script.cut.toLowerCase().replace(/\s+/g, '-')}.png`,
        });
      }
    });

    if (!exportQueue.length) {
      alert(t('alerts.noExportableImages'));
      return;
    }

    exportQueue.forEach((item, index) => {
      window.setTimeout(() => downloadImage(item.url, item.filename), index * 250);
    });
  }, [characterDesignImage, generatedComics, generatedScript, t]);

  const handleGenerateAll = useCallback(async () => {
    if (!generatedScript.length) {
      return;
    }

    if (!apiKey) {
      openApiSettings();
      return;
    }

    setIsGeneratingAll(true);
    setCurrentStep('generating_comics');
    setPendingComicId(null);

    let hasError = false;

    for (const script of generatedScript) {
      try {
        await handleGenerateComic(script, {
          silent: true,
          manageStep: false,
        });
      } catch {
        hasError = true;
      }
    }

    setIsGeneratingAll(false);
    setCurrentStep(hasError ? 'characters_done' : 'done');

    if (hasError) {
      alert(t('alerts.partialFailed'));
    }
  }, [apiKey, generatedScript, handleGenerateComic, openApiSettings, setCurrentStep, setPendingComicId, t]);

  useEffect(() => {
    if (currentStep !== 'generating_comics' || !pendingComicId) {
      autoRunRef.current = null;
      return;
    }

    const runKey = pendingComicId;
    if (autoRunRef.current === runKey) {
      return;
    }

    autoRunRef.current = runKey;

    if (pendingComicId === '__all__') {
      handleGenerateAll().catch(() => undefined);
      return;
    }

    const targetScript = generatedScript.find((script) => script.id === pendingComicId);
    if (!targetScript) {
      setPendingComicId(null);
      setCurrentStep('characters_done');
      return;
    }

    handleGenerateComic(targetScript, { silent: true, manageStep: true }).catch(() => undefined);
  }, [
    currentStep,
    generatedScript,
    handleGenerateAll,
    handleGenerateComic,
    pendingComicId,
    setCurrentStep,
    setPendingComicId,
  ]);

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-gray-800 flex items-center">
            <span className="mr-2">🎨</span>
            {currentStep === 'generating_comics' && !isAllCompleted
              ? t('progressGenerating', { completed: completedCount, total: generatedScript.length })
              : t('progressDone', { completed: completedCount, total: generatedScript.length })}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {characterDesignImage ? t('withCharacterReference') : t('withoutCharacterReference')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportAll}
            disabled={!characterDesignImage && completedCount === 0}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              !characterDesignImage && completedCount === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {t('exportAll')}
          </button>
          <button
            onClick={handleGenerateAll}
            disabled={isGeneratingAll}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              isGeneratingAll ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {isGeneratingAll ? t('generatingAll') : t('generateAll')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-gray-50/80 p-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-800 flex items-center">
              <Users className="w-5 h-5 text-gray-700 mr-2" />
              {t('referenceTitle')}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {characterDesignImage ? t('referenceHintWithImage') : t('referenceHintWithoutImage')}
            </p>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
            <div className="flex flex-col">
              <div className="w-full aspect-[16/9] bg-gray-100 rounded-lg border border-gray-200 mb-4 overflow-hidden flex items-center justify-center">
                {characterDesignImage ? (
                  <img
                    src={characterDesignImage}
                    alt={t('characterDesignAlt')}
                    className="w-full h-full object-contain bg-white cursor-zoom-in"
                    onClick={() => setPreviewImage(characterDesignImage)}
                  />
                ) : (
                  <div className="text-center px-6">
                    <ImagePlus className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">{t('noCharacterDesignImage')}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('noCharacterDesignImageHint')}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-wrap gap-2">
                  {characterNames.map((name) => (
                    <span
                      key={name}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full border border-gray-200"
                    >
                      {name}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {characterDesignImage && (
                    <button
                      onClick={() => downloadImage(characterDesignImage, 'character-design.png')}
                      className="bg-[#1a1b2e] text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-black transition-colors"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('downloadCharacterDesign')}
                    </button>
                  )}
                  <button
                    onClick={handleRegenerateCharacterDesign}
                    disabled={isRegeneratingCharacterDesign}
                    className={`px-5 py-2 rounded-lg text-sm font-medium flex items-center transition-colors ${
                      isRegeneratingCharacterDesign
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {isRegeneratingCharacterDesign ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-400/40 border-t-gray-600 rounded-full animate-spin mr-2" />
                        {t('generatingCharacterDesign')}
                      </>
                    ) : characterDesignImage ? (
                      t('regenerateCharacterDesign')
                    ) : (
                      t('generateCharacterDesign')
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="relative lg:h-auto h-[420px]">
              <div className="lg:absolute lg:inset-0 w-full h-full bg-gray-50 rounded-lg border border-gray-100 p-4 overflow-y-auto">
                <h3 className="text-sm font-bold text-gray-700 flex items-center mb-3">
                  <span className="text-gray-500 mr-2">📝</span>
                  {t('characterNotes')}
                </h3>
                {characterProfiles.length > 0 ? (
                  <div className="space-y-3">
                    {characterProfiles.map((profile, index) => (
                      <div
                        key={`${profile.name}-${index}`}
                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <h4 className="text-sm font-bold text-gray-900">{profile.name}</h4>
                          <span className="text-[11px] text-gray-400">{t('characterCard', { index: index + 1 })}</span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-[11px] font-semibold text-gray-600 mb-1">{t('appearance')}</p>
                            <p className="text-[13px] leading-6 text-slate-700">
                              {profile.appearance || t('noDescription')}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-gray-600 mb-1">{t('outfit')}</p>
                            <p className="text-[13px] leading-6 text-slate-700">
                              {profile.outfit || t('noDescription')}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-gray-600 mb-1">{t('personality')}</p>
                            <p className="text-[13px] leading-6 text-slate-700">
                              {profile.personality || t('noDescription')}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-gray-600 mb-1">{t('role')}</p>
                            <p className="text-[13px] leading-6 text-slate-700">{profile.role || t('noDescription')}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-gray-600 mb-1">{t('staging')}</p>
                            <p className="text-[13px] leading-6 text-slate-700">
                              {profile.staging || t('noDescription')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[14px] text-slate-700 whitespace-pre-wrap leading-7 tracking-[0.01em]">
                    {displayCharacterDesign || t('noCharacterText')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
        {generatedScript.map((script, index) => {
          const generatedImage = generatedComics[script.id];
          const isGenerating = Boolean(generatingCuts[script.id]);
          const errorMessage = generationErrors[script.id];

          return (
            <div
              key={script.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm"
            >
              <div className="w-full aspect-video bg-gray-100 border-b border-gray-100 overflow-hidden flex items-center justify-center">
                {generatedImage ? (
                  <img
                    src={generatedImage}
                    alt={t('comicAlt', { title: script.title || getDefaultTitle(index + 1) })}
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setPreviewImage(generatedImage)}
                  />
                ) : errorMessage ? (
                  <div className="w-full h-full bg-red-50 text-red-500 flex flex-col items-center justify-center text-center px-5">
                    <p className="text-base font-semibold">{t('generationFailed')}</p>
                    <p className="text-sm leading-6 mt-2 max-w-[260px]">{errorMessage}</p>
                  </div>
                ) : (
                  <div className="text-center px-4">
                    <p className="text-sm text-gray-500">{t('notGeneratedYet')}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('notGeneratedHint')}</p>
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-700">
                  {script.title || getDefaultTitle(index + 1)}
                </span>
                <span className="text-xs text-gray-400 font-medium">{script.cut}</span>
              </div>

              <div className="p-4 flex-1 overflow-y-auto min-h-[200px] max-h-[300px]">
                <div className="text-[14px] text-slate-700 whitespace-pre-wrap leading-7 tracking-[0.01em] pb-4">
                  {getSegmentDisplayContent(script.raw)}
                </div>
              </div>

              <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-2">
                {generatedImage ? (
                  <button
                    onClick={() =>
                      downloadImage(generatedImage, `${script.cut.toLowerCase().replace(/\s+/g, '-')}.png`)
                    }
                    className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Download className="w-3 h-3 mr-1.5" />
                    {t('download')}
                  </button>
                ) : (
                  <span />
                )}

                <button
                  onClick={() => handleGenerateComic(script, { manageStep: false })}
                  disabled={isGenerating}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium flex items-center transition-colors ${
                    isGenerating
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                      {t('generating')}
                    </>
                  ) : (
                    <>
                      <PlaySquare className="w-3 h-3 mr-1.5 text-green-400" />
                      {generatedImage ? t('regenerate') : t('generateComic')}
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-6xl max-h-full" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white text-gray-700 shadow-lg"
            >
              ×
            </button>
            <img
              src={previewImage}
              alt={t('previewAlt')}
              className="max-w-[90vw] max-h-[88vh] object-contain rounded-xl shadow-2xl bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};
