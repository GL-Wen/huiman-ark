import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Step =
  | 'initial'
  | 'generating_story'
  | 'story_done'
  | 'generating_characters'
  | 'characters_done'
  | 'generating_comics'
  | 'done';

export interface ScriptSegment {
  id: string;
  title: string;
  cut: string;
  scene: string;
  plot: string;
  desc: string;
  raw: string;
}

export interface GeneratedComicMap {
  [scriptId: string]: string;
}

interface AppState {
  apiKey: string;
  setApiKey: (key: string) => void;
  isApiSettingsOpen: boolean;
  openApiSettings: () => void;
  closeApiSettings: () => void;

  storyInput: string;
  setStoryInput: (story: string) => void;
  model: string;
  setModel: (model: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  paragraphCount: string;
  setParagraphCount: (count: string) => void;
  customParagraphCount: string;
  setCustomParagraphCount: (count: string) => void;
  panelsPerParagraph: string;
  setPanelsPerParagraph: (count: string) => void;
  ratio: '16:9' | '9:16';
  setRatio: (ratio: '16:9' | '9:16') => void;
  animeStyle: string;
  setAnimeStyle: (style: string) => void;
  customAnimeStyle: string;
  setCustomAnimeStyle: (style: string) => void;
  style: string;
  setStyle: (style: string) => void;
  referenceImages: string[];
  setReferenceImages: (images: string[]) => void;

  currentStep: Step;
  setCurrentStep: (step: Step) => void;

  generatedScript: ScriptSegment[];
  setGeneratedScript: (script: ScriptSegment[]) => void;

  characterDesign: string | null;
  setCharacterDesign: (design: string | null) => void;

  characterDesignImage: string | null;
  setCharacterDesignImage: (image: string | null) => void;

  characterNames: string[];
  setCharacterNames: (names: string[]) => void;

  generatedComics: GeneratedComicMap;
  setGeneratedComics: (comics: GeneratedComicMap) => void;
  setGeneratedComic: (scriptId: string, image: string) => void;

  characterPortraits: Record<string, string>;
  setCharacterPortrait: (key: string, image: string) => void;
  setCharacterPortraits: (portraits: Record<string, string>) => void;
  clearCharacterPortraits: () => void;

  portraitGenerating: Record<string, boolean>;
  setPortraitGenerating: (key: string, generating: boolean) => void;

  upgradeBannerDismissed: boolean;
  setUpgradeBannerDismissed: (dismissed: boolean) => void;

  pendingComicId: string | null;
  setPendingComicId: (scriptId: string | null) => void;

  clearHistory: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apiKey: '',
      setApiKey: (key) => set({ apiKey: key }),
      isApiSettingsOpen: false,
      openApiSettings: () => set({ isApiSettingsOpen: true }),
      closeApiSettings: () => set({ isApiSettingsOpen: false }),

      storyInput: '',
      setStoryInput: (story) => set({ storyInput: story }),
      model: 'gpt-5.4',
      setModel: (model) => set({ model }),
      language: '',
      setLanguage: (lang) => set({ language: lang }),
      paragraphCount: 'auto',
      setParagraphCount: (count) => set({ paragraphCount: count }),
      customParagraphCount: '10',
      setCustomParagraphCount: (customParagraphCount) => set({ customParagraphCount }),
      panelsPerParagraph: '3~6',
      setPanelsPerParagraph: (panelsPerParagraph) => set({ panelsPerParagraph }),
      ratio: '16:9',
      setRatio: (ratio) => set({ ratio }),
      animeStyle: 'guofeng',
      setAnimeStyle: (animeStyle) => set({ animeStyle }),
      customAnimeStyle: '',
      setCustomAnimeStyle: (customAnimeStyle) => set({ customAnimeStyle }),
      style: '',
      setStyle: (style) => set({ style }),
      referenceImages: [],
      setReferenceImages: (images) => set({ referenceImages: images }),

      currentStep: 'initial',
      setCurrentStep: (step) => set({ currentStep: step }),

      generatedScript: [],
      setGeneratedScript: (script) => set({ generatedScript: script }),

      characterDesign: null,
      setCharacterDesign: (design) => set({ characterDesign: design }),

      characterDesignImage: null,
      setCharacterDesignImage: (image) => set({ characterDesignImage: image }),

      characterNames: [],
      setCharacterNames: (names) => set({ characterNames: names }),

      generatedComics: {},
      setGeneratedComics: (comics) => set({ generatedComics: comics }),
      setGeneratedComic: (scriptId, image) =>
        set((state) => ({
          generatedComics: {
            ...state.generatedComics,
            [scriptId]: image,
          },
        })),

      characterPortraits: {},
      setCharacterPortrait: (key, image) =>
        set((state) => ({
          characterPortraits: { ...state.characterPortraits, [key]: image },
        })),
      setCharacterPortraits: (portraits) => set({ characterPortraits: portraits }),
      clearCharacterPortraits: () => set({ characterPortraits: {} }),

      portraitGenerating: {},
      setPortraitGenerating: (key, generating) =>
        set((state) => ({
          portraitGenerating: { ...state.portraitGenerating, [key]: generating },
        })),

      upgradeBannerDismissed: false,
      setUpgradeBannerDismissed: (dismissed) => set({ upgradeBannerDismissed: dismissed }),

      pendingComicId: null,
      setPendingComicId: (scriptId) => set({ pendingComicId: scriptId }),

      clearHistory: () =>
        set({
          storyInput: '',
          model: 'gpt-5.4',
          paragraphCount: 'auto',
          customParagraphCount: '10',
          panelsPerParagraph: '3~6',
          animeStyle: 'guofeng',
          customAnimeStyle: '',
          style: '',
          referenceImages: [],
          currentStep: 'initial',
          generatedScript: [],
          characterDesign: null,
          characterDesignImage: null,
          characterNames: [],
          generatedComics: {},
          characterPortraits: {},
          portraitGenerating: {},
          upgradeBannerDismissed: false,
          pendingComicId: null,
        }),
    }),
    {
      name: 'huiman-ark-storage',
      partialize: (state) => ({
        apiKey: state.apiKey,
        model: state.model,
        language: state.language,
        paragraphCount: state.paragraphCount,
        customParagraphCount: state.customParagraphCount,
        ratio: state.ratio,
        animeStyle: state.animeStyle,
        customAnimeStyle: state.customAnimeStyle,
        style: state.style,
        upgradeBannerDismissed: state.upgradeBannerDismissed,
      }),
    },
  ),
);
