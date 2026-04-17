import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { type AppLocale } from '@/i18n/routing';
import { useAppStore, type ScriptSegment } from '../../store';
import { Sparkles, ChevronDown, ChevronUp, Image as ImageIcon, Rows3, Trash2 } from 'lucide-react';
import {
  extractStorySegmentTitle,
  generateContent,
  isInvalidStoryMetaBlock,
  sanitizeStorySegmentText,
  STORY_EXPERT_PROMPT,
  SUPPORTED_REFERENCE_IMAGE_ACCEPT,
  SUPPORTED_REFERENCE_IMAGE_MIME_TYPES,
} from '../../api/llm';
import { animeStyleOptions, getAnimeStylePrompt } from '../../lib/animeStyles';

const MIN_SCENE_COUNT = 1;
const MAX_SCENE_COUNT = 100;
const DEFAULT_PANELS_PER_PARAGRAPH = '3~6';
const PANELS_RANGE_PATTERN = /^\s*(\d+)\s*(?:~|-|—|–|到|至)\s*(\d+)\s*$/;
const DEFAULT_OUTPUT_LANGUAGE_BY_LOCALE: Record<AppLocale, string> = {
  zh: '中文（简体）',
  en: 'English',
  ja: '日本語',
};
const SUPPORTED_OUTPUT_LANGUAGES = new Set(Object.values(DEFAULT_OUTPUT_LANGUAGE_BY_LOCALE));
const SUPPORTED_REFERENCE_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif']);
const SUPPORTED_REFERENCE_IMAGE_MIME_TYPE_SET = new Set<string>(SUPPORTED_REFERENCE_IMAGE_MIME_TYPES);

const isSupportedReferenceImageFile = (file: File) => {
  const normalizedMimeType = file.type.toLowerCase() === 'image/jpg' ? 'image/jpeg' : file.type.toLowerCase();
  if (SUPPORTED_REFERENCE_IMAGE_MIME_TYPE_SET.has(normalizedMimeType)) {
    return true;
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  return Boolean(extension && SUPPORTED_REFERENCE_IMAGE_EXTENSIONS.has(extension));
};

const normalizeParagraphCountValue = (value: string) => {
  if (!value || value === '自动 (8-15段)' || value === '8段 (8-15段)') return 'auto';
  if (value === '5段') return '5';
  if (value === '8段') return '8';
  if (value === '10段') return '10';
  if (value === '12段') return '12';
  if (value === '15段') return '15';
  if (['auto', '5', '8', '10', '12', '15', 'custom'].includes(value)) return value;
  return 'auto';
};

const normalizePanelsPerParagraphRange = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return DEFAULT_PANELS_PER_PARAGRAPH;
  }

  const match = trimmedValue.match(PANELS_RANGE_PATTERN);
  if (!match) {
    return null;
  }

  const minPanels = Number.parseInt(match[1], 10);
  const maxPanels = Number.parseInt(match[2], 10);
  if (!Number.isInteger(minPanels) || !Number.isInteger(maxPanels) || minPanels < 1 || maxPanels < minPanels) {
    return null;
  }

  return `${minPanels}~${maxPanels}`;
};

const getPanelsPerParagraphInputValues = (value: string) => {
  const normalizedRange = normalizePanelsPerParagraphRange(value);
  const fallbackRange = normalizePanelsPerParagraphRange(DEFAULT_PANELS_PER_PARAGRAPH);
  const matchedRange = normalizedRange ?? fallbackRange;
  const match = matchedRange?.match(PANELS_RANGE_PATTERN);

  return {
    min: match?.[1] ?? '',
    max: match?.[2] ?? '',
  };
};

const parseScriptSegments = (result: string, getDefaultTitle: (index: number) => string): ScriptSegment[] => {
  const normalized = result.replace(/\r\n/g, '\n').trim();
  const blocks = normalized.includes('<scene>')
    ? normalized.split('<scene>')
    : normalized.split(/\n{2,}(?=\[.*?\]|场景[:：]|Scene[:：])/);

  const parsed = blocks
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const cleanedBlock = sanitizeStorySegmentText(block);
      const title = extractStorySegmentTitle(block);
      const sceneMatch = cleanedBlock.match(/(?:场景|Scene)[:：](.*?)(?=\n|$)/i);
      const plotMatch = cleanedBlock.match(/(?:情节概述|剧情|Plot)[:：](.*?)(?=\n|$)/i);
      const descMatch = cleanedBlock.match(
        /(?:画面描述|分镜描述|Visual)[:：]([\s\S]*?)(?=\n(?:本段落|分格建议|第\d+格)|$)/i,
      );

      return {
        id: `cut-${index + 1}`,
        title: title || getDefaultTitle(index + 1),
        cut: `Cut ${index + 1}`,
        scene: sceneMatch?.[1]?.trim() || '',
        plot: plotMatch?.[1]?.trim() || '',
        desc: descMatch?.[1]?.trim() || '',
        raw: cleanedBlock,
      };
    });

  const validSegments = parsed
    .filter((segment) => !isInvalidStoryMetaBlock(segment.raw))
    .map((segment, index) => ({
      ...segment,
      id: `cut-${index + 1}`,
      title: segment.title || getDefaultTitle(index + 1),
      cut: `Cut ${index + 1}`,
    }));

  if (validSegments.length > 0) {
    return validSegments;
  }

  if (isInvalidStoryMetaBlock(normalized)) {
    return [];
  }

  return [
    {
      id: 'cut-1',
      title: getDefaultTitle(1),
      cut: 'Cut 1',
      scene: '',
      plot: '',
      desc: '',
      raw: normalized,
    },
  ];
};

export const Sidebar: React.FC = () => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const hasInitializedLanguageSyncRef = React.useRef(false);
  const locale = useLocale() as AppLocale;
  const t = useTranslations('Sidebar');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const {
    apiKey,
    openApiSettings,
    storyInput,
    setStoryInput,
    model,
    setModel,
    language,
    setLanguage,
    paragraphCount,
    setParagraphCount,
    customParagraphCount,
    setCustomParagraphCount,
    panelsPerParagraph,
    setPanelsPerParagraph,
    ratio,
    setRatio,
    animeStyle,
    setAnimeStyle,
    customAnimeStyle,
    setCustomAnimeStyle,
    style,
    setStyle,
    referenceImages,
    setReferenceImages,
    clearHistory,
    setCurrentStep,
    setGeneratedScript,
    setCharacterDesign,
    setCharacterDesignImage,
    setCharacterNames,
    clearCharacterPortraits,
    setGeneratedComics,
    setPendingComicId,
    generatedScript,
    currentStep,
  } = useAppStore();

  const isGeneratingStory = currentStep === 'generating_story';
  const paragraphCountValue = normalizeParagraphCountValue(paragraphCount);
  const initialPanelsRange = React.useMemo(
    () => getPanelsPerParagraphInputValues(panelsPerParagraph),
    [panelsPerParagraph],
  );
  const [minPanelsPerParagraph, setMinPanelsPerParagraph] = React.useState(initialPanelsRange.min);
  const [maxPanelsPerParagraph, setMaxPanelsPerParagraph] = React.useState(initialPanelsRange.max);
  const getDefaultTitle = React.useCallback((index: number) => t('defaultSegmentTitle', { index }), [t]);
  const getAnimeStyleDisplayLabel = React.useCallback(
    (option: (typeof animeStyleOptions)[number]) => {
      const key = `animeStyles.${option.value}`;
      const translated = t(key as never);

      return translated === key || translated === `Sidebar.${key}` ? option.label : translated;
    },
    [t],
  );
  const defaultOutputLanguage = DEFAULT_OUTPUT_LANGUAGE_BY_LOCALE[locale];
  const selectedOutputLanguage = language || defaultOutputLanguage;
  const hasUserProgress = Boolean(
    storyInput.trim() || referenceImages.length || generatedScript.length || currentStep !== 'initial',
  );
  const previousLocaleRef = React.useRef(locale);

  React.useEffect(() => {
    const localeChanged = previousLocaleRef.current !== locale;
    const shouldInitializeLanguage =
      !hasInitializedLanguageSyncRef.current &&
      !hasUserProgress &&
      (!language || (SUPPORTED_OUTPUT_LANGUAGES.has(language) && language !== defaultOutputLanguage));

    if (!hasUserProgress && (localeChanged || shouldInitializeLanguage)) {
      setLanguage(defaultOutputLanguage);
    }

    hasInitializedLanguageSyncRef.current = true;
    previousLocaleRef.current = locale;
  }, [
    currentStep,
    defaultOutputLanguage,
    generatedScript.length,
    hasUserProgress,
    language,
    locale,
    referenceImages.length,
    setLanguage,
    storyInput,
  ]);

  React.useEffect(() => {
    const nextRange = getPanelsPerParagraphInputValues(panelsPerParagraph);
    setMinPanelsPerParagraph(nextRange.min);
    setMaxPanelsPerParagraph(nextRange.max);
  }, [panelsPerParagraph]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const availableSlots = 3 - referenceImages.length;
    if (availableSlots <= 0) {
      alert(t('alerts.maxReferenceImages', { count: 3 }));
      event.target.value = '';
      return;
    }

    const acceptedFiles = files.slice(0, availableSlots);

    try {
      const dataUrls = await Promise.all(
        acceptedFiles.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              if (!isSupportedReferenceImageFile(file)) {
                reject(new Error(t('alerts.onlyImageFiles')));
                return;
              }

              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => reject(new Error(t('alerts.readFileFailed', { name: file.name })));
              reader.readAsDataURL(file);
            }),
        ),
      );

      setReferenceImages([...referenceImages, ...dataUrls]);
    } catch (error) {
      alert(error instanceof Error ? error.message : t('alerts.uploadFailed'));
    } finally {
      event.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setReferenceImages(referenceImages.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleGenerateStory = async () => {
    if (!apiKey) {
      openApiSettings();
      return;
    }
    if (!storyInput.trim()) {
      alert(t('alerts.missingStoryInput'));
      return;
    }
    if (animeStyle === 'custom' && !customAnimeStyle.trim()) {
      alert(t('alerts.missingCustomStyle'));
      return;
    }

    let paragraphPrompt = '【段落数量】请根据故事节奏自动控制在 8-15 个段落。';
    if (paragraphCountValue !== 'auto') {
      const targetCount = paragraphCountValue === 'custom' ? customParagraphCount.trim() : paragraphCountValue;
      const parsedCount = Number.parseInt(targetCount, 10);

      if (!Number.isInteger(parsedCount) || parsedCount < MIN_SCENE_COUNT || parsedCount > MAX_SCENE_COUNT) {
        alert(t('alerts.invalidParagraphRange', { min: MIN_SCENE_COUNT, max: MAX_SCENE_COUNT }));
        return;
      }

      paragraphPrompt = `【段落数量】请生成 ${parsedCount} 个段落。`;
    }

    const normalizedPanelsPerParagraph = normalizePanelsPerParagraphRange(panelsPerParagraph);
    if (!normalizedPanelsPerParagraph) {
      alert(t('alerts.invalidPanelsPerParagraph'));
      return;
    }

    setCurrentStep('generating_story');
    setCharacterDesign(null);
    setCharacterDesignImage(null);
    setCharacterNames([]);
    clearCharacterPortraits();
    setGeneratedComics({});
    setPendingComicId(null);

    try {
      const prompt = `
      用户的要求和说明：
      ${storyInput}
      
      【动漫风格】${getAnimeStylePrompt(animeStyle, customAnimeStyle)}
      ${style ? `【风格偏好】${style}` : ''}
      【输出语言】请使用${selectedOutputLanguage}编写所有段落、对话、旁白和音效。
      【漫画比例】后续漫画页面和角色设定图请使用 ${ratio} 比例生成。
      ${paragraphPrompt}
      【画面格子数】请控制每段生成的漫画包含的格子数在 ${normalizedPanelsPerParagraph} 个左右。
      `;

      const result = await generateContent(apiKey, model, prompt, STORY_EXPERT_PROMPT);
      let parsedScript = parseScriptSegments(result, getDefaultTitle);

      if (!parsedScript.length) {
        const repairedResult = await generateContent(
          apiKey,
          model,
          `${prompt}

【纠偏要求】你上一版输出包含了向用户追问或说明性文字。现在请直接重写为完整的漫画分镜段落，不要提问，不要补充说明，不要输出任何段落外文本。`,
          STORY_EXPERT_PROMPT,
        );
        parsedScript = parseScriptSegments(repairedResult, getDefaultTitle);
      }

      if (!parsedScript.length) {
        throw new Error(t('alerts.invalidResult'));
      }

      setGeneratedScript(parsedScript);
      setCurrentStep('story_done');
    } catch (error) {
      alert(error instanceof Error ? error.message : t('alerts.generateFailed'));
      setCurrentStep('initial');
    }
  };

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [storyInput]);

  return (
    <aside className="w-[360px] flex-shrink-0 border-r border-gray-200 bg-white h-full flex flex-col overflow-y-auto">
      <div className="p-5 space-y-6">
        <div className="space-y-2">
          <label className="flex items-center text-sm font-bold text-gray-800">
            <span className="text-gray-400 mr-2">💬</span>
            {t('storyDescription')}
          </label>
          <textarea
            ref={textareaRef}
            value={storyInput}
            onChange={(e) => {
              setStoryInput(e.target.value);
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
              }
            }}
            placeholder={t('storyPlaceholder')}
            style={{ minHeight: '8rem', maxHeight: '20rem' }}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm resize-none overflow-y-auto"
          />
        </div>

        <button
          onClick={handleGenerateStory}
          disabled={isGeneratingStory}
          className={`w-full py-3 rounded-lg font-bold flex items-center justify-center transition-colors ${
            isGeneratingStory
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#1a1b2e] text-white hover:bg-black'
          }`}
        >
          <Sparkles className="w-4 h-4 text-orange-400 mr-2" />
          {isGeneratingStory ? t('generatingStory') : t('generateStory')}
        </button>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full bg-gray-50 px-4 py-3 flex justify-between items-center text-sm text-gray-600 font-medium"
          >
            <div className="flex items-center">
              <span className="text-purple-400 mr-2">⚙️</span>
              {t('advancedOptions')}
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="p-4 space-y-4 border-t border-gray-200">
              <div className="space-y-1">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <span className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded mr-2" />
                  {t('modelLabel')}
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
                >
                  <option value="gpt-5.4">gpt-5.4</option>
                  <option value="gpt-5.4-mini">gpt-5.4-mini</option>
                  <option value="gpt-5.2">gpt-5.2</option>
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gemini-3-pro">gemini-3-pro</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <span className="text-blue-400 mr-2">🌐</span>
                  {t('outputLanguageLabel')}
                </label>
                <select
                  value={selectedOutputLanguage}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
                >
                  <option value="中文（简体）">{t('languages.zh')}</option>
                  <option value="English">{t('languages.en')}</option>
                  <option value="日本語">{t('languages.ja')}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <Rows3 className="w-4 h-4 text-blue-500 mr-2" />
                  {t('paragraphCountLabel')}
                </label>
                <select
                  value={paragraphCountValue}
                  onChange={(e) => setParagraphCount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
                >
                  <option value="auto">{t('paragraphOptions.auto')}</option>
                  <option value="5">{t('paragraphOptions.five')}</option>
                  <option value="8">{t('paragraphOptions.eight')}</option>
                  <option value="10">{t('paragraphOptions.ten')}</option>
                  <option value="12">{t('paragraphOptions.twelve')}</option>
                  <option value="15">{t('paragraphOptions.fifteen')}</option>
                  <option value="custom">{t('paragraphOptions.custom')}</option>
                </select>
                {paragraphCountValue === 'custom' && (
                  <input
                    type="number"
                    min={MIN_SCENE_COUNT}
                    max={MAX_SCENE_COUNT}
                    value={customParagraphCount}
                    onChange={(e) => setCustomParagraphCount(e.target.value)}
                    placeholder={t('customParagraphPlaceholder', { min: MIN_SCENE_COUNT, max: MAX_SCENE_COUNT })}
                    className="w-full mt-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
                <p className="text-[10px] text-gray-400 mt-1">{t('paragraphHint')}</p>
              </div>

              <div className="space-y-1">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <span className="text-yellow-500 mr-2">🔲</span>
                  {t('panelsPerParagraphLabel')}
                </label>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                  <input
                    type="number"
                    min={1}
                    value={minPanelsPerParagraph}
                    onChange={(e) => {
                      const nextMin = e.target.value;
                      setMinPanelsPerParagraph(nextMin);
                      setPanelsPerParagraph(`${nextMin}~${maxPanelsPerParagraph}`);
                    }}
                    placeholder={t('panelsPerParagraphMinPlaceholder')}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-400">~</span>
                  <input
                    type="number"
                    min={1}
                    value={maxPanelsPerParagraph}
                    onChange={(e) => {
                      const nextMax = e.target.value;
                      setMaxPanelsPerParagraph(nextMax);
                      setPanelsPerParagraph(`${minPanelsPerParagraph}~${nextMax}`);
                    }}
                    placeholder={t('panelsPerParagraphMaxPlaceholder')}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{t('panelsPerParagraphHint')}</p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <span className="text-green-500 mr-2">🖼️</span>
                  {t('ratioLabel')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRatio('16:9')}
                    className={`flex flex-col items-center justify-center py-3 border rounded-lg transition-all ${
                      ratio === '16:9' ? 'border-gray-800 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-8 h-5 bg-gray-300 rounded-sm mb-2" />
                    <span className="text-xs font-medium text-gray-700">{t('ratioLandscape')}</span>
                  </button>
                  <button
                    onClick={() => setRatio('9:16')}
                    className={`flex flex-col items-center justify-center py-3 border rounded-lg transition-all ${
                      ratio === '9:16' ? 'border-gray-800 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-5 h-8 bg-gray-300 rounded-sm mb-2" />
                    <span className="text-xs font-medium text-gray-700">{t('ratioPortrait')}</span>
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{t('ratioHint')}</p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <span className="text-pink-400 mr-2">🎭</span>
                  {t('animeStyleLabel')}
                </label>
                <select
                  value={animeStyle}
                  onChange={(e) => setAnimeStyle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
                >
                  {animeStyleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {getAnimeStyleDisplayLabel(option)}
                    </option>
                  ))}
                </select>
                {animeStyle === 'custom' && (
                  <input
                    type="text"
                    value={customAnimeStyle}
                    onChange={(e) => setCustomAnimeStyle(e.target.value)}
                    placeholder={t('customAnimeStylePlaceholder')}
                    className="w-full mt-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <span className="text-orange-400 mr-2">✨</span>
                  {t('stylePreferenceLabel')}
                </label>
                <input
                  type="text"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder={t('stylePreferencePlaceholder')}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <span className="text-gray-400 mr-2">📷</span>
                  {t('referenceImagesLabel', { count: 3 })}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={SUPPORTED_REFERENCE_IMAGE_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-8 h-8 text-green-500 mb-2" />
                  <span className="text-sm text-gray-600 font-medium">{t('uploadReference')}</span>
                  <span className="text-[10px] text-gray-400 mt-1">{t('uploadReferenceHint', { count: 3 })}</span>
                </button>
                {referenceImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {referenceImages.map((image, index) => (
                      <div
                        key={`${image.slice(0, 20)}-${index}`}
                        className="relative rounded-lg overflow-hidden border border-gray-200"
                      >
                        <img
                          src={image}
                          alt={t('referenceImageAlt', { index: index + 1 })}
                          className="w-full h-20 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-gray-400">
                  {t('uploadedCount', { current: referenceImages.length, total: 3 })}
                </p>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            clearHistory();
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
          className="w-full py-3 border border-red-200 text-red-500 rounded-lg font-medium text-sm flex items-center justify-center hover:bg-red-50 transition-colors mt-8"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {t('clearHistory')}
        </button>
      </div>
    </aside>
  );
};
