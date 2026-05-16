'use client';

import { useEffect } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { createClient } from '@/lib/supabase';

export function useTonWallet() {
    const address = useTonAddress();

    useEffect(() => {
        if (!address) return;

        // FIX: was querying 'profiles' table which does NOT exist in the schema.
        // Wallet address is stored in user_metadata via auth.updateUser instead.
        async function saveWallet() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase.auth.updateUser({
                data: {
                    ...user.user_metadata,
                    wallet_address: address,
                },
            });
        }

        void saveWallet();
    }, [address]);

    return address;
}