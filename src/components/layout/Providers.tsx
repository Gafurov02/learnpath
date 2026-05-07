'use client';

import { ThemeProvider } from 'next-themes';
import { NextIntlClientProvider } from 'next-intl';
import { TonConnectUIProvider } from "@tonconnect/ui-react";

export function Providers({
                              children,
                              messages,
                              locale,
                          }: {
    children: React.ReactNode;
    messages: Record<string, unknown>;
    locale: string;
}) {
    return (
        <TonConnectUIProvider
            manifestUrl="https://gafurov.cc/tonconnect-manifest.json"
        >
            {children}
        </TonConnectUIProvider>
    );
}