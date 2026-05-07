'use client';

import React from 'react';
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { NextIntlClientProvider } from "next-intl";

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
            <TonConnectUIProvider
                manifestUrl="https://gafurov.cc/tonconnect-manifest.json"
            >
                {children}
            </TonConnectUIProvider>
        </NextIntlClientProvider>
    );
}