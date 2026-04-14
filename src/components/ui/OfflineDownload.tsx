'use client';

import { useState, useEffect } from 'react';

type Props = {
    exam: string;
    isPro: boolean;
    locale: string;
};

export function OfflineDownload({ exam, isPro, locale }: Props) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [cached, setCached] = useState(false);

    useEffect(() => {
        // Check if already cached
        if ('caches' in window) {
            caches.open('learnpath-v1').then(cache =>
                cache.match('/api/offline-quiz').then(res => setCached(!!res))
            );
        }
    }, []);

    if (!isPro) return null;

    async function handleDownload() {
        setStatus('loading');
        try {
            const res = await fetch('/api/cache-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exam, count: 30 }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Send to service worker
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'CACHE_QUESTIONS',
                    questions: data.questions,
                });
            }
            setCached(true);
            setStatus('done');
            setTimeout(() => setStatus('idle'), 3000);
        } catch {
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    }

    const labels: Record<string, Record<string, string>> = {
        idle:    { en: cached ? '✓ Offline ready' : '⬇ Download for offline', ru: cached ? '✓ Готово офлайн' : '⬇ Скачать офлайн' },
        loading: { en: 'Downloading...', ru: 'Скачиваю...' },
        done:    { en: '✓ Saved!', ru: '✓ Сохранено!' },
        error:   { en: 'Error. Try again', ru: 'Ошибка. Попробуй снова' },
    };

    const colors: Record<string, string> = { idle: cached ? '#22C07A' : '#6B5CE7', loading: '#9B8DFF', done: '#22C07A', error: '#E84040' };

    return (
        <button
            onClick={status === 'idle' ? handleDownload : undefined}
            disabled={status === 'loading'}
            style={{
                background: 'transparent',
                border: `1px solid ${colors[status]}`,
                borderRadius: 8, padding: '6px 14px',
                fontSize: 12, fontWeight: 500,
                color: colors[status],
                cursor: status === 'idle' ? 'pointer' : 'default',
                fontFamily: 'inherit', transition: 'all 0.2s',
                whiteSpace: 'nowrap',
            }}
        >
            {labels[status][locale] || labels[status]['en']}
        </button>
    );
}