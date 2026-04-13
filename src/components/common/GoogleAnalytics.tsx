'use client';

import React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type GoogleAnalyticsProps = {
  measurementId: string;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const GoogleAnalytics: React.FC<GoogleAnalyticsProps> = ({ measurementId }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasTrackedInitialPageRef = React.useRef(false);

  React.useEffect(() => {
    if (!measurementId || !pathname) {
      return;
    }

    if (!hasTrackedInitialPageRef.current) {
      hasTrackedInitialPageRef.current = true;
      return;
    }

    if (typeof window.gtag !== 'function') {
      return;
    }

    const queryString = searchParams.toString();
    const pagePath = queryString ? `${pathname}?${queryString}` : pathname;

    window.gtag('config', measurementId, {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [measurementId, pathname, searchParams]);

  return null;
};
