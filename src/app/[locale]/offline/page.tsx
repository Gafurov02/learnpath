'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ExplanationBlock } from '@/components/quiz/ExplanationBlock';

type Question = {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    topic: string;
    exam: string;
};

export default function OfflinePage() {
    const locale = useLocale();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [qIndex, setQIndex] = useState(0);
    const [answered, setAnswered] = useState(false);
    const [selected, setSelected] = useState<number | null>(null);
    const [score, setScore] = useState({ correct: 0, total: 0 });
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        setIsOnline(navigator.onLine);
        window.addEventListener('online', () => setIsOnline(true));
        window.addEventListener('offline', () => setIsOnline(false));

        // Load cached questions
        caches.open('learnpath-v1').then(cache =>
            cache.match('/api/offline-quiz').then(res => {
                if (res) res.json().then(data => setQuestions(data));
            })
        ).catch(() => {});
    }, []);

    if (questions.length === 0) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <div style={{ textAlign: 'center', maxWidth: 400 }}>
                    <div style={{ fontSize: 56, marginBottom: 20 }}>📡</div>
                    <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 28, fontWeight: 400, marginBottom: 12, color: 'hsl(var(--foreground))' }}>
                        {locale === 'ru' ? 'Нет подключения' : 'No connection'}
                    </h1>
                    <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, marginBottom: 24 }}>
                        {locale === 'ru'
                            ? 'Вопросы не загружены для офлайн режима. Подключись к интернету и нажми "Скачать для офлайн" на странице Practice.'
                            : 'No questions cached for offline mode. Connect to internet and tap "Download for offline" on the Practice page.'}
                    </p>
                    {isOnline && (
                        <Link href={`/${locale}/quiz`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                            {locale === 'ru' ? 'Перейти к практике →' : 'Go to Practice →'}
                        </Link>
                    )}
                </div>
            </div>
        );
    }

    const q = questions[qIndex];
    const letters = ['A', 'B', 'C', 'D'];
    const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

    function handleAnswer(i: number) {
        if (answered) return;
        setAnswered(true);
        setSelected(i);
        const correct = i === q.correctIndex;
        setScore(p => ({ correct: p.correct + (correct ? 1 : 0), total: p.total + 1 }));
    }

    function handleNext() {
        setQIndex(p => (p + 1) % questions.length);
        setAnswered(false);
        setSelected(null);
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
            <nav style={{ borderBottom: '1px solid hsl(var(--border))', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link href={`/${locale}/home`} style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 20, color: 'hsl(var(--foreground))', textDecoration: 'none' }}>
                    Learn<span style={{ color: '#6B5CE7' }}>Path</span>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: isOnline ? '#22C07A' : 'hsl(var(--muted-foreground))' }}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
                    <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{score.correct}/{score.total} · {accuracy}%</span>
                </div>
            </nav>

            <main style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
                        📦 {locale === 'ru' ? 'Офлайн режим' : 'Offline mode'} · {qIndex + 1}/{questions.length}
                    </div>
                    <span style={{ fontSize: 11, background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>⭐ PRO</span>
                </div>

                <div style={{ height: 3, background: 'hsl(var(--border))', borderRadius: 2, marginBottom: 24 }}>
                    <div style={{ height: 3, background: '#6B5CE7', borderRadius: 2, width: `${((qIndex + 1) / questions.length) * 100}%`, transition: 'width 0.4s' }} />
                </div>

                <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 20, padding: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#6B5CE7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{q.exam} · {q.topic}</span>
                    </div>

                    <p style={{ fontSize: 17, lineHeight: 1.7, marginBottom: 24, fontWeight: 300 }}>{q.question}</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {q.options.map((opt, i) => {
                            let bg = 'transparent', border = 'hsl(var(--border))', color = 'hsl(var(--foreground))';
                            let lBg = 'hsl(var(--muted))', lColor = 'hsl(var(--muted-foreground))';
                            if (answered) {
                                if (i === q.correctIndex) { bg = 'rgba(34,192,122,0.1)'; border = '#22C07A'; lBg = '#22C07A'; lColor = '#fff'; }
                                else if (i === selected) { bg = 'rgba(232,64,64,0.1)'; border = '#E84040'; lBg = '#E84040'; lColor = '#fff'; }
                                else { color = 'hsl(var(--muted-foreground))'; }
                            }
                            return (
                                <button key={i} onClick={() => handleAnswer(i)} disabled={answered} style={{ display: 'flex', alignItems: 'center', gap: 12, background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '13px 16px', color, cursor: answered ? 'default' : 'pointer', textAlign: 'left', fontSize: 14, fontFamily: 'inherit', width: '100%' }}>
                                    <span style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: lBg, color: lColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>{letters[i]}</span>
                                    {opt}
                                </button>
                            );
                        })}
                    </div>

                    {answered && (
                        <ExplanationBlock explanation={q.explanation} isPro={true} locale={locale} locale_link={locale} />
                    )}
                </div>

                {answered && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                        <button onClick={handleNext} style={{ background: '#6B5CE7', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {locale === 'ru' ? 'Следующий →' : 'Next →'}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}