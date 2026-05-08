'use client';

import React from 'react';
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { CommandMenu } from "@/components/layout/CommandMenu";

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

                    <Toaster
                        position="top-right"
                        richColors
                        closeButton
                        toastOptions={{
                            style: {
                                borderRadius: 16,
                                border: '1xp solid hsl(var(--border))',
                                background: 'hsl(var(--card))',
                                color: 'hsl(var(--foreground))',
                            },
                        }}
                    />
                    <CommandMenu />
                </TonConnectUIProvider>
            </ThemeProvider>
        </NextIntlClientProvider>
    );
}