/*
 * @Author: wenguoliang
 * @Date: 2026-03-30 22:33:00
 * @FilePath: /huiman-ark/src/lib/animeStyles.ts
 * @Description: Do not edit
 */
export const animeStyleOptions = [
  {
    value: 'kawaii',
    label: '日系萌系',
    prompt:
      '日系萌系动漫风格 (圆润可爱的角色比例、柔和干净线条、明亮糖果色、Q版表情、轻快温暖氛围、低压迫感构图)',
  },
  {
    value: 'shonen',
    label: '少年漫画',
    prompt:
      '少年漫画风格 (清晰硬朗线条、高对比阴影、动态透视、夸张动作姿态、速度线与冲击感构图、热血但画面结构清楚)',
  },
  {
    value: 'shoujo',
    label: '少女漫画',
    prompt:
      '少女漫画风格 (纤细线稿、精致五官、柔和渐变上色、花瓣与光点等轻装饰、浪漫镜头、干净优雅的画面层次)',
  },
  {
    value: 'ghibli',
    label: '手绘治愈动画',
    prompt:
      '手绘治愈动画风格 (温暖手绘质感、自然光影、生活化角色表演、柔和背景细节、电影感构图、朴素可信的动画美术；避免模仿特定工作室或具体作品)',
  },
  {
    value: 'fantasy',
    label: '奇幻冒险漫画',
    prompt:
      '奇幻冒险漫画风格 (魔法元素、异世界场景、华丽服饰与道具、明暗层次丰富、冒险感构图、角色造型保持动漫化)',
  },
  {
    value: 'isekai',
    label: '异世界 RPG',
    prompt:
      '异世界 RPG 动漫风格 (职业感服装、装备与道具细节、队伍冒险构图、明快商业动画上色、清晰角色轮廓、游戏幻想氛围)',
  },
  {
    value: 'slice-of-life',
    label: '日常治愈动画',
    prompt:
      '日常治愈动画风格 (柔和自然色彩、轻描线条、生活化场景、温暖光线、表情细腻、节奏平静的镜头构图)',
  },
  {
    value: 'sports',
    label: '运动青春漫画',
    prompt:
      '运动青春漫画风格 (速度感线条、运动姿态张力、汗水与逆光、高节奏分镜、清晰肌肉与服装褶皱、青春竞技氛围)',
  },
  {
    value: 'cyberpunk',
    label: '赛博朋克动漫',
    prompt:
      '赛博朋克动漫风格 (霓虹高对比光影、未来都市、机械义体与电子界面、冷暖撞色、夜景氛围、锐利线条与科技细节)',
  },
  {
    value: 'mecha',
    label: '机甲科幻动漫',
    prompt:
      '机甲科幻动漫风格 (硬表面机械结构、工业细节、驾驶舱与装甲元素、宏大尺度感、冷峻光影、角色与机体比例清晰)',
  },
  {
    value: 'dark-fantasy',
    label: '暗黑奇幻漫画',
    prompt:
      '暗黑奇幻漫画风格 (厚重阴影、低饱和色彩、压迫氛围、哥特或史诗服饰、强烈明暗反差、精细纹理但保持漫画可读性)',
  },
  {
    value: 'seinen',
    label: '青年漫画',
    prompt:
      '青年漫画风格 (成熟写实的动漫比例、克制表情、电影感镜头、现实质感服装与场景、细密线条、低调但有张力的叙事氛围)',
  },
  {
    value: 'manga-monochrome',
    label: '黑白漫画',
    prompt:
      '黑白日漫风格 (纯黑白线稿、网点纸质感、排线阴影、高对比构图、清晰分镜边框、禁止彩色上色)',
  },
  {
    value: 'webtoon',
    label: '韩漫条漫',
    prompt:
      '韩漫条漫风格 (干净线条、精致角色五官、柔顺渐变上色、现代数字绘制质感、镜头节奏明确、适合纵向阅读的画面组织)',
  },
  {
    value: 'idol-pop',
    label: '偶像闪耀动漫',
    prompt:
      '偶像闪耀动漫风格 (华丽舞台灯光、闪耀高光、精致发型与服装、明亮高饱和色彩、青春活力姿态、商业动画完成度)',
  },
  {
    value: 'yokai',
    label: '和风怪谈漫画',
    prompt:
      '和风怪谈漫画风格 (日式民俗元素、妖怪传说氛围、幽暗灯火、留白与阴影、传统纹样、神秘克制的镜头语言)',
  },
  {
    value: 'guofeng',
    label: '国风古韵',
    prompt:
      '国风古韵动漫漫画风格 (中国古装、传统服饰纹样、东方构图、水墨晕染与细腻线稿结合、清雅留白、古典色彩；保持二次元角色造型，不要做成写实水彩插画或普通古装设定稿)',
  },
  { value: 'custom', label: '自定义风格', prompt: '' },
] as const;

export const getAnimeStylePrompt = (animeStyle: string, customAnimeStyle: string) => {
  if (animeStyle === 'custom') {
    return (
      customAnimeStyle.trim() ||
      '国风古韵动漫漫画风格 (中国古装、传统服饰纹样、东方构图、水墨晕染与细腻线稿结合、清雅留白、古典色彩；保持二次元角色造型，不要做成写实水彩插画或普通古装设定稿)'
    );
  }

  return (
    animeStyleOptions.find((option) => option.value === animeStyle)?.prompt ||
    '国风古韵动漫漫画风格 (中国古装、传统服饰纹样、东方构图、水墨晕染与细腻线稿结合、清雅留白、古典色彩；保持二次元角色造型，不要做成写实水彩插画或普通古装设定稿)'
  );
};

export const getAnimeStyleLabel = (animeStyle: string, customAnimeStyle: string) => {
  if (animeStyle === 'custom') {
    return customAnimeStyle.trim() || '自定义风格';
  }

  return animeStyleOptions.find((option) => option.value === animeStyle)?.label || '国风古韵';
};
