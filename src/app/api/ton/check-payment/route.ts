import { NextRequest, NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env/server';
import { createServiceRoleClient } from '@/lib/server-supabase';

export async function POST(req: NextRequest) {
    try {
        const env = getServerEnv();

        const { userId, amount } = await req.json();

        const response = await fetch(
            `https://toncenter.com/api/v2/getTransactions?address=${env.TON_WALLET_ADDRESS}&limit=10`,
            {
                headers: {
                    'X-API-Key': env.TON_API_KEY,
                },
            }
        );

        const data = await response.json();

        const found = data.result?.find((tx: any) => {
            const value =
                Number(tx.in_msg?.value || 0) / 1_000_000_000;

            return value >= amount;
        });

        if (!found) {
            return NextResponse.json({
                paid: false,
            });
        }

        const admin = createServiceRoleClient();

        await admin
            .from('subscriptions')
            .upsert(
                {
                    user_id: userId,
                    plan: amount >= 3 ? 'max' : 'pro',
                    status: 'active',
                },
                {
                    onConflict: 'user_id',
                }
            );

        return NextResponse.json({
            paid: true,
        });
    } catch (e: any) {
        return NextResponse.json(
            {
                error: e.message,
            },
            { status: 500 }
        );
    }
}