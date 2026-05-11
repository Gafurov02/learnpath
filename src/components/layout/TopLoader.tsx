'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import NProgress from 'nprogress';

import 'nprogress/nprogress.css';

NProgress.configure({
  showSpinner: false,
  minimum: 0.12,
  trickleSpeed: 80,
});

export function TopLoader() {
  const pathname = usePathname();

  useEffect(() => {
    NProgress.done();
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      const link = target.closest('a');

      if (!link) return;

      const href = link.getAttribute('href');

      if (!href) return;

      const isInternal =
        href.startsWith('/') &&
        !href.startsWith('//');

      if (isInternal) {
        NProgress.start();
      }
    };

    document.addEventListener(
      'click',
      handleClick
    );

    return () => {
      document.removeEventListener(
        'click',
        handleClick
      );
    };
  }, []);

  return null;
}