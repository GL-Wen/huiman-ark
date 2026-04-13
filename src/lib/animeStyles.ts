/*
 * @Author: wenguoliang
 * @Date: 2026-03-30 22:33:00
 * @FilePath: /huiman-ark/src/lib/animeStyles.ts
 * @Description: Do not edit
 */
export const animeStyleOptions = [
  { value: 'kawaii', label: '日系萌系', prompt: '日系萌系 (可爱、Q版、明亮色彩)' },
  { value: 'shonen', label: '少年热血', prompt: '少年热血 (动作、战斗、激情)' },
  { value: 'shoujo', label: '少女浪漫', prompt: '少女浪漫 (梦幻、温柔、唯美)' },
  { value: 'ghibli', label: '吉卜力治愈', prompt: '吉卜力治愈 (手绘质感、自然风景、温暖电影感)' },
  { value: 'fantasy', label: '奇幻冒险', prompt: '奇幻冒险 (魔法、奇幻世界)' },
  { value: 'isekai', label: '异世界冒险', prompt: '异世界冒险 (RPG感、成长线、世界探索)' },
  { value: 'slice-of-life', label: '日常治愈', prompt: '日常治愈 (平淡、温馨、生活)' },
  { value: 'sports', label: '运动热血', prompt: '运动热血 (速度感、竞技张力、青春汗水)' },
  { value: 'cyberpunk', label: '赛博朋克', prompt: '赛博朋克 (科技、未来、霓虹)' },
  { value: 'mecha', label: '机甲科幻', prompt: '机甲科幻 (机甲设计、工业细节、宏大科幻场景)' },
  { value: 'dark-fantasy', label: '黑暗奇幻', prompt: '黑暗奇幻 (史诗感、压迫氛围、强烈光影反差)' },
  { value: 'seinen', label: '青年漫画', prompt: '青年漫画 (成熟叙事、电影感分镜、现实质感)' },
  { value: 'manga-monochrome', label: '黑白漫画', prompt: '黑白漫画 (网点质感、强对比、经典日漫分镜)' },
  { value: 'webtoon', label: '韩漫条漫', prompt: '韩漫条漫 (纵向阅读、清晰角色、强节奏镜头)' },
  { value: 'idol-pop', label: '偶像闪耀', prompt: '偶像闪耀 (舞台灯光、华丽造型、青春活力)' },
  { value: 'yokai', label: '和风怪谈', prompt: '和风怪谈 (妖怪传说、神秘氛围、日式意境)' },
  { value: 'guofeng', label: '国风古韵', prompt: '国风古韵 (古装、水墨画风、中国传统美学)' },
  { value: 'custom', label: '自定义风格', prompt: '' },
] as const;

export const getAnimeStylePrompt = (animeStyle: string, customAnimeStyle: string) => {
  if (animeStyle === 'custom') {
    return customAnimeStyle.trim() || '国风古韵 (古装、水墨画风、中国传统美学)';
  }

  return (
    animeStyleOptions.find((option) => option.value === animeStyle)?.prompt || '国风古韵 (古装、水墨画风、中国传统美学)'
  );
};

export const getAnimeStyleLabel = (animeStyle: string, customAnimeStyle: string) => {
  if (animeStyle === 'custom') {
    return customAnimeStyle.trim() || '自定义风格';
  }

  return animeStyleOptions.find((option) => option.value === animeStyle)?.label || '国风古韵';
};
