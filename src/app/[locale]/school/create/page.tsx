'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';

export default function CreateSchoolPage() {
    const locale = useLocale();
    const router = useRouter();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push(`/${locale}/auth/login`); return; }

        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Math.random().toString(36).slice(2, 6);

        const { data, error: err } = await supabase.from('schools').insert({
            owner_id: user.id,
            name: name.trim(),
            slug,
            description: description.trim(),
        }).select().single();

        if (err) { setError(err.message); setLoading(false); return; }

        // Add owner as teacher
        await supabase.from('school_members').insert({ school_id: data.id, user_id: user.id, role: 'teacher' });
        router.push(`/${locale}/school/${data.id}`);
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '12px 14px', border: '1px solid hsl(var(--border))', borderRadius: 10,
        fontSize: 14, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
            <AppNavbar />
            <main style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px' }}>
                <Link href={`/${locale}/school`} style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textDecoration: 'none', display: 'block', marginBottom: 28 }}>← {locale === 'ru' ? 'Назад' : 'Back'}</Link>
                <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 32, fontWeight: 400, letterSpacing: '-1px', marginBottom: 8 }}>
                    {locale === 'ru' ? 'Создать школу' : 'Create a school'}
                </h1>
                <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 32 }}>
                    {locale === 'ru' ? 'Пригласи студентов по коду и отслеживай их прогресс' : 'Invite students with a code and track their progress'}
                </p>

                <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 20, padding: 32 }}>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                                {locale === 'ru' ? 'Название школы *' : 'School name *'}
                            </label>
                            <input value={name} onChange={e => setName(e.target.value)} required placeholder={locale === 'ru' ? 'Например: IELTS Academy 2024' : 'e.g. IELTS Academy 2024'} style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                                {locale === 'ru' ? 'Описание (необязательно)' : 'Description (optional)'}
                            </label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder={locale === 'ru' ? 'Расскажи о курсе...' : 'Tell about the course...'} style={{ ...inputStyle, resize: 'vertical' }} />
                        </div>

                        {error && <div style={{ background: 'rgba(232,64,64,0.08)', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#E84040' }}>{error}</div>}

                        <button type="submit" disabled={loading || !name.trim()} style={{ background: loading ? '#9B8DFF' : '#6B5CE7', color: '#fff', border: 'none', borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 500, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                            {loading ? '...' : (locale === 'ru' ? 'Создать школу' : 'Create school')}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}