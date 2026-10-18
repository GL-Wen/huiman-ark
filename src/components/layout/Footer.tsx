/*
 * @Author: wenguoliang
 * @Date: 2026-03-29 16:36:52
 * @FilePath: /huiman-ark/src/components/layout/Footer.tsx
 * @Description: Do not edit
 */
import React from 'react';
import { Logo } from '../common/Logo';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-100 bg-white py-6">
      <div className="mx-auto flex flex-col items-center justify-between px-40 gap-6 sm:flex-row sm:gap-16">
        <div className="flex items-center gap-3 text-left">
          <Logo className="h-8 w-8" />
          <div>
            <p className="text-sm font-semibold text-gray-800">绘漫方舟</p>
            <p className="text-xs text-gray-400">AI 漫画生成工作台</p>
          </div>
        </div>

        <a
          href="https://github.com/GL-Wen/huiman-ark"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-gray-500 transition-colors hover:text-gray-800"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
};
