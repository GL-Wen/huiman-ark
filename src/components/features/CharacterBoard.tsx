import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore, ScriptSegment } from '../../store';
import { Users, Download, PlaySquare, RefreshCw } from 'lucide-react';
import { ImageLightbox, type ImageLightboxItem } from '../common/ImageLightbox';
import {
  buildComicPagePrompt,
  buildComicReferenceInstruction,
  generateImage,
  generateCharacterAssets,
  parseCharacterProfiles,
  sanitizeCharacterDesignText,
  pickComicCharacterProfiles,
  type CharacterReferenceMode,
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
    characterPortraits,
    clearCharacterPortraits,
  } = useAppStore();
  const [generatingCuts, setGeneratingCuts] = useState<Record<string, boolean>>({});
  const [generationErrors, setGenerationErrors] = useState<Record<string, string>>({});
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isRegeneratingCharacterSheet, setIsRegeneratingCharacterSheet] = useState(false);
  const [lightboxState, setLightboxState] = useState<{ items: ImageLightboxItem[]; index: number } | null>(null);
  const autoRunRef = useRef<string | null>(null);
  const displayCharacterDesign = useMemo(
    () => (characterDesign ? sanitizeCharacterDesignText(characterDesign) : ''),
    [characterDesign],
  );
  const characterProfiles = useMemo(() => parseCharacterProfiles(displayCharacterDesign), [displayCharacterDesign]);
  const hasCharacterReference = useMemo(
    () => Boolean(characterDesignImage) || Object.keys(characterPortraits).length > 0,
    [characterDesignImage, characterPortraits],
  );

  const completedCount = useMemo(
    () => generatedScript.filter((script) => Boolean(generatedComics[script.id])).length,
    [generatedComics, generatedScript],
  );
  const isAllCompleted = generatedScript.length > 0 && completedCount >= generatedScript.length;
  const getDefaultTitle = useCallback((index: number) => t('defaultSegmentTitle', { index }), [t]);
  const characterSheetPreviewItems = useMemo(
    () =>
      characterDesignImage
        ? [
            {
              src: characterDesignImage,
              alt: t('referenceTitle'),
              title: t('referenceTitle'),
              subtitle: characterNames.length ? characterNames.join(' / ') : undefined,
              downloadFilename: 'character-design-sheet.png',
            },
          ]
        : [],
    [characterDesignImage, characterNames, t],
  );
  const generatedComicPreviewItems = useMemo(
    () =>
      generatedScript.flatMap((script, index) => {
        const generatedImage = generatedComics[script.id];

        if (!generatedImage) {
          return [];
        }

        return [
          {
            src: generatedImage,
            alt: t('comicAlt', { title: script.title || getDefaultTitle(index + 1) }),
            title: script.title || getDefaultTitle(index + 1),
            subtitle: script.cut,
            downloadFilename: `${script.cut.toLowerCase().replace(/\s+/g, '-')}.png`,
          },
        ];
      }),
    [generatedComics, generatedScript, getDefaultTitle, t],
  );

  const openLightbox = useCallback((items: ImageLightboxItem[], index: number) => {
    if (!items.length) {
      return;
    }

    setLightboxState({ items, index });
  }, []);

  const buildReferenceImages = useCallback(
    (
      script: ScriptSegment,
    ): {
      mode: CharacterReferenceMode;
      images: string[];
      labels: string[];
      portraitNames: string[];
    } => {
      const matchedProfiles = pickComicCharacterProfiles({
        characterDesign,
        cleanedSegmentRaw: script.raw.replace(/^\s*\[[^\]]+\]\s*\n?/, '').trim(),
        scene: script.scene,
        plot: script.plot,
        desc: script.desc,
        characterNames,
      });

      const MAX_REF = 6;
      const slicedMatches = matchedProfiles.slice(0, MAX_REF);
      const matchedPortraitKeys: string[] = [];

      for (const { profile, originalIndex } of slicedMatches) {
        const key = `${profile.name}#${originalIndex}`;
        if (characterPortraits[key]) {
          matchedPortraitKeys.push(key);
        }
      }

      if (characterDesignImage) {
        const userRefImages = referenceImages.slice(0, MAX_REF - 1);
        return {
          mode: 'sheet',
          images: [characterDesignImage, ...userRefImages],
          labels: [
            '角色设定总图：请按图中每个角色对应区域保持后续漫画人物一致',
            ...Array(userRefImages.length).fill(''),
          ],
          portraitNames: [],
        };
      }

      if (matchedPortraitKeys.length > 0) {
        const portraitImages = matchedPortraitKeys.map((key) => characterPortraits[key]);
        const portraitDisplayNames = matchedPortraitKeys.map((key) => {
          const [name] = key.split('#');
          return name;
        });
        const remainingSlots = MAX_REF - portraitImages.length;
        const userRefImages = referenceImages.slice(0, remainingSlots);
        const images = [...portraitImages, ...userRefImages];
        const labels = [
          ...matchedPortraitKeys.map((key) => {
            const [name] = key.split('#');
            return `角色参考：${name}`;
          }),
          ...Array(userRefImages.length).fill(''),
        ];
        return { mode: 'portraits', images, labels, portraitNames: portraitDisplayNames };
      }

      if (referenceImages.length > 0) {
        return { mode: 'user', images: referenceImages, labels: [], portraitNames: [] };
      }

      return { mode: 'none', images: [], labels: [], portraitNames: [] };
    },
    [characterDesign, characterDesignImage, characterPortraits, characterNames, referenceImages],
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
        const { mode, images, labels, portraitNames } = buildReferenceImages(script);

        const prompt = buildComicPagePrompt({
          segment: script,
          storyInput,
          characterDesign: displayCharacterDesign || characterDesign,
          characterNames,
          language,
          aspectRatio: ratio,
          animeStyle: getAnimeStylePrompt(animeStyle, customAnimeStyle),
          style,
          characterReferenceMode: mode,
          portraitNames,
        });
        const imageUrl = await generateImage(apiKey, prompt, {
          referenceImages: images,
          aspectRatio: ratio,
          referenceInstruction: buildComicReferenceInstruction({
            characterReferenceMode: mode,
            referenceImagesCount: images.length,
          }),
          referenceLabels: labels,
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
      characterNames,
      displayCharacterDesign,
      animeStyle,
      customAnimeStyle,
      language,
      openApiSettings,
      ratio,
      resolveStepAfterSingle,
      setCurrentStep,
      setGeneratedComic,
      setPendingComicId,
      storyInput,
      style,
      t,
    ],
  );

  const handleExportAll = useCallback(() => {
    const exportQueue: Array<{ url: string; filename: string }> = [];

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
  }, [generatedComics, generatedScript, t]);

  const handleRegenerateCharacterSheet = useCallback(
    async () => {
      if (!apiKey) {
        openApiSettings();
        return;
      }

      if (!generatedScript.length) {
        return;
      }

      setIsRegeneratingCharacterSheet(true);

      try {
        const selectedAnimeStyle = getAnimeStylePrompt(animeStyle, customAnimeStyle);
        const { characterText, characterNames: nextCharacterNames, characterImage } = await generateCharacterAssets({
          apiKey,
          model,
          storyInput,
          generatedScript,
          language,
          aspectRatio: ratio,
          animeStyle: selectedAnimeStyle,
          style,
          referenceImages,
          existingCharacterText: displayCharacterDesign || characterDesign,
        });

        setCharacterDesign(characterText);
        setCharacterDesignImage(characterImage);
        setCharacterNames(nextCharacterNames);
        clearCharacterPortraits();
        setPendingComicId(null);
      } catch (error) {
        alert(error instanceof Error ? error.message : t('alerts.characterDesignFailed'));
      } finally {
        setIsRegeneratingCharacterSheet(false);
      }
    },
    [
      apiKey,
      animeStyle,
      characterDesign,
      clearCharacterPortraits,
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
      setPendingComicId,
      storyInput,
      style,
      t,
    ],
  );

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
            {hasCharacterReference ? t('withCharacterReference') : t('withoutCharacterReference')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportAll}
            disabled={completedCount === 0}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              completedCount === 0
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
          </div>

          {characterProfiles.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,420px)_minmax(0,1fr)] gap-0">
              <div className="bg-white p-4 lg:border-r border-gray-200">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-slate-800">{t('referenceTitle')}</h3>
                </div>
                {characterDesignImage ? (
                  <>
                    <div className="w-full rounded-lg bg-gray-100 border border-gray-200 overflow-hidden">
                      <img
                        src={characterDesignImage}
                        alt={t('referenceTitle')}
                        className="w-full cursor-zoom-in object-contain transition duration-300 hover:scale-[1.02]"
                        onClick={() => openLightbox(characterSheetPreviewItems, 0)}
                      />
                    </div>
                    <p className="mt-3 text-[12px] leading-6 text-slate-600">
                      {characterNames.length ? characterNames.join(' / ') : t('noCharacters')}
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleRegenerateCharacterSheet}
                        disabled={isRegeneratingCharacterSheet}
                        className={`h-10 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                          isRegeneratingCharacterSheet
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <RefreshCw
                          className={`w-4 h-4 mr-1.5 ${isRegeneratingCharacterSheet ? 'animate-spin' : ''}`}
                        />
                        {isRegeneratingCharacterSheet ? t('generating') : t('regenerate')}
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadImage(characterDesignImage, 'character-design-sheet.png')}
                        className="h-10 rounded-lg text-sm font-medium flex items-center justify-center bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Download className="w-4 h-4 mr-1.5" />
                        {t('download')}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="min-h-64 rounded-lg bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-[12px] text-gray-400">
                    {t('noCharacters')}
                  </div>
                )}
              </div>

              <div className="min-h-0 bg-white">
                <div className="max-h-[560px] overflow-y-auto divide-y divide-gray-100">
                  {characterProfiles.map((profile, index) => {
                    const profileCardKey = `${profile.name}-${index}`;
                    const detailSections = [
                      { label: t('outfit'), value: profile.outfit },
                      { label: t('personality'), value: profile.personality },
                      { label: t('role'), value: profile.role },
                      { label: t('staging'), value: profile.staging },
                    ].filter((section) => section.value);

                    return (
                      <div key={profileCardKey} className="bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm leading-6 font-bold text-slate-800">{profile.name}</h4>
                            <p className="mt-1 text-[12px] leading-6 text-slate-700">
                              {profile.appearance || t('noDescription')}
                            </p>
                          </div>
                        </div>

                        {detailSections.length > 0 ? (
                          <div className="mt-4 space-y-3">
                            {detailSections.map((section) => (
                              <section key={`${profile.name}-${section.label}`}>
                                <p className="text-[12px] font-semibold text-gray-400 mb-1">{section.label}</p>
                                <p className="text-[12px] leading-6 text-slate-700">{section.value}</p>
                              </section>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[12px] text-slate-700 whitespace-pre-wrap leading-6 tracking-[0.01em]">
              {displayCharacterDesign || t('noCharacterText')}
            </div>
          )}
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
                    className="h-full w-full cursor-zoom-in object-cover transition duration-300 hover:scale-[1.03]"
                    onClick={() => {
                      const previewIndex = generatedComicPreviewItems.findIndex((item) => item.src === generatedImage);
                      openLightbox(generatedComicPreviewItems, previewIndex >= 0 ? previewIndex : 0);
                    }}
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

      <ImageLightbox
        isOpen={Boolean(lightboxState)}
        items={lightboxState?.items ?? []}
        activeIndex={lightboxState?.index ?? 0}
        labels={{
          close: t('lightbox.close'),
          previous: t('lightbox.previous'),
          next: t('lightbox.next'),
          zoomIn: t('lightbox.zoomIn'),
          zoomOut: t('lightbox.zoomOut'),
          reset: t('lightbox.reset'),
          download: t('download'),
          imageCounter: (current, total) => t('lightbox.imageCounter', { current, total }),
          keyboardHint: t('lightbox.keyboardHint'),
        }}
        onClose={() => setLightboxState(null)}
        onIndexChange={(index) => setLightboxState((prev) => (prev ? { ...prev, index } : prev))}
        onDownload={(item) => downloadImage(item.src, item.downloadFilename || 'image.png')}
      />
    </div>
  );
};
