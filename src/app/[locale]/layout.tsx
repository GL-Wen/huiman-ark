/*
 * @Author: wenguoliang
 * @Date: 2026-04-05 13:11:07
 * @FilePath: /huiman-ark/src/app/[locale]/layout.tsx
 * @Description: Do not edit
 */
import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, routing, type AppLocale } from '@/i18n/routing';
import '../globals.css';

const resolveMetadataBase = () => {
  const vercelUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL;

  if (vercelUrl) {
    return new URL(vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`);
  }

  return new URL('http://localhost:3000');
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const path = locale === routing.defaultLocale ? `/${locale}` : `/${locale}`;

  return {
    title: t('title'),
    description: t('description'),
    metadataBase: resolveMetadataBase(),
    alternates: {
      canonical: path,
      languages: Object.fromEntries(locales.map((item) => [item, `/${item}`])),
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      locale,
      type: 'website',
      url: path,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale as AppLocale);

  const messages = await getMessages({ locale });

  return (
    <html lang={locale}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
