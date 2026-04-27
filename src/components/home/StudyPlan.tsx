'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Task = {
    id: string;
    title: string;
    description: string;
    exam: string;
    topic: string;
    questions: number;
    difficulty: string;
    priority: 'high' | 'medium' | 'low';
    estimated_minutes: number;
};

type Plan = {
    greeting: string;
    focus_exam: string;
    tasks: Task[];
    daily_goal: number;
    tip: string;
};

export function StudyPlan({ locale }: { locale: string }) {
    const [plan, setPlan] = useState<Plan | null>(null);
    const [loading, setLoading] = useState(true);
    const [completed, setCompleted] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetch('/api/study-plan')
            .then(r => r.json())
            .then(data => { setPlan(data.plan); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12 }}>
            <div style={{ width: 28, height: 28, border: '3px solid hsl(var(--border))', borderTopColor: '#6B5CE7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
        {locale === 'ru' ? 'AI составляет твой план...' : 'AI is building your plan...'}
      </span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    if (!plan) return (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'hsl(var(--muted-foreground))' }}>
            {locale === 'ru' ? 'Не удалось загрузить план' : 'Could not load plan'}
        </div>
    );

    const completedCount = completed.size;
    const totalTasks = plan.tasks.length;
    const progress = Math.round((completedCount / totalTasks) * 100);
    const priorityColor: Record<string, string> = { high: '#E84040', medium: '#EF9F27', low: '#22C07A' };
    const priorityLabel: Record<string, string> = { high: locale === 'ru' ? 'Важно' : 'Priority', medium: locale === 'ru' ? 'Средне' : 'Medium', low: locale === 'ru' ? 'Легко' : 'Easy' };
    const diffBg: Record<string, string> = { easy: 'rgba(34,192,122,0.1)', medium: 'rgba(107,92,231,0.1)', hard: 'rgba(232,64,64,0.1)' };
    const diffColor: Record<string, string> = { easy: '#22C07A', medium: '#6B5CE7', hard: '#E84040' };

    return (
        <div>
            <div style={{ background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>
                    {new Date().toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                <div style={{ fontSize: 17, fontWeight: 500, color: '#fff', marginBottom: 14 }}>{plan.greeting}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{locale === 'ru' ? `${completedCount}/${totalTasks} задач` : `${completedCount}/${totalTasks} tasks`}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{progress}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 3 }}>
                    <div style={{ height: 6, background: '#fff', borderRadius: 3, width: `${progress}%`, transition: 'width 0.5s ease' }} />
                </div>
            </div>

            <div style={{ background: 'rgba(186,117,23,0.08)', border: '1px solid rgba(186,117,23,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, fontSize: 13 }}>
                <span>💡</span><span style={{ color: 'hsl(var(--foreground))' }}>{plan.tip}</span>
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                {locale === 'ru' ? 'Задачи на сегодня' : "Today's tasks"}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.tasks.map(task => {
                    const isDone = completed.has(task.id);
                    return (
                        <div key={task.id} style={{ background: 'hsl(var(--card))', border: `1px solid ${isDone ? '#22C07A' : 'hsl(var(--border))'}`, borderRadius: 14, padding: '16px 20px', opacity: isDone ? 0.7 : 1, transition: 'all 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 14, fontWeight: 500, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))' }}>{task.title}</span>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: priorityColor[task.priority], background: `${priorityColor[task.priority]}18`, borderRadius: 10, padding: '2px 7px' }}>{priorityLabel[task.priority]}</span>
                                        <span style={{ fontSize: 10, fontWeight: 600, color: diffColor[task.difficulty] || '#6B5CE7', background: diffBg[task.difficulty] || 'rgba(107,92,231,0.1)', borderRadius: 10, padding: '2px 7px', textTransform: 'capitalize' }}>{task.difficulty}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>{task.description}</div>
                                    <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                                        <span>📚 {task.exam}</span>
                                        <span>❓ {task.questions} {locale === 'ru' ? 'вопр.' : 'q'}</span>
                                        <span>⏱ {task.estimated_minutes} {locale === 'ru' ? 'мин' : 'min'}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                                    {isDone ? (
                                        <div style={{ background: '#22C07A', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 500, textAlign: 'center' }}>✓ {locale === 'ru' ? 'Готово' : 'Done'}</div>
                                    ) : (
                                        <Link href={`/${locale}/quiz?exam=${task.exam}&topic=${encodeURIComponent(task.topic)}`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 500, textDecoration: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            {locale === 'ru' ? 'Начать' : 'Start'} →
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: 20, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>🎯 {locale === 'ru' ? `Цель: ${plan.daily_goal} вопросов` : `Goal: ${plan.daily_goal} questions`}</span>
                {completedCount === totalTasks && <span style={{ fontSize: 13, color: '#22C07A', fontWeight: 600 }}>🎉 {locale === 'ru' ? 'Всё выполнено!' : 'All done!'}</span>}
            </div>
        </div>
    );
}