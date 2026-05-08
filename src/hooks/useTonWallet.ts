'use client';

import { useEffect } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { createClient } from '@/lib/supabase';

export function useTonWallet() {
    const address = useTonAddress();

    useEffect(() => {
        if (!address) return;

        async function saveWallet() {
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            await supabase
                .from('profiles')
                .update({
                    wallet_address: address,
                })
                .eq('id', user.id);
        }

        saveWallet();
    }, [address]);

    return address;
}