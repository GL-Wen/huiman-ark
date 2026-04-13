import { useEffect, useMemo, useRef } from 'react';
import { IndexedDbStorage } from './indexedDb';
import { useAppStore, type GeneratedComicMap, type ScriptSegment, type Step } from '../store';

type SessionSnapshot = {
  storyInput: string;
  model: string;
  language: string;
  paragraphCount: string;
  customParagraphCount: string;
  panelsPerParagraph?: string;
  ratio: '16:9' | '9:16';
  animeStyle: string;
  customAnimeStyle: string;
  style: string;
  referenceImages: string[];
  generatedScript: ScriptSegment[];
  characterDesign: string | null;
  characterDesignImage: string | null;
  characterNames: string[];
  generatedComics: GeneratedComicMap;
  currentStep: Step;
};

const SESSION_ID = 'current-session';
const storage = new IndexedDbStorage<SessionSnapshot>({
  dbName: 'HuimanArkDB',
  storeName: 'sessions',
  version: 1,
});

const getRestoredStep = (snapshot: SessionSnapshot): Step => {
  if (Object.keys(snapshot.generatedComics).length > 0) {
    return Object.keys(snapshot.generatedComics).length >= snapshot.generatedScript.length ? 'done' : 'characters_done';
  }

  if (snapshot.characterDesign || snapshot.characterDesignImage) {
    return 'characters_done';
  }

  if (snapshot.generatedScript.length > 0) {
    return 'story_done';
  }

  return 'initial';
};

const isMeaningfulSnapshot = (snapshot: SessionSnapshot) =>
  Boolean(
    snapshot.storyInput ||
      snapshot.referenceImages.length ||
      snapshot.generatedScript.length ||
      snapshot.characterDesign ||
      snapshot.characterDesignImage ||
      Object.keys(snapshot.generatedComics).length,
  );

export const useSessionPersistence = () => {
  const isRestoringRef = useRef(true);
  const state = useAppStore();
  const snapshot = useMemo(
    () => ({
      storyInput: state.storyInput,
      model: state.model,
      language: state.language,
      paragraphCount: state.paragraphCount,
      customParagraphCount: state.customParagraphCount,
      panelsPerParagraph: state.panelsPerParagraph,
      ratio: state.ratio,
      animeStyle: state.animeStyle,
      customAnimeStyle: state.customAnimeStyle,
      style: state.style,
      referenceImages: state.referenceImages,
      generatedScript: state.generatedScript,
      characterDesign: state.characterDesign,
      characterDesignImage: state.characterDesignImage,
      characterNames: state.characterNames,
      generatedComics: state.generatedComics,
      currentStep: state.currentStep,
    }),
    [
      state.storyInput,
      state.model,
      state.language,
      state.paragraphCount,
      state.customParagraphCount,
      state.panelsPerParagraph,
      state.ratio,
      state.animeStyle,
      state.customAnimeStyle,
      state.style,
      state.referenceImages,
      state.generatedScript,
      state.characterDesign,
      state.characterDesignImage,
      state.characterNames,
      state.generatedComics,
      state.currentStep,
    ],
  );

  useEffect(() => {
    let disposed = false;

    const restore = async () => {
      try {
        const saved = await storage.load(SESSION_ID);
        if (!saved || disposed) {
          return;
        }

        useAppStore.setState({
          storyInput: saved.storyInput,
          model: saved.model || 'gpt-5.4',
          language: saved.language || '',
          paragraphCount: saved.paragraphCount,
          customParagraphCount: saved.customParagraphCount ?? '10',
          panelsPerParagraph: saved.panelsPerParagraph ?? '3~6',
          ratio: saved.ratio,
          animeStyle: saved.animeStyle ?? 'guofeng',
          customAnimeStyle: saved.customAnimeStyle ?? '',
          style: saved.style,
          referenceImages: saved.referenceImages ?? [],
          generatedScript: saved.generatedScript ?? [],
          characterDesign: saved.characterDesign ?? null,
          characterDesignImage: saved.characterDesignImage ?? null,
          characterNames: saved.characterNames ?? [],
          generatedComics: saved.generatedComics ?? {},
          pendingComicId: null,
          currentStep: getRestoredStep({
            storyInput: saved.storyInput ?? '',
            model: saved.model ?? 'gpt-5.4',
            language: saved.language ?? '',
            paragraphCount: saved.paragraphCount ?? 'auto',
            customParagraphCount: saved.customParagraphCount ?? '10',
            panelsPerParagraph: saved.panelsPerParagraph ?? '3~6',
            ratio: saved.ratio ?? '16:9',
            animeStyle: saved.animeStyle ?? 'guofeng',
            customAnimeStyle: saved.customAnimeStyle ?? '',
            style: saved.style ?? '',
            referenceImages: saved.referenceImages ?? [],
            generatedScript: saved.generatedScript ?? [],
            characterDesign: saved.characterDesign ?? null,
            characterDesignImage: saved.characterDesignImage ?? null,
            characterNames: saved.characterNames ?? [],
            generatedComics: saved.generatedComics ?? {},
            currentStep: saved.currentStep ?? 'initial',
          }),
        });
      } catch (error) {
        console.error('恢复会话失败', error);
      } finally {
        if (!disposed) {
          isRestoringRef.current = false;
        }
      }
    };

    restore();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (isRestoringRef.current) {
      return;
    }

    const save = async () => {
      try {
        if (!isMeaningfulSnapshot(snapshot)) {
          await storage.clear();
          return;
        }

        await storage.save(SESSION_ID, snapshot);
      } catch (error) {
        console.error('保存会话失败', error);
      }
    };

    save();
  }, [snapshot]);
};
