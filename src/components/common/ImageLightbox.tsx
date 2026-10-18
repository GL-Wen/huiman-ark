'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';

export type ImageLightboxItem = {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
  downloadFilename?: string;
};

type ImageLightboxProps = {
  isOpen: boolean;
  items: ImageLightboxItem[];
  activeIndex: number;
  labels: {
    close: string;
    previous: string;
    next: string;
    zoomIn: string;
    zoomOut: string;
    reset: string;
    download: string;
    imageCounter: (current: number, total: number) => string;
    keyboardHint: string;
  };
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onDownload?: (item: ImageLightboxItem) => void;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  items,
  activeIndex,
  labels,
  onClose,
  onIndexChange,
  onDownload,
}) => {
  const [zoom, setZoom] = useState(MIN_ZOOM);

  const safeIndex = useMemo(() => {
    if (items.length === 0) {
      return 0;
    }

    if (activeIndex < 0) {
      return 0;
    }

    if (activeIndex >= items.length) {
      return items.length - 1;
    }

    return activeIndex;
  }, [activeIndex, items.length]);

  const currentItem = items[safeIndex];
  const hasMultiple = items.length > 1;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setZoom(MIN_ZOOM);
  }, [isOpen, safeIndex]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || items.length === 0) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'ArrowLeft' && hasMultiple) {
        onIndexChange((safeIndex - 1 + items.length) % items.length);
        return;
      }

      if (event.key === 'ArrowRight' && hasMultiple) {
        onIndexChange((safeIndex + 1) % items.length);
        return;
      }

      if (event.key === '+' || event.key === '=') {
        setZoom((prev) => clampZoom(prev + ZOOM_STEP));
        return;
      }

      if (event.key === '-') {
        setZoom((prev) => clampZoom(prev - ZOOM_STEP));
        return;
      }

      if (event.key === '0') {
        setZoom(MIN_ZOOM);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasMultiple, isOpen, items.length, onClose, onIndexChange, safeIndex]);

  if (!isOpen || !currentItem) {
    return null;
  }

  const handlePrev = () => {
    onIndexChange((safeIndex - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    onIndexChange((safeIndex + 1) % items.length);
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={currentItem.alt}
      onClick={onClose}
    >
      <div className="flex h-full flex-col p-4 sm:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white shadow-2xl">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{currentItem.title || currentItem.alt}</p>
            <p className="mt-1 text-xs text-white/60">
              {labels.imageCounter(safeIndex + 1, items.length)}
              {currentItem.subtitle ? ` · ${currentItem.subtitle}` : ''}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((prev) => clampZoom(prev - ZOOM_STEP))}
              className="rounded-xl border border-white/10 bg-white/8 p-2 text-white/80 transition hover:bg-white/14 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={zoom <= MIN_ZOOM}
              aria-label={labels.zoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((prev) => clampZoom(prev + ZOOM_STEP))}
              className="rounded-xl border border-white/10 bg-white/8 p-2 text-white/80 transition hover:bg-white/14 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={zoom >= MAX_ZOOM}
              aria-label={labels.zoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(MIN_ZOOM)}
              className="rounded-xl border border-white/10 bg-white/8 p-2 text-white/80 transition hover:bg-white/14 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={zoom === MIN_ZOOM}
              aria-label={labels.reset}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            {onDownload && (
              <button
                type="button"
                onClick={() => onDownload(currentItem)}
                className="rounded-xl border border-white/10 bg-white/8 p-2 text-white/80 transition hover:bg-white/14 hover:text-white"
                aria-label={labels.download}
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/8 p-2 text-white/80 transition hover:bg-white/14 hover:text-white"
              aria-label={labels.close}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative mt-4 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
          {hasMultiple && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-black/35 p-3 text-white/80 shadow-lg transition hover:bg-black/55 hover:text-white"
              aria-label={labels.previous}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          <div className="flex h-full w-full items-center justify-center overflow-auto px-4 py-6 sm:px-10">
            <img
              src={currentItem.src}
              alt={currentItem.alt}
              className="max-h-full max-w-full rounded-2xl object-contain shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-transform duration-200 ease-out"
              style={{ transform: `scale(${zoom})` }}
            />
          </div>

          {hasMultiple && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-black/35 p-3 text-white/80 shadow-lg transition hover:bg-black/55 hover:text-white"
              aria-label={labels.next}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-xs text-white/65">
          <span>{labels.keyboardHint}</span>
          <span>{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
};
