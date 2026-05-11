'use client';

import { ReactNode } from 'react';
import { AppNavbar } from './AppNavbar';
import { PageContainer } from '@/components/ui/PageContainer';

type Props = {
  children: React.ReactNode;
};

export function AppShell({ children }: Props) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top,rgba(107,92,231,0.12),transparent 30%), hsl(var(--background))',
        color: 'hsl(var(--foreground))',
      }}
    >
        {children}
    </div>
  );
}