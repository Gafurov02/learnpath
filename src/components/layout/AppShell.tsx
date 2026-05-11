'use client';

import { ReactNode } from 'react';
import { AppNavbar } from './AppNavbar';
import { PageContainer } from '@/components/ui/PageContainer';

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top,#171717 0%,#0A0A0A 45%)',
        color: 'hsl(var(--foreground))',
      }}
    >
      <AppNavbar />

      <PageContainer
        style={{
          maxWidth: 1200,
          paddingTop: 32,
          paddingBottom: 120,
        }}
      >
        {children}
      </PageContainer>
    </div>
  );
}