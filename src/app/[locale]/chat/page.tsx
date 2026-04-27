'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';

const EXAMS = ['IELTS', 'SAT', 'TOEFL', 'GMAT', 'GRE', 'ЕГЭ'];

const SUGGESTIONS: Record<string, Record<string, string[]>> = {
    IELTS: {
        en: ["What are common IELTS Reading traps?", "Explain academic vocabulary strategies", "How to structure an IELTS essay?", "What is skimming and scanning?", "Explain passive voice with examples"],
        ru: ["Какие ловушки в IELTS Reading?", "Стратегии академической лексики", "Как структурировать эссе IELTS?", "Что такое skimming и scanning?", "Объясни страдательный залог с примерами"],
    },
    SAT: {
        en: ["How do I solve quadratic equations?", "Explain the SAT essay structure", "What are common SAT math traps?", "How to improve reading speed?", "Explain linear equations with examples"],
        ru: ["Как решать квадратные уравнения?", "Структура эссе SAT", "Частые ловушки в математике SAT", "Как улучшить скорость чтения?", "Объясни линейные уравнения с примерами"],
    },
    TOEFL: {
        en: ["How to take notes for TOEFL Listening?", "Explain integrated writing task", "What score do I need for top universities?", "TOEFL vs IELTS — which is easier?", "How to improve speaking fluency?"],
        ru: ["Как делать заметки для TOEFL Listening?", "Объясни integrated writing task", "Какой балл нужен для топ-университетов?", "TOEFL vs IELTS — что проще?", "Как улучшить беглость речи?"],
    },
    GMAT: {
        en: ["Explain critical reasoning strategies", "How to approach data sufficiency?", "Common sentence correction mistakes", "GMAT vs GRE — which should I take?", "How to improve verbal score?"],
        ru: ["Стратегии critical reasoning", "Как подходить к data sufficiency?", "Частые ошибки в sentence correction", "GMAT или GRE — что выбрать?", "Как улучшить verbal результат?"],
    },
    GRE: {
        en: ["How to memorize GRE vocabulary?", "Explain quantitative comparison questions", "Text completion vs sentence equivalence", "How to improve analytical writing?", "Common GRE math formulas"],
        ru: ["Как запомнить лексику GRE?", "Объясни quantitative comparison", "Text completion vs sentence equivalence", "Как улучшить analytical writing?", "Формулы математики GRE"],
    },
    ЕГЭ: {
        en: ["Explain Russian spelling rules", "Common punctuation mistakes in ЕГЭ", "How to write ЕГЭ essay?", "Grammar rules — НН vs Н", "Explain participle clauses"],
        ru: ["Правила правописания в ЕГЭ", "Частые ошибки пунктуации", "Как писать сочинение ЕГЭ?", "Правило НН и Н в прилагательных", "Объясни причастные обороты"],
    },
};

type Message = { role: 'user' | 'assistant'; content: string };

function renderMarkdown(text: string) {
    const lines = text.split('\n');
    const result: React.ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (line.startsWith('### ')) {
            result.push(<div key={i} style={{ fontWeight: 700, fontSize: 15, marginTop: 12, marginBottom: 4 }}>{line.slice(4)}</div>);
        } else if (line.startsWith('## ')) {
            result.push(<div key={i} style={{ fontWeight: 700, fontSize: 16, marginTop: 14, marginBottom: 6 }}>{line.slice(3)}</div>);
        } else if (line.startsWith('# ')) {
            result.push(<div key={i} style={{ fontWeight: 700, fontSize: 17, marginTop: 16, marginBottom: 8 }}>{line.slice(2)}</div>);
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            result.push(
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                    <span style={{ color: '#6B5CE7', flexShrink: 0, fontWeight: 700 }}>•</span>
                    <span>{formatInline(line.slice(2))}</span>
                </div>
            );
        } else if (/^\d+\.\s/.test(line)) {
            const num = line.match(/^(\d+)\./)?.[1];
            result.push(
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                    <span style={{ color: '#6B5CE7', flexShrink: 0, fontWeight: 600, minWidth: 16 }}>{num}.</span>
                    <span>{formatInline(line.replace(/^\d+\.\s/, ''))}</span>
                </div>
            );
        } else if (line.startsWith('```')) {
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
            result.push(
                <pre key={i} style={{ background: 'rgba(107,92,231,0.1)', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, overflowX: 'auto', margin: '8px 0', fontFamily: 'monospace' }}>
          {codeLines.join('\n')}
        </pre>
            );
        } else if (line.trim() === '') {
            result.push(<div key={i} style={{ height: 6 }} />);
        } else {
            result.push(<div key={i} style={{ marginBottom: 2 }}>{formatInline(line)}</div>);
        }
        i++;
    }
    return result;
}

function formatInline(text: string): React.ReactNode {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`')) return <code key={i} style={{ background: 'rgba(107,92,231,0.15)', borderRadius: 4, padding: '1px 5px', fontSize: 13, fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
        return part;
    });
}

export default function ChatPage() {
    const locale = useLocale() as 'en' | 'ru';
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPro, setIsPro] = useState(false);
    const [checking, setChecking] = useState(true);
    const [exam, setExam] = useState('IELTS');
    const [streaming, setStreaming] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!session) { router.push(`/${locale}/auth/login`); return; }
            const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', session.user.id).single();
            setIsPro(sub?.plan === 'pro');
            setChecking(false);
        });
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streaming]);

    const send = useCallback(async (text?: string) => {
        const msg = (text || input).trim();
        if (!msg || loading) return;
        setInput('');
        setLoading(true);
        setStreaming('');
        const newMessages: Message[] = [...messages, { role: 'user', content: msg }];
        setMessages(newMessages);
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages, exam, locale }),
            });
            if (!res.ok) { setLoading(false); return; }
            const reader = res.body!.getReader();
            const decoder = new TextDecoder();
            let full = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                full += decoder.decode(value);
                setStreaming(full);
            }
            setMessages([...newMessages, { role: 'assistant', content: full }]);
            setStreaming('');
        } catch {}
        setLoading(false);
    }, [input, messages, exam, locale, loading]);

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    }

    const spinner = (
        <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 28, height: 28, border: '3px solid hsl(var(--border))', borderTopColor: '#6B5CE7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
    );

    const upsell = (
        <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
            <AppNavbar />
            <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 52, marginBottom: 20 }}>🤖</div>
                <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 28, fontWeight: 400, marginBottom: 12 }}>
                    {locale === 'ru' ? 'AI Тьютор' : 'AI Tutor'}
                </h1>
                <p style={{ fontSize: 15, color: 'hsl(var(--muted-foreground))', lineHeight: 1.65, marginBottom: 28 }}>
                    {locale === 'ru'
                        ? 'Задавай любые вопросы AI тьютору — он объяснит концепции, разберёт ошибки и поможет подготовиться к экзамену.'
                        : "Ask your AI tutor anything — it explains concepts, breaks down mistakes, and helps you prepare for exams."}
                </p>
                <Link href={`/${locale}/pricing`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 12, padding: '13px 32px', fontSize: 15, fontWeight: 500, textDecoration: 'none', display: 'inline-block' }}>
                    {locale === 'ru' ? 'Перейти на Pro →' : 'Upgrade to Pro →'}
                </Link>
                <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginTop: 16 }}>
                    {locale === 'ru' ? 'AI чат — эксклюзивная Pro функция' : 'AI chat is a Pro-exclusive feature'}
                </p>
            </div>
        </div>
    );

    if (checking) return spinner;
    if (!isPro) return upsell;

    const suggestions = (SUGGESTIONS[exam] || SUGGESTIONS['IELTS'])[locale] || SUGGESTIONS['IELTS']['en'];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))', display: 'flex', flexDirection: 'column' }}>
            <AppNavbar />

            <div style={{ borderBottom: '1px solid hsl(var(--border))', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{locale === 'ru' ? 'AI Тьютор' : 'AI Tutor'}</div>
                        <div style={{ fontSize: 11, color: '#22C07A' }}>● {locale === 'ru' ? 'Онлайн' : 'Online'}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {EXAMS.map(e => (
                        <button key={e} onClick={() => setExam(e)} style={{ padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 500, border: `1px solid ${exam === e ? '#6B5CE7' : 'hsl(var(--border))'}`, background: exam === e ? '#6B5CE7' : 'transparent', color: exam === e ? '#fff' : 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit' }}>
                            {e}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxWidth: 760, width: '100%', margin: '0 auto', padding: '20px 16px 140px' }}>
                {messages.length === 0 && !streaming && (
                    <div style={{ textAlign: 'center', paddingTop: 40, paddingBottom: 32 }}>
                        <div style={{ fontSize: 44, marginBottom: 12 }}>💬</div>
                        <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 24, fontWeight: 400, marginBottom: 8 }}>
                            {locale === 'ru' ? `Привет! Я твой ${exam} тьютор` : `Hi! I'm your ${exam} tutor`}
                        </h2>
                        <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 28 }}>
                            {locale === 'ru' ? 'Задай любой вопрос по экзамену' : "Ask me anything about your exam"}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420, margin: '0 auto' }}>
                            {suggestions.map(s => (
                                <button key={s} onClick={() => send(s)} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: 'hsl(var(--foreground))', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        {m.role === 'assistant' && (
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 2 }}>🤖</div>
                        )}
                        <div style={{ maxWidth: '80%', background: m.role === 'user' ? '#6B5CE7' : 'hsl(var(--card))', color: m.role === 'user' ? '#fff' : 'hsl(var(--foreground))', border: m.role === 'assistant' ? '1px solid hsl(var(--border))' : 'none', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '12px 16px', fontSize: 14, lineHeight: 1.65 }}>
                            {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
                        </div>
                        {m.role === 'user' && (
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 2 }}>👤</div>
                        )}
                    </div>
                ))}

                {streaming && (
                    <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 2 }}>🤖</div>
                        <div style={{ maxWidth: '80%', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '18px 18px 18px 4px', padding: '12px 16px', fontSize: 14, lineHeight: 1.65, color: 'hsl(var(--foreground))' }}>
                            {renderMarkdown(streaming)}
                            <span style={{ display: 'inline-block', width: 6, height: 14, background: '#6B5CE7', borderRadius: 2, marginLeft: 3, animation: 'blink 1s infinite' }} />
                        </div>
                    </div>
                )}

                {loading && !streaming && (
                    <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🤖</div>
                        <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '18px 18px 18px 4px', padding: '14px 18px', display: 'flex', gap: 5, alignItems: 'center' }}>
                            {[0,1,2].map(j => (
                                <div key={j} style={{ width: 7, height: 7, borderRadius: '50%', background: '#6B5CE7', animation: `bounce 1.2s ${j * 0.2}s infinite` }} />
                            ))}
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'hsl(var(--background))', borderTop: '1px solid hsl(var(--border))', padding: '10px 16px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }} className="chat-input-bar">
                <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={locale === 'ru' ? 'Задай вопрос тьютору...' : 'Ask your tutor anything...'}
              rows={1}
              style={{ flex: 1, padding: '10px 14px', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 14, background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontFamily: 'inherit', outline: 'none', resize: 'none', lineHeight: 1.5 }}
              onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; }}
          />
                    <button onClick={() => send()} disabled={!input.trim() || loading} style={{ width: 40, height: 40, borderRadius: 12, background: input.trim() && !loading ? '#6B5CE7' : 'hsl(var(--muted))', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, color: input.trim() && !loading ? '#fff' : 'hsl(var(--muted-foreground))' }}>
                        ↑
                    </button>
                </div>
                <style>{`.chat-input-bar { z-index: 40 !important; } @media(max-width:768px){ .chat-input-bar { bottom: 65px !important; } }`}</style>
            </div>
        </div>
    );
}