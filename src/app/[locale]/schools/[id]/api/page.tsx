'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';

type ApiKey = { id: string; name: string; key_preview: string; active: boolean; last_used: string | null; requests: number; created_at: string };

export default function ApiAccessPage({ params }: { params: Promise<{ id: string }> }) {
    const locale = useLocale();
    const router = useRouter();
    const [schoolId, setSchoolId] = useState('');
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [newKeyName, setNewKeyName] = useState('');
    const [creating, setCreating] = useState(false);
    const [newKey, setNewKey] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => { params.then(p => setSchoolId(p.id)); }, [params]);

    async function loadKeys() {
        const res = await fetch(`/api/school/api-keys?school_id=${schoolId}`);
        const data = await res.json();
        setKeys(data.keys ?? []);
    }

    useEffect(() => {
        if (!schoolId) return;
        const supabase = createClient();
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!session) { router.push(`/${locale}/auth/login`); return; }
            await loadKeys();
            setLoading(false);
        });
    }, [schoolId]);

    async function createKey() {
        setCreating(true);
        const res = await fetch('/api/school/api-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ school_id: schoolId, name: newKeyName || 'Default key' }),
        });
        const data = await res.json();
        setNewKey(data.key);
        setNewKeyName('');
        setCreating(false);
        await loadKeys();
    }

    async function deleteKey(id: string) {
        await fetch('/api/school/api-keys', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        setKeys(prev => prev.filter(k => k.id !== id));
    }

    function copyKey() {
        navigator.clipboard.writeText(newKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const inp: React.CSSProperties = { padding: '10px 14px', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 14, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', fontFamily: 'inherit', outline: 'none' };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
            <AppNavbar />
            <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px 80px' }}>
                <Link href={`/${locale}/school/${schoolId}`} style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textDecoration: 'none', display: 'block', marginBottom: 20 }}>
                    ← {locale === 'ru' ? 'Панель' : 'Dashboard'}
                </Link>

                <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 28, fontWeight: 400, letterSpacing: '-0.5px', marginBottom: 8 }}>
                    🔑 {locale === 'ru' ? 'API Доступ' : 'API Access'}
                </h1>
                <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 28 }}>
                    {locale === 'ru' ? 'Интегрируй LearnPath в свои приложения и LMS системы' : 'Integrate LearnPath into your apps and LMS systems'}
                </p>

                {/* New key revealed */}
                {newKey && (
                    <div style={{ background: 'rgba(34,192,122,0.08)', border: '1px solid rgba(34,192,122,0.3)', borderRadius: 14, padding: 20, marginBottom: 24 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#22C07A', marginBottom: 8 }}>
                            ✓ {locale === 'ru' ? 'Ключ создан — сохрани его сейчас!' : 'Key created — save it now!'}
                        </div>
                        <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 12 }}>
                            {locale === 'ru' ? 'Ключ показывается только один раз. После закрытия восстановить невозможно.' : 'The key is shown only once. You cannot retrieve it after closing.'}
                        </p>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <code style={{ flex: 1, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                {newKey}
                            </code>
                            <button onClick={copyKey} style={{ background: copied ? '#22C07A' : '#6B5CE7', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                                {copied ? '✓' : locale === 'ru' ? 'Копировать' : 'Copy'}
                            </button>
                        </div>
                        <button onClick={() => setNewKey('')} style={{ marginTop: 12, background: 'transparent', border: 'none', fontSize: 12, color: 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit' }}>
                            {locale === 'ru' ? 'Скрыть' : 'Dismiss'}
                        </button>
                    </div>
                )}

                {/* Create key */}
                <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, padding: 24, marginBottom: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 14 }}>
                        {locale === 'ru' ? 'Создать новый ключ' : 'Create new key'}
                    </h3>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder={locale === 'ru' ? 'Название ключа (необязательно)' : 'Key name (optional)'} style={{ ...inp, flex: 1, minWidth: 200 }} />
                        <button onClick={createKey} disabled={creating} style={{ background: creating ? '#9B8DFF' : '#6B5CE7', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: creating ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                            {creating ? '...' : (locale === 'ru' ? 'Создать' : 'Create')}
                        </button>
                    </div>
                </div>

                {/* Keys list */}
                <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>
                    {locale === 'ru' ? 'Активные ключи' : 'Active keys'} {keys.length > 0 && `(${keys.length})`}
                </h3>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'hsl(var(--muted-foreground))' }}>...</div>
                ) : keys.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'hsl(var(--muted-foreground))', fontSize: 14 }}>
                        {locale === 'ru' ? 'Ключей пока нет' : 'No keys yet'}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {keys.map(k => (
                            <div key={k.id} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontSize: 14, fontWeight: 500 }}>{k.name}</span>
                                        <span style={{ fontSize: 10, background: k.active ? 'rgba(34,192,122,0.1)' : 'hsl(var(--muted))', color: k.active ? '#22C07A' : 'hsl(var(--muted-foreground))', borderRadius: 10, padding: '2px 8px', fontWeight: 600 }}>
                      {k.active ? (locale === 'ru' ? 'Активен' : 'Active') : (locale === 'ru' ? 'Отключён' : 'Inactive')}
                    </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                                        <code style={{ fontFamily: 'monospace' }}>{k.key_preview}</code>
                                        <span>{k.requests} {locale === 'ru' ? 'запросов' : 'requests'}</span>
                                        {k.last_used && <span>{locale === 'ru' ? 'Последний запрос:' : 'Last used:'} {new Date(k.last_used).toLocaleDateString()}</span>}
                                        <span>{locale === 'ru' ? 'Создан:' : 'Created:'} {new Date(k.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <button onClick={() => deleteKey(k.id)} style={{ background: 'transparent', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#E84040', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    {locale === 'ru' ? 'Удалить' : 'Revoke'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Docs */}
                <div style={{ marginTop: 32, background: 'rgba(107,92,231,0.06)', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 16, padding: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>
                        📖 {locale === 'ru' ? 'Как использовать API' : 'How to use the API'}
                    </h3>
                    <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 14 }}>
                        {locale === 'ru' ? 'Передай ключ в заголовке запроса:' : 'Pass the key in the request header:'}
                    </p>
                    <pre style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: '14px 16px', fontSize: 13, overflowX: 'auto', fontFamily: 'monospace' }}>
{`curl https://gafurov.cc/api/v1/quiz \\
  -H "Authorization: Bearer lp_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"exam": "IELTS", "difficulty": "medium"}'`}
          </pre>
                    <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 12 }}>
                        {locale === 'ru' ? 'Доступные эндпоинты: /api/v1/quiz, /api/v1/study-plan, /api/v1/progress' : 'Available endpoints: /api/v1/quiz, /api/v1/study-plan, /api/v1/progress'}
                    </p>
                </div>
            </main>
        </div>
    );
}