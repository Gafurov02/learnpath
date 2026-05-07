'use client';

import { TonConnectUIProvider } from "@tonconnect/ui-react";

export default function Providers({
                                      children,
                          }: {
    children: React.ReactNode;
}) {
    return (
        <TonConnectUIProvider
            manifestUrl="https://gafurov.cc/tonconnect-manifest.json"
        >
            {children}
        </TonConnectUIProvider>
    );
}