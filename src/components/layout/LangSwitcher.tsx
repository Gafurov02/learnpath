'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useTransition } from 'react';

export function LangSwitcher({ style }: { style?: React.CSSProperties }) {
  const locale = useLocale();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const otherLocale = locale === 'en' ? 'ru' : 'en';

  function switchLocale() {
    // Replace /en/ or /ru/ prefix in path
    const newPath = pathname.replace(new RegExp(`^/${locale}`), `/${otherLocale}`);
    startTransition(() => {
      window.location.href = newPath;
    });
  }

  return (
    <button
      onClick={switchLocale}
      disabled={isPending}
      style={{
        background: 'transparent',
        border: '1px solid hsl(var(--border))',
        borderRadius: 6, padding: '4px 9px',
        fontSize: 12, fontWeight: 500,
        color: 'hsl(var(--muted-foreground))',
        cursor: isPending ? 'default' : 'pointer',
        fontFamily: 'inherit',
        opacity: isPending ? 0.5 : 1,
        ...style,
      }}
    >
      {otherLocale.toUpperCase()}
    </button>
  );
}
