const CACHE_NAME = 'learnpath-v1';
const OFFLINE_URL = '/offline';

// Static assets to cache immediately
const STATIC_ASSETS = [
    '/offline',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and API calls (except offline-quiz)
    if (request.method !== 'GET') return;
    if (url.pathname.startsWith('/api/') && url.pathname !== '/api/offline-quiz') return;

    // Network-first for navigation (pages)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(res => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    return res;
                })
                .catch(() => caches.match(request).then(cached => cached || caches.match(OFFLINE_URL)))
        );
        return;
    }

    // Cache-first for static assets
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(res => {
                if (res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                }
                return res;
            });
        })
    );
});

// Listen for cache-questions message from app
self.addEventListener('message', event => {
    if (event.data?.type === 'CACHE_QUESTIONS') {
        const questions = event.data.questions;
        caches.open(CACHE_NAME).then(cache => {
            cache.put('/api/offline-quiz', new Response(JSON.stringify(questions), {
                headers: { 'Content-Type': 'application/json' }
            }));
        });
    }
});