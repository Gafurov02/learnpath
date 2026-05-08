'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';

export default function SupportPage({ params }: { params: Promise<{ id: string }> }) {
    const locale = useLocale();
    const router = useRouter();
    const [schoolId, setSchoolId] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => { params.then(p => setSchoolId(p.id)); }, [params]);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) { router.push(`/${locale}/auth/login`); return; }
            setUserEmail(session.user.email ?? '');
        });
    }, []);

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        setSending(true);
        // Send via mailto for now — in production use Resend API
        window.location.href = `mailto:boburbek@gafurov.cc?subject=[LearnPath Support][${priority.toUpperCase()}] ${subject}&body=${encodeURIComponent(`From: ${userEmail}\nSchool ID: ${schoolId}\nPriority: ${priority}\n\n${message}`)}`;
        setTimeout(() => { setSent(true); setSending(false); }, 1000);
    }

    const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 14, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

    const priorityConfig = {
        normal: { label: locale === 'ru' ? 'Обычный' : 'Normal', color: '#6B5CE7', time: locale === 'ru' ? 'Ответ в течение 24ч' : 'Response within 24h' },
        high:   { label: locale === 'ru' ? 'Высокий' : 'High',   color: '#EF9F27', time: locale === 'ru' ? 'Ответ в течение 4ч' : 'Response within 4h' },
        urgent: { label: locale === 'ru' ? 'Срочный' : 'Urgent', color: '#E84040', time: locale === 'ru' ? 'Ответ в течение 1ч' : 'Response within 1h' },
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
            <AppNavbar />
            <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 80px' }}>
                <Link href={`/${locale}/school/${schoolId}`} style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textDecoration: 'none', display: 'block', marginBottom: 20 }}>
                    ← {locale === 'ru' ? 'Панель' : 'Dashboard'}
                </Link>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                    <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 28, fontWeight: 400, letterSpacing: '-0.5px' }}>
                        🎯 {locale === 'ru' ? 'Приоритетная поддержка' : 'Priority Support'}
                    </h1>
                    <span style={{ background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>B2B</span>
                </div>
                <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 28 }}>
                    {locale === 'ru' ? 'Как владелец школы ты получаешь ускоренную поддержку' : 'As a school owner you get expedited support'}
                </p>

                {/* SLA cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 28 }}>
                    {Object.entries(priorityConfig).map(([p, cfg]) => (
                        <div key={p} onClick={() => setPriority(p as any)} style={{ background: priority === p ? `${cfg.color}15` : 'hsl(var(--card))', border: `1.5px solid ${priority === p ? cfg.color : 'hsl(var(--border))'}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: cfg.color, marginBottom: 4 }}>{cfg.label}</div>
                            <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{cfg.time}</div>
                        </div>
                    ))}
                </div>

                {sent ? (
                    <div style={{ textAlign: 'center', padding: '60px 24px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 20 }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
                        <h3 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>{locale === 'ru' ? 'Запрос отправлен!' : 'Request sent!'}</h3>
                        <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
                            {priorityConfig[priority].time}
                        </p>
                    </div>
                ) : (
                    <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 20, padding: 28 }}>
                        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: 6 }}>
                                    {locale === 'ru' ? 'Тема' : 'Subject'}
                                </label>
                                <input value={subject} onChange={e => setSubject(e.target.value)} required placeholder={locale === 'ru' ? 'Коротко опиши проблему' : 'Brief description of the issue'} style={inp} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: 6 }}>
                                    {locale === 'ru' ? 'Описание' : 'Description'}
                                </label>
                                <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={5} placeholder={locale === 'ru' ? 'Подробно опиши проблему или вопрос...' : 'Describe the issue or question in detail...'} style={{ ...inp, resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                                <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                                    📧 {locale === 'ru' ? 'Ответ придёт на' : 'Reply will be sent to'}: <strong>{userEmail}</strong>
                                </div>
                                <button type="submit" disabled={sending} style={{ background: sending ? '#9B8DFF' : '#6B5CE7', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 500, cursor: sending ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                                    {sending ? '...' : (locale === 'ru' ? 'Отправить запрос' : 'Send request')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* FAQ */}
                <div style={{ marginTop: 28 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>
                        {locale === 'ru' ? 'Частые вопросы' : 'Common questions'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(locale === 'ru' ? [
                            { q: 'Как добавить студентов в группу?', a: 'Поделись кодом приглашения со страницы панели управления школой.' },
                            { q: 'Как загрузить свои вопросы?', a: 'Используй функцию импорта CSV/Excel на странице Вопросы.' },
                            { q: 'Могу ли я ограничить студентов только своими вопросами?', a: 'Да, студенты в школе видят кастомные вопросы учителя. В ближайшем обновлении добавим настройку.' },
                            { q: 'Как получить доступ к API?', a: 'Создай ключ на странице API Доступ и используй его для интеграции с твоей LMS.' },
                        ] : [
                            { q: 'How do I add students to my group?', a: 'Share the invite code from your school dashboard.' },
                            { q: 'How do I upload custom questions?', a: 'Use the CSV/Excel import feature on the Questions page.' },
                            { q: "Can I restrict students to only my questions?", a: "Yes, school students see teacher's custom questions. A setting to restrict is coming soon." },
                            { q: 'How do I get API access?', a: 'Create a key on the API Access page and use it to integrate with your LMS.' },
                        ]).map(item => (
                            <div key={item.q} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: '14px 18px' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{item.q}</div>
                                <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', lineHeight: 1.6 }}>{item.a}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}