import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { type AppLocale } from '@/i18n/routing';
import { useAppStore, type ScriptSegment } from '../../store';
import { getTextApiConfig } from '../../lib/textProviders.ts';
import { Sparkles, ChevronDown, ChevronUp, Image as ImageIcon, Rows3, Trash2, Globe, Palette, Monitor, Grid2x2, Pencil, PanelLeftClose } from 'lucide-react';
import {
  buildStoryOutputInstruction,
  extractStorySegmentTitle,
  generateContent,
  isInvalidStoryMetaBlock,
  sanitizeStorySegmentText,
  STORY_EXPERT_PROMPT,
  SUPPORTED_REFERENCE_IMAGE_ACCEPT,
  SUPPORTED_REFERENCE_IMAGE_MIME_TYPES,
} from '../../api/llm';
import { animeStyleOptions, getAnimeStylePrompt } from '../../lib/animeStyles';

const INSPIRATION_TEMPLATES: Record<
  AppLocale,
  Array<{
    label: string;
    emoji: string;
    animeStyle: string;
    style: string;
    story: string;
  }>
> = {
  zh: [
    {
      label: '赛博暗黑',
      emoji: '🌆',
      animeStyle: 'cyberpunk',
      style: '暗黑悬疑、雨夜霓虹、冷色调、高科技与低生活反差',
      story:
        '在一个被超级财阀垄断的未来城市中，拥有读取记忆芯片能力的落魄侦探，在暴雨夜接到了一桩寻找失踪AI歌姬的神秘委托。深入调查后，他发现歌姬的记忆芯片中隐藏着足以颠覆整座城市的禁忌真相...',
    },
    {
      label: '国风仙侠',
      emoji: '🏮',
      animeStyle: 'guofeng',
      style: '东方武侠、水墨留白、青竹剑影、孤舟江雪',
      story:
        '名剑山庄破落后，少年剑客带着父亲留下的残缺古剑孤身下山。在一间大雪纷飞的荒野客栈中，他偶遇女扮男装的神秘魔门少女，两人阴差阳错结伴而行，卷入一场波及九大门派的武林至宝争夺...',
    },
    {
      label: '青春治愈',
      emoji: '🌸',
      animeStyle: 'slice-of-life',
      style: '温暖日常、初夏微风、夕阳余晖、柔和漫射光',
      story:
        '高中毕业前夕的初夏午后，学校美术社仅剩两名成员。性格内敛的少女鼓起全部勇气，邀请从小一起长大的青梅竹马到放学后的天台，想在夕阳落山前为他画一张特别的毕业肖像，空气中弥漫着淡淡的栀子花香...',
    },
    {
      label: '奇幻热血',
      emoji: '⚔️',
      animeStyle: 'fantasy',
      style: '魔法史诗、宏大遗迹、神秘符文、灿烂魔力光芒',
      story:
        '皇家大图书馆的见习管理员在整理禁忌书库时，意外触碰了一本散发着蔚蓝星光的古老法典，转生到了魔力复苏的浮空大陆。在这里，他不仅能看懂失传的古神语，还成为了一只沉睡万年的幼年守护龙的唯一契约者...',
    },
  ],
  en: [
    {
      label: 'Cyberpunk',
      emoji: '🌆',
      animeStyle: 'cyberpunk',
      style: 'Dark noir, rainy neon streets, cool tones, gritty cyberpunk',
      story:
        'In a futuristic metropolis dominated by megacorporations, a washed-up detective with the illegal ability to read memory chips takes a mysterious case to find a missing AI idol on a rainy night, only to uncover a forbidden conspiracy that could bring down the city...',
    },
    {
      label: 'Ancient Wuxia',
      emoji: '🏮',
      animeStyle: 'guofeng',
      style: 'Traditional ink wash, bamboo forests, flowing robes, poetic martial arts',
      story:
        'After the fall of his renowned sword sect, a young swordsman ventures down the mountain with his late father’s broken blade. At a snow-covered wilderness inn, he encounters a mysterious disguised girl from a rival clan, pulling them into a battle for ancient martial treasures...',
    },
    {
      label: 'Slice of Life',
      emoji: '🌸',
      animeStyle: 'slice-of-life',
      style: 'Warm daylight, soft breeze, golden hour rooftop, gentle pastel tones',
      story:
        'On an early summer afternoon right before graduation, the quiet high school art club member gathers the courage to invite her childhood friend to the rooftop after school, wishing to paint a graduation portrait of him under the golden sunset...',
    },
    {
      label: 'Fantasy Epic',
      emoji: '⚔️',
      animeStyle: 'fantasy',
      style: 'High fantasy, glowing runes, floating isles, vibrant magical aura',
      story:
        'An apprentice royal archivist accidentally activates a glowing celestial grimoire in the forbidden archives, awakening on a floating continent where magic has just returned. Possessing forgotten ancient knowledge, he forms an accidental soul bond with a dormant dragon whelp...',
    },
  ],
  ja: [
    {
      label: 'サイバーパンク',
      emoji: '🌆',
      animeStyle: 'cyberpunk',
      style: 'ダークノワール、雨夜のネオン、冷色調、退廃的な近未来都市',
      story:
        '巨大企業に支配された近未来都市で、記憶チップを読み取る禁断の能力を持つうらぶれた探偵が、雨の夜に失踪したAI歌姫の捜索依頼を受ける。調査が進むにつれ、その記憶に都市全体を揺るがす重大な秘密が眠っていることを知る...',
    },
    {
      label: '中華古風',
      emoji: '🏮',
      animeStyle: 'guofeng',
      style: '東洋水墨画風、竹林と剣戟、雪の宿場町、詩情あふれる武侠',
      story:
        '名門の剣術道場が没落した後、父の形見の折れた古剣を背負った少年剣士が山を下りる。吹雪の荒野の宿場で男装した謎の魔門の少女と出会い、武林の至宝をめぐる争いに巻き込まれていく...',
    },
    {
      label: '日常・青春',
      emoji: '🌸',
      animeStyle: 'slice-of-life',
      style: '初夏の爽やかな光、夕焼けの屋上、柔らかな色彩、甘酸っぱい青春',
      story:
        '高校卒業を間近に控えた初夏の放課後、美術部の少女は小さな勇気を振り絞り、幼馴染の少年を夕暮れの屋上に誘う。沈みゆく夕日の中で、彼への特別な卒業記念の肖像画を描き始める...',
    },
    {
      label: '異世界ファンタジー',
      emoji: '⚔️',
      animeStyle: 'fantasy',
      style: '壮大な魔法世界、古代ルーン文字、浮遊大陸、神秘的な輝き',
      story:
        '王立図書館の見習い司書が禁断の書庫で青い光を放つ古文書に触れ、魔力が蘇りつつある浮空大陸へと転移してしまう。失われた神聖文字を唯一解読できる彼は、数万年の眠りから目覚めた幼き守護竜と契約を結ぶ...',
    },
  ],
};

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
    isSidebarCollapsed,
    toggleSidebar,
    apiKey,
    openApiSettings,
    storyInput,
    setStoryInput,
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
    setCharacterPortraits,
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
      acceptedFiles.forEach((file) => {
        if (!isSupportedReferenceImageFile(file)) throw new Error(t('alerts.onlyImageFiles'));
      });
      const imageDataUrls = await Promise.all(acceptedFiles.map((file) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error(t('alerts.uploadFailed')));
        };
        reader.onerror = () => reject(new Error(t('alerts.uploadFailed')));
        reader.readAsDataURL(file);
      })));
      setReferenceImages([...referenceImages, ...imageDataUrls]);
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
    if (!getTextApiConfig(useAppStore.getState()).hasApiKey) {
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
    setCharacterPortraits({});
    setGeneratedComics({});
    setPendingComicId(null);

    try {
      const prompt = `
      用户的要求和说明：
      ${storyInput}

      【动漫风格】${getAnimeStylePrompt(animeStyle, customAnimeStyle)}
      ${style ? `【风格偏好】${style}` : ''}
      ${buildStoryOutputInstruction(selectedOutputLanguage)}
      【漫画比例】后续漫画页面和角色设定图请使用 ${ratio} 比例生成。
      ${paragraphPrompt}
      【画面格子数】请控制每段生成的漫画包含的格子数在 ${normalizedPanelsPerParagraph} 个左右。
      `;

      const result = await generateContent(apiKey, prompt, STORY_EXPERT_PROMPT);
      let parsedScript = parseScriptSegments(result, getDefaultTitle);

      if (!parsedScript.length) {
        const repairedResult = await generateContent(
          apiKey,
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
    <aside
      className={`relative flex-shrink-0 border-gray-200 bg-white h-full flex flex-col transition-all duration-300 ease-in-out ${
        isSidebarCollapsed
          ? 'w-0 border-r-0 overflow-hidden opacity-0 pointer-events-none'
          : 'w-[360px] border-r overflow-y-auto opacity-100'
      }`}
    >
      <div className="p-4 space-y-4 min-w-[360px]">
        <div className="flex items-center justify-between">
          <label className="flex items-center text-xs font-semibold text-gray-700">
            <Pencil className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            {t('storyDescription')}
          </label>
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title={t('collapseSidebar')}
            aria-label={t('collapseSidebar')}
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span className="flex items-center font-medium">
              <Sparkles className="w-3 h-3 text-indigo-500 mr-1" />
              {t('templatesLabel')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(INSPIRATION_TEMPLATES[locale] || INSPIRATION_TEMPLATES.zh).map((tmpl) => (
              <button
                key={tmpl.label}
                type="button"
                onClick={() => {
                  setStoryInput(tmpl.story);
                  setAnimeStyle(tmpl.animeStyle);
                  setStyle(tmpl.style);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-50 hover:bg-indigo-50/70 border border-gray-200/80 hover:border-indigo-300 text-gray-700 hover:text-indigo-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                title={`${tmpl.label} - ${tmpl.style}`}
              >
                <span className="text-sm">{tmpl.emoji}</span>
                <span className="truncate">{tmpl.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
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
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 text-sm resize-none overflow-y-auto"
          />
        </div>

        <button
          onClick={handleGenerateStory}
          disabled={isGeneratingStory}
          className={`w-full py-3 rounded-lg font-bold flex items-center justify-center transition-colors ${
            isGeneratingStory
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-300 mr-2" />
          {isGeneratingStory ? t('generatingStory') : t('generateStory')}
        </button>

        <div className="border border-gray-200 rounded-md overflow-hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full bg-gray-50 px-3 py-2.5 flex justify-between items-center text-xs text-gray-600 font-medium"
          >
            <span>{t('advancedOptions')}</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
          </button>

          {showAdvanced && (
            <div className="p-4 space-y-4 border-t border-gray-200">
              <div className="space-y-1">
                <label className="flex items-center text-xs font-medium text-gray-500">
                  <Globe className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
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
                <label className="flex items-center text-xs font-medium text-gray-500">
                  <Rows3 className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
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
                    className="w-full mt-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                )}
                <p className="text-[10px] text-gray-400 mt-1">{t('paragraphHint')}</p>
              </div>

              <div className="space-y-1">
                <label className="flex items-center text-xs font-medium text-gray-500">
                  <Grid2x2 className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
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
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
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
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{t('panelsPerParagraphHint')}</p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-xs font-medium text-gray-500">
                  <Monitor className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                  {t('ratioLabel')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRatio('16:9')}
                    className={`flex flex-col items-center justify-center py-3 border rounded-lg transition-all ${
                      ratio === '16:9' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-8 h-5 bg-gray-300 rounded-sm mb-2" />
                    <span className="text-xs font-medium text-gray-700">{t('ratioLandscape')}</span>
                  </button>
                  <button
                    onClick={() => setRatio('9:16')}
                    className={`flex flex-col items-center justify-center py-3 border rounded-lg transition-all ${
                      ratio === '9:16' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-5 h-8 bg-gray-300 rounded-sm mb-2" />
                    <span className="text-xs font-medium text-gray-700">{t('ratioPortrait')}</span>
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{t('ratioHint')}</p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-xs font-medium text-gray-500">
                  <Palette className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
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
                    className="w-full mt-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="flex items-center text-xs font-medium text-gray-500">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                  {t('stylePreferenceLabel')}
                </label>
                <input
                  type="text"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder={t('stylePreferencePlaceholder')}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-xs font-medium text-gray-500">
                  <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
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
                  <ImageIcon className="w-8 h-8 text-indigo-400 mb-2" />
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
            if (!window.confirm(t('clearHistoryConfirm'))) return;
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
