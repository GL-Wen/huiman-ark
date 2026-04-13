/*
 * @Author: wenguoliang
 * @Date: 2026-04-05 13:19:58
 * @FilePath: /huiman-ark/src/i18n/request.ts
 * @Description: Do not edit
 */
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !hasLocale(routing.locales, locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
