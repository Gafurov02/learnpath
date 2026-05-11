'use client';

import { useEffect } from 'react';
import NProgress from 'nprogress';
import { usePathname, useSearchParams } from 'next/navigation';

import 'nprogress/nprogress.css';

NProgress.configure({
    showSpinner: false,
    trickleSpeed: 120,
    minimum: 0.08,
});

export function TopLoader() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        NProgress.done();
    }, [pathname, searchParams]);

    useEffect(() => {
        const handleStart = () => {
            NProgress.start();
        };

        window.addEventListener('beforeunload', handleStart);

        return () => {
            window.removeEventListener(
                'beforeunload',
                handleStart
            );
        };
    }, []);

    return null;
}