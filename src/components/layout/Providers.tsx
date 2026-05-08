'use client';

import React from 'react';
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";

export default function Providers({
                                      children,
    locale,
    messages,
                                  }: {
    children: React.ReactNode;
    locale: string;
    messages: any;
}) {
    return (
        <NextIntlClientProvider
            locale={locale}
            messages={messages}
        >
            <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
            >
                <TonConnectUIProvider
                    manifestUrl="https://gafurov.cc/tonconnect-manifest.json"
                >
                    {children}
                </TonConnectUIProvider>
            </ThemeProvider>
        </NextIntlClientProvider>
    );
}