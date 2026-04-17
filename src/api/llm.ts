/*
 * @Author: wenguoliang
 * @Date: 2026-03-29 16:26:36
 * @FilePath: /huiman-ark/src/api/llm.ts
 * @Description: Do not edit
 */
export const STORY_EXPERT_PROMPT = `你是一个专业的多格漫画故事脚本创作专家。用户会给你一个动漫故事描述和要求，你需要生成一个完整的多格漫画故事脚本大纲。

重要说明：
- 严格遵循用户提供的动漫风格、输出语言和漫画比例
- 生成故事段落大纲，每个段落制作成一页多格漫画（3-6个分格）
- 包含：场景描述、角色动作、情节发展、氛围营造
- 用 <scene> 标签分割每个段落
- 如果用户信息不完整，你必须自行补全最合理的默认设定，并保持全篇一致
- 不允许向用户追问补充信息，不允许输出"如果需要我继续完善""请告诉我""是否加入"等说明性文字
- 不允许输出备注、解释、创作建议、尾注、总结或任何段落外文本
- 每个段落都必须是可直接用于生成漫画的一页分镜内容
- 每条对白/独白/旁白只能在唯一一个"第N格"中出现一次，禁止在"画面描述"和多个"第N格"里重复列出同一句台词

输出格式示例：
[开场段落]
场景：江南小镇外的乌篷船与水巷...
情节概述：在水墨般的清冷晨色中...
画面描述：雨滴从檐角落下...
本段落漫画分格建议：
- 第1格：远景...
<scene>

请只输出符合上述格式的故事段落，不要输出任何额外文字。`;

export const CHARACTER_DESIGNER_PROMPT = `你是一个专业的动漫角色设计师。根据下面的动漫故事描述和分镜大纲，请提取出所有出现的角色信息，并创建一个详细的角色设定说明。

输出格式示例：
【角色名称】沈砚秋  
【外貌】约18-20岁少女；身高约163cm...
【服装】青衣古装为主...
【性格】冷静自持...
【定位】女主与“莲印”持有者...
<character>

重要说明：
- 严格遵循用户提供的动漫风格、输出语言和画面比例
- 角色设定必须服务于后续角色设定图和漫画页生成，保持可视化一致性
- 字段标签必须固定使用：【角色名称】【外貌】【服装】【性格】【定位】，可选补充【镜头站位要点】，不要翻译这些标签
- 标签后的具体内容使用用户要求的输出语言填写
- 直接输出角色设定，不要添加额外解释`;

import { appConfig } from '@/config/app';
import type { ScriptSegment } from '../store';

const API_ENDPOINTS = {
  geminiImage: `${appConfig.apiBaseUrl}/v1beta/models/gemini-3-pro-image-preview:generateContent`,
  chatCompletions: `${appConfig.apiBaseUrl}/v1/chat/completions`,
} as const;

type AspectRatio = '16:9' | '9:16';

export const SUPPORTED_REFERENCE_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;
export const SUPPORTED_REFERENCE_IMAGE_ACCEPT =
  '.png,.jpg,.jpeg,.webp,.heic,.heif,image/png,image/jpeg,image/webp,image/heic,image/heif';

interface GenerateImageOptions {
  referenceImages?: string[];
  aspectRatio?: AspectRatio;
  timeoutMs?: number;
  referenceInstruction?: string;
  referenceLabels?: string[];
}

interface GeminiPart {
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
}

const DATA_URL_PATTERN = /^data:(.*?);base64,(.*)$/;
const HTTP_URL_PATTERN = /^https?:\/\//i;
const SUPPORTED_REFERENCE_IMAGE_MIME_TYPE_SET = new Set<string>(SUPPORTED_REFERENCE_IMAGE_MIME_TYPES);
const SUPPORTED_REFERENCE_IMAGE_FORMATS_LABEL = 'PNG、JPG/JPEG、WEBP、HEIC、HEIF';
const CHARACTER_BLOCK_SPLIT_PATTERN =
  /\n\s*\n(?=(?:【角色名称】|【角色名】|\[(?:Character Name|Character|キャラクター名)\]|(?:Character Name|Character|キャラクター名)\s*[:：]))/i;
const CHARACTER_NAME_PATTERNS = [
  /【角色名称】\s*([^\n\r]+)/,
  /【角色名】\s*([^\n\r]+)/,
  /\[(?:Character Name|Character|キャラクター名)\]\s*([^\n\r]+)/i,
  /(?:Character Name|Character|キャラクター名)\s*[:：]\s*([^\n\r]+)/i,
];
const CHARACTER_APPEARANCE_PATTERNS = [
  /【外貌】\s*([\s\S]*?)(?=\n(?:【|\[|Appearance\s*[:：]|Looks\s*[:：]|外見\s*[:：]|$))/i,
  /\[(?:Appearance|Looks|外見)\]\s*([\s\S]*?)(?=\n(?:【|\[|Outfit\s*[:：]|Costume\s*[:：]|服装\s*[:：]|$))/i,
  /(?:Appearance|Looks|外見)\s*[:：]\s*([\s\S]*?)(?=\n(?:【|\[|Outfit\s*[:：]|Costume\s*[:：]|服装\s*[:：]|$))/i,
];
const CHARACTER_OUTFIT_PATTERNS = [
  /【服装】\s*([\s\S]*?)(?=\n(?:【|\[|Personality\s*[:：]|Traits\s*[:：]|性格\s*[:：]|$))/i,
  /\[(?:Outfit|Costume|服装)\]\s*([\s\S]*?)(?=\n(?:【|\[|Personality\s*[:：]|Traits\s*[:：]|性格\s*[:：]|$))/i,
  /(?:Outfit|Costume|服装)\s*[:：]\s*([\s\S]*?)(?=\n(?:【|\[|Personality\s*[:：]|Traits\s*[:：]|性格\s*[:：]|$))/i,
];
const CHARACTER_PERSONALITY_PATTERNS = [
  /【性格】\s*([\s\S]*?)(?=\n(?:【|\[|Role\s*[:：]|定位\s*[:：]|役割\s*[:：]|$))/i,
  /\[(?:Personality|Traits|性格)\]\s*([\s\S]*?)(?=\n(?:【|\[|Role\s*[:：]|定位\s*[:：]|役割\s*[:：]|$))/i,
  /(?:Personality|Traits|性格)\s*[:：]\s*([\s\S]*?)(?=\n(?:【|\[|Role\s*[:：]|定位\s*[:：]|役割\s*[:：]|$))/i,
];
const CHARACTER_ROLE_PATTERNS = [
  /【定位】\s*([\s\S]*?)(?=\n(?:【|\[|Shot Blocking\s*[:：]|Staging\s*[:：]|镜头站位要点\s*[:：]|$))/i,
  /\[(?:Role|Positioning|役割|定位)\]\s*([\s\S]*?)(?=\n(?:【|\[|Shot Blocking\s*[:：]|Staging\s*[:：]|镜头站位要点\s*[:：]|$))/i,
  /(?:Role|Positioning|役割|定位)\s*[:：]\s*([\s\S]*?)(?=\n(?:【|\[|Shot Blocking\s*[:：]|Staging\s*[:：]|镜头站位要点\s*[:：]|$))/i,
];
const CHARACTER_STAGING_PATTERNS = [
  /【(?:镜头\/?9:16站位要点|镜头站位要点|站位要点|镜头要点)】\s*([\s\S]*?)(?=\n(?:【|\[|$))/i,
  /\[(?:Shot Blocking|Staging|Composition Notes|鏡頭配置|立ち位置)\]\s*([\s\S]*?)(?=\n(?:【|\[|$))/i,
  /(?:Shot Blocking|Staging|Composition Notes|鏡頭配置|立ち位置)\s*[:：]\s*([\s\S]*?)(?=\n(?:【|\[|$))/i,
];
const STORY_META_PATTERNS = [
  /(?:如果|如需|若需|如果你希望|如果需要).{0,40}(?:继续完善|继续补充|继续细化|继续优化)/i,
  /请告诉我.{0,80}(?:主角人数|年龄段|宠物|猫\/狗\/无|学生\/社畜\/自由职业)/i,
  /我可以在保持.{0,80}(?:前提|基础)/i,
  /(?:是否加入|要不要加入).{0,40}(?:宠物|猫|狗)/i,
  /(?:需要|缺少).{0,20}(?:更多信息|补充信息)/i,
];
const STORY_SEGMENT_TITLE_PATTERN = /^\s*(?:\[|【)[^\]\n】]+(?:\]|】)\s*\n?/;
const STORY_SEGMENT_META_PREFIX_PATTERN = /^(?:\s*(?:\[|【)[^\]\n】]+(?:\]|】)\s*)+/;
const STORY_SCENE_LABEL_PATTERN = '(?:场景|Scene|シーン|場面)';
const STORY_PLOT_LABEL_PATTERN = '(?:情节概述|剧情|Plot|あらすじ|プロット)';
const STORY_VISUAL_LABEL_PATTERN = '(?:画面描述|分镜描述|Visual|画面描写|ビジュアル)';
const STORY_SCENE_START_PATTERN = new RegExp(`(?:^|\\n)\\s*${STORY_SCENE_LABEL_PATTERN}[:：]`, 'i');

const normalizeLanguageLabel = (language: string) => {
  if (language.includes('English')) return 'English';
  if (language.includes('日本語')) return '日本語';
  return '中文（简体）';
};

export const buildStoryOutputInstruction = (language: string) => {
  const languageLabel = normalizeLanguageLabel(language);

  if (languageLabel === '日本語') {
    return `【输出语言】段落内容、情节描述、画面描述、分格建议、对白、旁白、拟声词全部必须使用日本語。即使用户输入是中文，你也必须输出日文。为了兼容系统解析，请保留这些结构标签本身：标题用 [标题]，字段名固定使用“场景：”“情节概述：”“画面描述：”“本段落漫画分格建议：”，不要把这些字段名翻译成日文。`;
  }

  if (languageLabel === 'English') {
    return '【输出语言】段落内容、情节描述、画面描述、分格建议、对白、旁白、拟声词全部必须使用 English。即使用户输入是中文，你也必须输出英文。为了兼容系统解析，请保留这些结构标签本身：标题用 [Title] 或 [标题]，字段名固定使用“场景：”“情节概述：”“画面描述：”“本段落漫画分格建议：”或对应的英文标签。';
  }

  return '【输出语言】请使用中文（简体）编写所有段落内容、对白、旁白和拟声词。';
};

export const buildCharacterDesignReferenceInstruction = (referenceImagesCount: number) => {
  if (!referenceImagesCount) {
    return '';
  }

  return `接下来会提供 ${referenceImagesCount} 张用户上传的参考图。这些图片是本次角色设定图的高优先级视觉锚点，请优先贴近它们的线条风格、上色方式、明暗关系、服装质感、五官刻画、镜头审美与整体氛围；若角色身份与参考图不完全一致，以角色设定文本为准，但最终画风和视觉完成度必须尽量接近参考图。`;
};

export const buildCharacterDesignReferenceLabels = (referenceImagesCount: number) =>
  Array.from(
    { length: referenceImagesCount },
    (_, index) =>
      `参考图 ${
        index + 1
      }：这是用户上传的角色/风格参考图。请优先对齐其中的人物脸型、发型、服装层次、配色、材质、线条和光影氛围，不要把它当成可忽略的示意图。`,
  );

export const buildComicReferenceInstruction = ({
  characterReferenceMode,
  referenceImagesCount,
}: {
  characterReferenceMode: CharacterReferenceMode;
  referenceImagesCount: number;
}) => {
  if (characterReferenceMode === 'portraits') {
    return `接下来会提供 ${referenceImagesCount} 张单人角色参考图（每张对应一个角色，参考图标签含角色姓名）。请先严格按每张图的标签识别对应角色，逐一重建其外观特征，确保在后续所有分格中该角色的脸型、眼型、发型、服装和配色严格一致，不要跨角色混用外观。`;
  }

  if (characterReferenceMode === 'sheet') {
    return '接下来会提供 1 张角色设定图（Character Design Sheet），图中包含多个角色并排展示，每个角色旁边标有名称。请先仔细辨认图中每个角色的独立区域，逐一锁定其五官轮廓、发型发色、服装款式与层次、主配色、体态比例和年龄感，再进入剧情分镜。生成漫画时，每当绘制某角色，必须回溯到设定图中该角色的对应区域进行视觉比对，确保脸型、眼型、发型、服装和配色严格一致，除非剧情明确要求换装或变化，否则不要改造角色外观。';
  }

  if (characterReferenceMode === 'user' && referenceImagesCount) {
    return `接下来会提供 ${referenceImagesCount} 张用户上传的参考图。这些图片是当前漫画页的高优先级视觉锚点；在不违背当前段落剧情的前提下，请尽量贴近其中的人物外形、服装配色、场景材质、构图关系、镜头角度、景别切换、线条笔触和光影氛围。`;
  }

  return '';
};

const parseDataUrl = (value: string) => {
  const match = value.match(DATA_URL_PATTERN);
  if (!match) {
    throw new Error('参考图片格式无效，请重新上传');
  }

  const mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
  if (!SUPPORTED_REFERENCE_IMAGE_MIME_TYPE_SET.has(mimeType)) {
    throw new Error(`参考图片仅支持 ${SUPPORTED_REFERENCE_IMAGE_FORMATS_LABEL} 格式`);
  }

  return {
    mimeType,
    base64: match[2],
  };
};

const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('参考图片读取失败，请稍后重试'));
    reader.readAsDataURL(blob);
  });

const convertRemoteImageToDataUrl = async (url: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`参考图片下载失败：${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    return readBlobAsDataUrl(blob);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('参考图片下载失败，请稍后重试');
  }
};

const extractResponseMessage = (rawText: string) => {
  if (!rawText.trim()) {
    return '';
  }

  try {
    const data = JSON.parse(rawText);
    return data?.error?.message || data?.message || '';
  } catch {
    return rawText.trim();
  }
};

const extractImageDataUrl = async (data: GeminiResponse) => {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    if (part?.inlineData?.mimeType && part?.inlineData?.data) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  for (const part of parts) {
    if (typeof part?.text === 'string' && HTTP_URL_PATTERN.test(part.text.trim())) {
      return convertRemoteImageToDataUrl(part.text.trim());
    }
  }

  throw new Error('未从 Gemini 返回中解析到图片');
};

const buildFriendlyError = async (response: Response) => {
  const fallbackMessage = `请求失败：${response.status} ${response.statusText}`;
  const rawText = await response.text().catch(() => '');
  const message = extractResponseMessage(rawText) || fallbackMessage;

  if (response.status === 400) {
    return `Gemini 生图请求被拒绝：${message}`;
  }

  return message;
};

export const extractCharacterNames = (characterText: string) => {
  const sanitized = sanitizeCharacterDesignText(characterText);
  const names = CHARACTER_NAME_PATTERNS.flatMap((pattern) =>
    Array.from(
      sanitized.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)),
    ).map((match) => match[1].trim()),
  );
  return Array.from(new Set(names)).filter(Boolean);
};

export interface CharacterProfile {
  name: string;
  appearance: string;
  outfit: string;
  personality: string;
  role: string;
  staging: string;
  raw: string;
}

export const sanitizeCharacterDesignText = (characterText: string) =>
  characterText
    .replace(/\s*<character>\s*/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const sanitizeStorySegmentText = (raw: string) => {
  const normalized = raw.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return '';
  }

  const sceneStartIndex = normalized.search(STORY_SCENE_START_PATTERN);
  if (sceneStartIndex >= 0) {
    return normalized.slice(sceneStartIndex).trim();
  }

  return normalized.replace(STORY_SEGMENT_META_PREFIX_PATTERN, '').trim();
};

const DIALOGUE_QUOTE_PATTERNS: RegExp[] = [
  /"([^"]+)"/gu,
  /\u201C([^\u201D]+)\u201D/gu,
  /『([^』]+)』/gu,
  /「([^」]+)」/gu,
  /'([^']+)'/gu,
];

const normalizeDialogue = (s: string): string =>
  s.trim().normalize('NFKC').replace(/\s+/g, '').toLowerCase();

const extractAllDialogues = (line: string): { match: string; fullMatch: string; index: number }[] => {
  const results: { match: string; fullMatch: string; index: number }[] = [];
  const seenLocal = new Set<string>();
  for (const regex of DIALOGUE_QUOTE_PATTERNS) {
    for (const m of line.matchAll(regex)) {
      if (!m[1]) continue;
      const localKey = `${m.index}:${m[0]}`;
      if (seenLocal.has(localKey)) continue;
      seenLocal.add(localKey);
      results.push({ match: m[1], fullMatch: m[0], index: m.index ?? 0 });
    }
  }
  results.sort((a, b) => b.index - a.index);
  return results;
};

const deduplicateDialogues = (text: string): string => {
  const lines = text.split('\n');
  const seenDialogues = new Set<string>();

  const deduplicatedLines = lines.map((line) => {
    const dialogues = extractAllDialogues(line);
    if (dialogues.length === 0) return line;

    let transformed = line;
    for (const { match, fullMatch, index } of dialogues) {
      const key = normalizeDialogue(match);
      if (seenDialogues.has(key)) {
        transformed = transformed.slice(0, index) + transformed.slice(index + fullMatch.length);
      } else {
        seenDialogues.add(key);
      }
    }
    return transformed.trim();
  });

  return deduplicatedLines.filter((l) => l.length > 0).join('\n');
};

export const extractStorySegmentTitle = (raw: string) => {
  const match = raw.trim().match(STORY_SEGMENT_TITLE_PATTERN);
  return match?.[0].replace(/^(?:\s|\[|【)+|(?:\s|\]|】)+$/g, '').trim() || '';
};

export const isInvalidStoryMetaBlock = (raw: string) => {
  const text = sanitizeStorySegmentText(raw);
  if (!text) {
    return true;
  }

  if (STORY_META_PATTERNS.some((pattern) => pattern.test(text))) {
    return true;
  }

  const hasStructuredContent =
    new RegExp(`${STORY_SCENE_LABEL_PATTERN}[:：]`, 'i').test(text) ||
    new RegExp(`${STORY_PLOT_LABEL_PATTERN}[:：]`, 'i').test(text) ||
    new RegExp(`${STORY_VISUAL_LABEL_PATTERN}[:：]`, 'i').test(text);

  return !hasStructuredContent && /(?:请告诉我|继续完善|补充信息|更多信息|是否加入)/i.test(text);
};

const extractFieldValue = (block: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return '';
};

export const parseCharacterProfiles = (characterText: string): CharacterProfile[] => {
  const sanitized = sanitizeCharacterDesignText(characterText);
  if (!sanitized) {
    return [];
  }

  const blocks = sanitized
    .split(CHARACTER_BLOCK_SPLIT_PATTERN)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) => ({
    name:
      extractFieldValue(block, CHARACTER_NAME_PATTERNS) ||
      extractFieldValue(block, [/^\[?([^\]\n]+)\]?/]) ||
      `角色 ${index + 1}`,
    appearance: extractFieldValue(block, CHARACTER_APPEARANCE_PATTERNS),
    outfit: extractFieldValue(block, CHARACTER_OUTFIT_PATTERNS),
    personality: extractFieldValue(block, CHARACTER_PERSONALITY_PATTERNS),
    role: extractFieldValue(block, CHARACTER_ROLE_PATTERNS),
    staging: extractFieldValue(block, CHARACTER_STAGING_PATTERNS),
    raw: block,
  }));
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isCJKName = (name: string) => /[\u4e00-\u9fff]/.test(name);

const nameMatchesSegment = (name: string, context: string): boolean => {
  const safeName = escapeRegExp(name);
  if (isCJKName(name)) {
    return new RegExp(safeName, 'i').test(context);
  }
  return new RegExp(`\\b${safeName}\\b`, 'i').test(context);
};

const stripMatchedName = (name: string, context: string): string => {
  const safeName = escapeRegExp(name);
  if (isCJKName(name)) {
    return context.replace(new RegExp(safeName, 'gi'), '');
  }
  return context.replace(new RegExp(`\\b${safeName}\\b`, 'gi'), '');
};

export interface MatchedCharacterProfile {
  profile: CharacterProfile;
  originalIndex: number;
}

export const pickComicCharacterProfiles = ({
  characterDesign,
  cleanedSegmentRaw,
  scene,
  plot,
  desc,
  characterNames,
}: {
  characterDesign: string | null;
  cleanedSegmentRaw: string;
  scene: string;
  plot: string;
  desc: string;
  characterNames: string[];
}): MatchedCharacterProfile[] => {
  const sanitized = sanitizeCharacterDesignText(characterDesign || '');
  if (!sanitized) {
    return [];
  }

  const profiles = parseCharacterProfiles(sanitized);
  if (!profiles.length) {
    return [];
  }

  const segmentContext = [cleanedSegmentRaw, scene, plot, desc].filter(Boolean).join('\n');

  const allNames = [...characterNames, ...profiles.map((p) => p.name)]
    .map((n) => n.trim())
    .filter(Boolean);

  const uniqueByName = allNames.reduce<{ name: string; profile: CharacterProfile; originalIndex: number }[]>((acc, name) => {
    const idx = profiles.findIndex((p) => p.name === name);
    const profile = profiles[idx];
    if (profile && !acc.some((a) => a.name === name)) {
      acc.push({ name, profile, originalIndex: idx });
    }
    return acc;
  }, []);

  uniqueByName.sort((a, b) => b.name.length - a.name.length);

  const matched: MatchedCharacterProfile[] = [];
  let remainingContext = segmentContext;

  for (const { name, profile, originalIndex } of uniqueByName) {
    if (nameMatchesSegment(name, remainingContext)) {
      matched.push({ profile, originalIndex });
      remainingContext = stripMatchedName(name, remainingContext);
    }
  }

  if (matched.length) {
    return matched;
  }
  return profiles.slice(0, Math.min(profiles.length, 3)).map((profile) => ({
    profile,
    originalIndex: profiles.indexOf(profile),
  }));
};

export const buildCharacterPortraitPrompt = ({
  profile,
  language,
  animeStyle,
  style,
  hasSheet,
}: {
  profile: CharacterProfile;
  language: string;
  animeStyle: string;
  style: string;
  hasSheet: boolean;
}): string => {
  const languageLabel = normalizeLanguageLabel(language);
  const styleText = style || '国风古韵、水墨质感、精致二次元角色设计';
  const truncatedName = profile.name.length > 40 ? profile.name.slice(0, 40) : profile.name;
  const sheetHint = hasSheet
    ? '参考角色设定图中该角色的区域，精确还原其五官轮廓、发型发色、瞳色、服装款式与层次、主配色、体态和年龄感。仅提取该角色一人，不要绘制其他角色。'
    : `仅根据以下角色描述绘制 ${truncatedName} 一人，不要绘制其他角色。`;

  return `请生成一张单人角色立绘。

【画面比例】9:16（硬编码，不可更改）
【动漫风格】${animeStyle}
【风格偏好】${styleText}
【语言要求】所有文字使用 ${languageLabel}
【背景要求】纯色或极简背景，禁止绘制文字、logo、装饰元素
【重要限制】只绘制角色本人，不要添加任何其他人物

${sheetHint}

角色设定：
姓名：${truncatedName}
${profile.appearance ? `外貌：${profile.appearance}` : ''}
${profile.outfit ? `服装：${profile.outfit}` : ''}
${profile.personality ? `性格：${profile.personality}` : ''}
${profile.role ? `定位：${profile.role}` : ''}
${profile.staging ? `站位要点：${profile.staging}` : ''}

要求：正面或3/4视角，单人全身立绘，保持角色特征一致性。不要添加任何文字说明。`;
};

interface GenerateCharacterPortraitsResult {
  portraits: Record<string, string>;
  failures: string[];
}

export const generateCharacterPortraits = async (
  apiKey: string,
  {
    characterText,
    language,
    animeStyle,
    style,
    sheetImage,
    referenceImages = [],
    targetProfiles,
  }: {
    characterText: string;
    language: string;
    animeStyle: string;
    style: string;
    sheetImage: string | null;
    referenceImages?: string[];
    targetProfiles?: MatchedCharacterProfile[];
  },
): Promise<GenerateCharacterPortraitsResult> => {
  const profiles = parseCharacterProfiles(characterText);
  if (!profiles.length) {
    return { portraits: {}, failures: ['未找到角色设定文本'] };
  }

  const profilesToGenerate = targetProfiles
    ? targetProfiles
    : profiles.map((profile, i) => ({ profile, originalIndex: i }));

  const portraits: Record<string, string> = {};
  const failures: string[] = [];
  const allRefImages = sheetImage ? [sheetImage, ...referenceImages] : referenceImages;

  for (let i = 0; i < profilesToGenerate.length; i++) {
    const { profile, originalIndex } = profilesToGenerate[i];
    const key = `${profile.name}#${originalIndex}`;

    try {
      const prompt = buildCharacterPortraitPrompt({
        profile,
        language,
        animeStyle,
        style,
        hasSheet: Boolean(sheetImage),
      });

      const image = await generateImage(apiKey, prompt, {
        referenceImages: allRefImages,
        aspectRatio: '9:16',
        referenceInstruction: sheetImage
          ? `这是角色设定总图（首张参考图）。请在总图中找到"${profile.name.length > 40 ? profile.name.slice(0, 40) : profile.name}"的角色区域，严格按照该区域的外观（面部特征、发型发色、服装款式与配色）来绘制这张单人立绘。只提取该角色一人，不要混入其他角色。`
          : undefined,
        referenceLabels: sheetImage
          ? [`仅提取角色设定总图中"${profile.name.length > 40 ? profile.name.slice(0, 40) : profile.name}"的角色区域用于参考`, ...Array(allRefImages.length - 1).fill('')]
          : [],
      });

      portraits[key] = image;
    } catch {
      failures.push(`${profile.name}（${i + 1}）`);
    }
  }

  return { portraits, failures };
};

const buildComicCharacterAnchorText = ({
  characterDesign,
  cleanedSegmentRaw,
  scene,
  plot,
  desc,
  characterNames,
}: {
  characterDesign: string | null;
  cleanedSegmentRaw: string;
  scene: string;
  plot: string;
  desc: string;
  characterNames: string[];
}) => {
  const matchedProfiles = pickComicCharacterProfiles({
    characterDesign,
    cleanedSegmentRaw,
    scene,
    plot,
    desc,
    characterNames,
  });

  if (!matchedProfiles.length) {
    return characterDesign || '请根据段落内容自行归纳出现角色，并确保各格保持一致';
  }

  return matchedProfiles.map((matched) => matched.profile.raw).join('\n\n');
};

export const buildCharacterDesignImagePrompt = ({
  storyInput,
  characterText,
  characterCount,
  language,
  aspectRatio,
  animeStyle,
  style,
  referenceImagesCount,
}: {
  storyInput: string;
  characterText: string;
  characterCount: number;
  language: string;
  aspectRatio: AspectRatio;
  animeStyle: string;
  style: string;
  referenceImagesCount: number;
}) => {
  const languageLabel = normalizeLanguageLabel(language);
  const layoutHint =
    aspectRatio === '9:16'
      ? '竖版角色设定排版，上下分层展示角色，保证每个角色完整入镜'
      : '横版角色设定排版，左右舒展展示角色，保证每个角色有充足留白';
  const styleText = style || '国风古韵、水墨质感、精致二次元角色设计';
  const referenceText = referenceImagesCount
    ? `我在文本前提供了 ${referenceImagesCount} 张参考图，它们是本次角色设定图的高优先级视觉依据，请尽量贴近这些参考图的画风、线条、配色、材质、光影和完成度，但角色身份和造型仍以角色设定文本为准；若参考图里含有水印、平台标识、logo、签名、页码或边角文字，一律忽略，不要继承到输出图中。`
    : '没有额外参考图时，请保持统一的国风动漫角色设计风格。';

  return `请生成一张高质量的动漫角色设定图（Character Design Sheet）。

${referenceText}

【语言要求】画面中的角色名称与标注全部使用 ${languageLabel}。
【画面比例】${aspectRatio}
【动漫风格】${animeStyle}
【风格偏好】${styleText}

用户故事背景：
${storyInput}

角色设定文本：
${characterText}

设计要求：
1. 需要在一张图内完整展示主要角色，共约 ${Math.max(characterCount, 2)} 人
2. ${layoutHint}
3. 每个角色都展示完整造型、服饰、配色、发型和身材比例
4. 每个角色旁边或下方清晰标注角色名称
5. 整体风格统一，适合作为后续漫画分镜的标准参考图
6. 背景简洁，不要喧宾夺主
7. 服装、配饰、发丝、眼睛都要有细节
8. 保持国风动漫美术质感，画面精致，人物辨识度高
9. 除角色名称标签外，不要出现任何额外文字、字母、数字、印章、签名、平台标识、水印、logo、页码或角标
10. 严禁在画面任何位置（尤其是四个角落、底部边缘、右下角）添加角落装饰字样、站点名、伪水印、品牌标志或任何装饰性标记，必须保持画面干净

请直接输出一张角色设定参考图，不要额外解释。`;
};

export const generateCharacterAssets = async ({
  apiKey,
  model,
  storyInput,
  generatedScript,
  language,
  aspectRatio,
  animeStyle,
  style,
  referenceImages,
  existingCharacterText,
}: {
  apiKey: string;
  model: string;
  storyInput: string;
  generatedScript: ScriptSegment[];
  language: string;
  aspectRatio: AspectRatio;
  animeStyle: string;
  style: string;
  referenceImages: string[];
  existingCharacterText?: string | null;
}) => {
  const characterText =
    sanitizeCharacterDesignText(existingCharacterText || '') ||
    sanitizeCharacterDesignText(
      await generateContent(
        apiKey,
        model,
        `
用户的故事描述：
${storyInput}

【动漫风格】${animeStyle}
${style ? `【风格偏好】${style}` : ''}
【输出语言】请使用 ${language} 输出所有角色设定文本。
【漫画比例】后续角色设定图和漫画页请使用 ${aspectRatio}。

完整分镜大纲：
${generatedScript.map((segment) => segment.raw).join('\n\n<scene>\n\n')}
`,
        CHARACTER_DESIGNER_PROMPT,
      ),
    );
  const characterNames = extractCharacterNames(characterText);
  const characterImagePrompt = buildCharacterDesignImagePrompt({
    storyInput,
    characterText,
    characterCount: characterNames.length,
    language,
    aspectRatio,
    animeStyle,
    style,
    referenceImagesCount: referenceImages.length,
  });
  const characterImage = await generateImage(apiKey, characterImagePrompt, {
    referenceImages,
    aspectRatio,
    referenceInstruction: buildCharacterDesignReferenceInstruction(referenceImages.length),
    referenceLabels: buildCharacterDesignReferenceLabels(referenceImages.length),
  });

  return {
    characterText,
    characterNames,
    characterImage,
  };
};

export type CharacterReferenceMode = 'portraits' | 'sheet' | 'user' | 'none';

export const buildComicPagePrompt = ({
  segment,
  storyInput,
  characterDesign,
  characterNames,
  language,
  aspectRatio,
  animeStyle,
  style,
  characterReferenceMode,
  portraitNames,
}: {
  segment: ScriptSegment;
  storyInput: string;
  characterDesign: string | null;
  characterNames: string[];
  language: string;
  aspectRatio: AspectRatio;
  animeStyle: string;
  style: string;
  characterReferenceMode: CharacterReferenceMode;
  portraitNames: string[];
}) => {
  const languageLabel = normalizeLanguageLabel(language);
  const styleText = style || '国风古韵、水墨光影、细腻动漫叙事';
  const sanitizedSegmentRaw = sanitizeStorySegmentText(segment.raw);
  const cleanedSegmentRaw = deduplicateDialogues(sanitizedSegmentRaw);
  const referenceTextArray: string[] = [];
  const characterAnchorText = buildComicCharacterAnchorText({
    characterDesign,
    cleanedSegmentRaw: sanitizedSegmentRaw,
    scene: segment.scene,
    plot: segment.plot,
    desc: segment.desc,
    characterNames,
  });

  if (characterReferenceMode === 'portraits') {
    referenceTextArray.push(
      `【角色一致性参考】已提供 ${portraitNames.length} 张单人角色参考图（每张对应一个角色，参考图标签含角色姓名）。请先识别每张参考图对应的角色外貌，在绘制分格时严格按标签匹配角色区域，确保该角色所有分格中面部特征、发型、服装和配色完全一致。不同角色的参考图之间不要串色、串脸、串服装。文本细节与参考图冲突时，以参考图中的外观为准。参考图中的水印、logo、签名等装饰文字一律忽略。`,
    );
  } else if (characterReferenceMode === 'sheet') {
    referenceTextArray.push(
      '【角色一致性】已提供角色设定图（首张参考图），图中并排展示多个角色。请先识别设定图中每个角色的独立区域，逐一提取五官轮廓、发型发色、瞳色、服装款式与层次、主配色、体态和年龄感；在绘制每个分格时，必须回溯到设定图中对应角色区域进行视觉比对，确保同一角色在所有分格中面部特征、发型、服装和配色完全一致。若文本细节与设定图冲突，以设定图中的外观为准，文本只补充动作、表情、道具和场景。若参考图里含有水印、平台标识、logo、签名、页码或边角文字，一律忽略，绝对不要复制到输出图中。',
    );
  } else if (characterReferenceMode === 'user') {
    referenceTextArray.push(
      '【画风与构图参考】已提供用户上传的参考图。请吸收这些参考图的画风笔触、色彩基调、场景材质、镜头角度、景别切换和光影氛围，并融入当前漫画页。',
    );
  } else {
    referenceTextArray.push('【人物一致性】当前没有角色设定参考图，请仅依据角色设定文本和段落内容保持人物一致性。');
  }

  const referenceText = referenceTextArray.join('\n');

  return `请生成一张单页多格漫画，准确表现当前这一个段落的剧情。

${referenceText}

【语言要求】漫画中的所有文字、对白、旁白、拟声词全部使用 ${languageLabel}。
【画面比例】${aspectRatio}
【动漫风格】${animeStyle}
【风格偏好】${styleText}
【重要限制】“${segment.title}”和“${
    segment.cut
  }”仅用于你理解当前段落，绝对不要把段落标题、段落编号、页眉、页码或任何说明性标题渲染到图片顶部或画面任何位置。

用户故事需求：
${storyInput}

完整段落原文：
${cleanedSegmentRaw}

本页角色锚点：
${characterAnchorText}

重点角色：
${characterNames.length ? characterNames.join('、') : '请根据段落内容判断'}

创作要求：
1. 只生成这一段的内容，不要混入其他段落
2. 一页内拆分成 3-6 个分格，叙事清晰连贯
3. 每个分格聚焦关键动作、表情、镜头或场景变化
4. 镜头语言有层次，包含远景、中景、特写等变化
5. 同一角色在整页所有分格中保持同一张脸、同一发型、同一服装与主配色，不因景别变化而漂移
6. 线条清晰，构图专业，分格边框明确
7. 颜色、光影和氛围与故事情绪匹配
8. 对白和旁白尽量精炼，适合直接放入漫画气泡
9. 每条对白、独白、旁白只在唯一一个分格的唯一一个气泡中出现一次；即使同一句话在段落原文或分格建议里被多次提及，也只选定一个最贴合的分格渲染一次，严禁将同一句台词复制到多个气泡或多个分格
10. 未在当前段落中明确出现的角色不要随意出镜或抢镜
11. 优先保留剧情里真正需要的文字，其余能省则省
12. 不要添加段落标题、章节名、页眉、页码、角标或顶部横幅文字，除非该文字属于剧情中的真实场景元素
13. 严禁在画面任何位置（尤其是四个角落、底部边缘、右下角）出现任何平台标识、站点名称、水印、logo、签名、二维码、印章、页脚信息、角落装饰字样或无关字母数字，例如"U17""Webtoon""Bilibili"等标识一律不得出现
14. 如果不确定某些文字是否属于剧情元素，宁可不生成，也不要添加任何来源不明的装饰性文字
15. 输出图片的四角和边缘必须保持干净，不允许出现任何装饰性标记、伪水印、品牌标志或类似元素，即使模型认为这样更美观也必须省略

请直接输出漫画图片，不要附加解释。`;
};

export const generateImage = async (
  apiKey: string,
  prompt: string,
  options: GenerateImageOptions = {},
): Promise<string> => {
  if (!apiKey) {
    throw new Error('请先设置生图 API Key');
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const referenceImages = options.referenceImages ?? [];
    const referenceLabels = options.referenceLabels ?? [];
    const referenceParts = (
      await Promise.all(
        referenceImages.map(async (image, index) => {
          const parsed = parseDataUrl(HTTP_URL_PATTERN.test(image) ? await convertRemoteImageToDataUrl(image) : image);
          const partsForCurrentImage: GeminiPart[] = [];

          if (referenceLabels[index]?.trim()) {
            partsForCurrentImage.push({
              text: referenceLabels[index].trim(),
            });
          }

          partsForCurrentImage.push({
            inlineData: {
              mimeType: parsed.mimeType,
              data: parsed.base64,
            },
          });

          return partsForCurrentImage;
        }),
      )
    ).flat();
    const parts = [
      ...(options.referenceInstruction?.trim() ? [{ text: options.referenceInstruction.trim() }] : []),
      ...referenceParts,
      ...(referenceParts.length
        ? [
            {
              text: '上方参考图都是硬性输入条件。请先对齐参考图，再执行后续文本要求。',
            },
          ]
        : []),
      { text: prompt },
    ];

    const response = await fetch(API_ENDPOINTS.geminiImage, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: '*/*',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: options.aspectRatio ?? '16:9',
          },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await buildFriendlyError(response));
    }

    const rawText = await response.text();
    const data = JSON.parse(rawText);
    return extractImageDataUrl(data);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Gemini 生图超时，请稍后重试');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const generateContent = async (
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt: string,
): Promise<string> => {
  if (!apiKey) {
    throw new Error('请先设置 API Key');
  }

  try {
    const response = await fetch(API_ENDPOINTS.chatCompletions, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-3.5-turbo', // 默认回退模型
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const rawText = await response.text().catch(() => '');
      throw new Error(extractResponseMessage(rawText) || `API 请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
