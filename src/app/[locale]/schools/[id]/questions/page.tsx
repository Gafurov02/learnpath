'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';

const EXAMS = ['IELTS', 'SAT', 'TOEFL', 'GMAT', 'GRE', 'ЕГЭ'];

type Question = { id: string; exam: string; topic: string; question: string; options: string[]; correct_index: number; explanation: string; difficulty: string; active: boolean };

export default function QuestionsPage({ params }: { params: Promise<{ id: string }> }) {
    const locale = useLocale();
    const router = useRouter();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [schoolId, setSchoolId] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ exam: 'IELTS', topic: '', question: '', options: ['', '', '', ''], correct_index: 0, explanation: '', difficulty: 'medium' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { params.then(p => setSchoolId(p.id)); }, [params]);

    useEffect(() => {
        if (!schoolId) return;
        const supabase = createClient();
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!session) { router.push(`/${locale}/auth/login`); return; }
            const { data } = await supabase.from('custom_questions').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });
            setQuestions(data ?? []);
            setLoading(false);
        });
    }, [schoolId]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('custom_questions').insert({ school_id: schoolId, created_by: user.id, ...form, options: form.options });
        const { data } = await supabase.from('custom_questions').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });
        setQuestions(data ?? []);
        setShowForm(false);
        setForm({ exam: 'IELTS', topic: '', question: '', options: ['', '', '', ''], correct_index: 0, explanation: '', difficulty: 'medium' });
        setSaving(false);
    }

    async function handleToggle(id: string, active: boolean) {
        const supabase = createClient();
        await supabase.from('custom_questions').update({ active: !active }).eq('id', id);
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, active: !active } : q));
    }

    async function handleDelete(id: string) {
        const supabase = createClient();
        await supabase.from('custom_questions').delete().eq('id', id);
        setQuestions(prev => prev.filter(q => q.id !== id));
    }

    const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 14, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
            <AppNavbar />
            <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <Link href={`/${locale}/school/${schoolId}`} style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textDecoration: 'none', display: 'block', marginBottom: 8 }}>← {locale === 'ru' ? 'Панель' : 'Dashboard'}</Link>
                        <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 28, fontWeight: 400, letterSpacing: '-0.5px' }}>
                            {locale === 'ru' ? 'Кастомные вопросы' : 'Custom questions'}
                        </h1>
                    </div>
                    <button onClick={() => setShowForm(!showForm)} style={{ background: '#6B5CE7', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                        + {locale === 'ru' ? 'Добавить вопрос' : 'Add question'}
                    </button>
                </div>

                {/* Form */}
                {showForm && (
                    <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, padding: 24, marginBottom: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>{locale === 'ru' ? 'Новый вопрос' : 'New question'}</h3>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 5, color: 'hsl(var(--muted-foreground))' }}>Exam</label>
                                    <select value={form.exam} onChange={e => setForm(p => ({ ...p, exam: e.target.value }))} style={{ ...inp }}>
                                        {EXAMS.map(e => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 5, color: 'hsl(var(--muted-foreground))' }}>Topic</label>
                                    <input value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))} required placeholder="Topic name" style={inp} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 5, color: 'hsl(var(--muted-foreground))' }}>Difficulty</label>
                                    <select value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))} style={{ ...inp }}>
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 5, color: 'hsl(var(--muted-foreground))' }}>Question</label>
                                <textarea value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))} required rows={3} style={{ ...inp, resize: 'vertical' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 8, color: 'hsl(var(--muted-foreground))' }}>
                                    {locale === 'ru' ? 'Варианты ответа (отметь правильный)' : 'Answer options (mark correct)'}
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {form.options.map((opt, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <input type="radio" name="correct" checked={form.correct_index === i} onChange={() => setForm(p => ({ ...p, correct_index: i }))} style={{ width: 16, height: 16, accentColor: '#6B5CE7', flexShrink: 0 }} />
                                            <span style={{ fontSize: 12, width: 20, color: 'hsl(var(--muted-foreground))' }}>{['A', 'B', 'C', 'D'][i]}</span>
                                            <input value={opt} onChange={e => setForm(p => ({ ...p, options: p.options.map((o, j) => j === i ? e.target.value : o) }))} required placeholder={`Option ${['A', 'B', 'C', 'D'][i]}`} style={{ ...inp, flex: 1 }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 5, color: 'hsl(var(--muted-foreground))' }}>Explanation</label>
                                <textarea value={form.explanation} onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))} rows={2} style={{ ...inp, resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="submit" disabled={saving} style={{ background: '#6B5CE7', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                                    {saving ? '...' : (locale === 'ru' ? 'Сохранить' : 'Save')}
                                </button>
                                <button type="button" onClick={() => setShowForm(false)} style={{ background: 'transparent', border: '1px solid hsl(var(--border))', borderRadius: 8, padding: '10px 20px', fontSize: 14, color: 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    {locale === 'ru' ? 'Отмена' : 'Cancel'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Questions list */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'hsl(var(--muted-foreground))' }}>Loading...</div>
                ) : questions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'hsl(var(--muted-foreground))' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
                        <p>{locale === 'ru' ? 'Вопросов пока нет. Создай первый!' : 'No questions yet. Create the first one!'}</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {questions.map(q => (
                            <div key={q.id} style={{ background: 'hsl(var(--card))', border: `1px solid ${q.active ? 'hsl(var(--border))' : 'hsl(var(--muted))'}`, borderRadius: 14, padding: '16px 20px', opacity: q.active ? 1 : 0.6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 11, background: 'rgba(107,92,231,0.1)', color: '#6B5CE7', borderRadius: 10, padding: '2px 8px', fontWeight: 600 }}>{q.exam}</span>
                                            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{q.topic}</span>
                                            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', textTransform: 'capitalize' }}>{q.difficulty}</span>
                                        </div>
                                        <p style={{ fontSize: 14, marginBottom: 0, color: 'hsl(var(--foreground))' }}>{q.question}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        <button onClick={() => handleToggle(q.id, q.active)} style={{ background: 'transparent', border: '1px solid hsl(var(--border))', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit' }}>
                                            {q.active ? (locale === 'ru' ? 'Скрыть' : 'Hide') : (locale === 'ru' ? 'Показать' : 'Show')}
                                        </button>
                                        <button onClick={() => handleDelete(q.id)} style={{ background: 'transparent', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#E84040', cursor: 'pointer', fontFamily: 'inherit' }}>
                                            {locale === 'ru' ? 'Удалить' : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}