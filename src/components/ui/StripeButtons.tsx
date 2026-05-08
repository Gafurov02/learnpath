'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export function SubscribeButton({
                                    label = 'Start Pro for 0.3 TON/mo',
                                    tier = 'pro',
                                    currentPlan = 'free',
                                }: {
    label?: string;
    tier?: 'pro' | 'max';
    currentPlan?: string;
}) {
    const [loading, setLoading] = useState(false);

    const alreadySubscribed =
        currentPlan === tier ||
        currentPlan === 'max';

    async function handleClick() {
        try {
            setLoading(true);

            const loadingToast =
                toast.loading('Preparing payment...');

            const wallet =
                'UQB4Crze6EzZiHr1htiapYIb9bvreKgldnavD8oRjnsn-HKt';

            const amount =
                tier === 'max'
                    ? '3000000000'
                    : '300000000';

            const text =
                tier === 'max'
                    ? 'LearnPath MAX'
                    : 'LearnPath PRO';

            const url =
                `ton://transfer/${wallet}` +
                `?amount=${amount}` +
                `&text=${encodeURIComponent(text)}`;

            toast.dismiss(loadingToast);

            toast.success(
                tier === 'max'
                    ? 'Opening MAX payment...'
                    : 'Opening PRO payment...'
            );

            window.location.href = url;
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Something went wrong'
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            onClick={handleClick}
            disabled={loading || alreadySubscribed}
            style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                background:
                    alreadySubscribed
                        ? '#22C07A'
                        : loading
                            ? '#9B8DFF'
                            : '#6B5CE7',
                borderRadius: 10,
                padding: 12,
                fontSize: 14,
                fontWeight: 500,
                color: '#fff',
                border: 'none',
                cursor:
                    loading || alreadySubscribed
                        ? 'default'
                        : 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                opacity: loading ? 0.85 : 1,
            }}
        >
            {loading
                ? 'Opening...'
                : alreadySubscribed
                    ? tier === 'max'
                        ? 'MAX Active'
                        : 'Current Plan'
                    : label}
        </button>
    );
}

export function ManageSubscriptionButton({
                                             label = 'Manage subscription',
                                         }: {
    label?: string;
}) {
    return (
        <button
            disabled
            style={{
                border: '1px solid hsl(var(--border))',
                borderRadius: 10,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                background: 'transparent',
                color: 'hsl(var(--muted-foreground))',
                cursor: 'not-allowed',
                fontFamily: 'inherit',
                opacity: 0.7,
            }}
        >
            {label}
        </button>
    );
}