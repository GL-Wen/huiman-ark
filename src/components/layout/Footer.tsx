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

        <div className="flex items-center gap-6">
          <a
            href="mailto:toowell2015@126.com"
            className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-800"
          >
            <span>邮箱：toowell2015@126.com</span>
          </a>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>QQ：3575554244</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
