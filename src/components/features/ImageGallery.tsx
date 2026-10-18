/*
 * @Author: wenguoliang
 * @Date: 2026-03-29 16:27:16
 * @FilePath: /huiman-ark/src/components/features/ImageGallery.tsx
 * @Description: Do not edit
 */
import React from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '../../store';
import { Download } from 'lucide-react';

const downloadImage = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const ImageGallery: React.FC = () => {
  const { generatedComics, generatedScript } = useAppStore();
  const t = useTranslations('LegacyPanels.imageGallery');
  const generatedImages = generatedScript.map((script) => ({
    id: script.id,
    title: script.title,
    url: generatedComics[script.id],
  }));
  const availableImages = generatedImages.filter((image) => image.url);

  if (availableImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p>{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-800">{t('title', { count: availableImages.length })}</h2>
        <button
          onClick={() => {
            availableImages.forEach((image, index) => {
              window.setTimeout(() => downloadImage(image.url!, `manga-page-${index + 1}.png`), index * 200);
            });
          }}
          className="text-gray-500 hover:text-blue-600 flex items-center space-x-1 text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          <span>{t('downloadAll')}</span>
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
        <div className="grid grid-cols-1 gap-6">
          {availableImages.map((image, index) => (
            <div key={image.id} className="bg-white p-2 rounded-lg shadow-sm border border-gray-200">
              <div className="aspect-video bg-gray-100 rounded relative overflow-hidden group">
                <img src={image.url} alt={t('page', { index: index + 1 })} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => downloadImage(image.url!, `${image.id}.png`)}
                    className="bg-white text-gray-800 px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t('saveImage')}</span>
                  </button>
                </div>
              </div>
              <div className="mt-2 text-center text-sm text-gray-500">
                {image.title || t('page', { index: index + 1 })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
