import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const locales = ['zh', 'en', 'ja'] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: 'zh',
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
