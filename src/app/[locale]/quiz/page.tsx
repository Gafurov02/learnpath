'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { Navbar } from '@/components/layout/Navbar';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { createClient } from '@/lib/supabase';
import { FREE_LIMITS, ALL_EXAMS } from '@/lib/limits';
import { ExplanationBlock } from '@/components/quiz/ExplanationBlock';
import { hasProAccess } from '@/lib/subscription';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

type Question = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
  difficulty: string;
};

export default function QuizPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const initialExam = searchParams.get('exam') || 'IELTS';
  const initialTopic = searchParams.get('topic') || '';

  const [exam, setExam] = useState(initialExam);
  const [difficulty, setDifficulty] = useState('medium');
  const [question, setQuestion] = useState<Question | null>(null);
  const [nextQuestion, setNextQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [prefetching, setPrefetching] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [limitError, setLimitError] = useState<'daily' | 'exam' | null>(null);
  const [showExamPicker, setShowExamPicker] = useState(false);
  const [isProQuestion, setIsProQuestion] = useState(false);
  const [quizMode, setQuizMode] = useState<'ai' | 'school'>('ai');
  const [hasSchool, setHasSchool] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setUser(session.user);

      const { data: sub } = await supabase.from('subscriptions').select('plan, status').eq('user_id', session.user.id).single();
      setIsPro(hasProAccess(sub));

      const { data: membership } = await supabase.from('school_members').select('school_id').eq('user_id', session.user.id).limit(1).single();
      if (membership?.school_id) setHasSchool(true);

      // Get daily count
      const today = new Date(); today.setHours(0,0,0,0);
      const { count } = await supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).gte('created_at', today.toISOString());
      setDailyCount(count ?? 0);

      // Get selected exams
      const { data: sel } = await supabase.from('user_exam_selection').select('exams').eq('user_id', session.user.id).single();
      if (sel?.exams && sel.exams.length > 0) {
        setSelectedExams(sel.exams);
        // If current exam not in selection, switch to first selected
        if (!sel.exams.includes(exam)) setExam(sel.exams[0]);
      } else {
        // No selection yet — show picker
        setShowExamPicker(true);
      }
    });
  }, []);

  async function fetchQuestion(signal?: AbortSignal): Promise<Question | null> {
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam, difficulty, locale, topic: initialTopic || undefined, mode: quizMode }),
        signal,
      });
      if (res.status === 403) {
        const data = await res.json();
        if (data.error === 'daily_limit_reached') setLimitError('daily');
        else if (data.error === 'exam_not_selected') setLimitError('exam');
        return null;
      }
      const data = await res.json();
      if (data.question) {
        setIsProQuestion(data.isPro ?? false);
        return data.question;
      }
      return null;
    } catch {
      return null;
    }
  }

  const generateQuestion = useCallback(async () => {
    setLoading(true);
    setAnswered(false);
    setSelected(null);
    setLimitError(null);

    // Use prefetched question if available
    if (nextQuestion) {
      setQuestion(nextQuestion);
      setNextQuestion(null);
      setLoading(false);
      // Prefetch next in background
      fetchQuestion().then(q => { if (q) setNextQuestion(q); });
      return;
    }

    const q = await fetchQuestion();
    setQuestion(q);
    setLoading(false);

    // Prefetch next question in background
    if (q) {
      fetchQuestion().then(next => { if (next) setNextQuestion(next); });
    }
  }, [exam, difficulty, locale, initialTopic, nextQuestion]);

  useEffect(() => {
    if (!showExamPicker) generateQuestion();
  }, [exam, difficulty, showExamPicker]);

  async function handleAnswer(i: number) {
    if (answered || !question) return;
    setAnswered(true);
    setSelected(i);
    const correct = i === question.correctIndex;
    setScore(p => ({ correct: p.correct + (correct ? 1 : 0), total: p.total + 1 }));
    if (correct) setStreak(p => p + 1); else setStreak(0);
    setDailyCount(p => p + 1);

    if (user) {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam, topic: initialTopic || question.topic, correct, difficulty }),
      });
      await fetch('/api/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xpGained: correct ? 10 : 2, correct: score.correct + (correct ? 1 : 0), totalAnswered: score.total + 1, streak, sessionCorrect: score.correct + (correct ? 1 : 0), sessionTotal: score.total + 1 }),
      });
    }
  }

  async function saveExamSelection(exams: string[]) {
    if (!user) return;
    const supabase = createClient();
    await supabase.from('user_exam_selection').upsert({ user_id: user.id, exams });
    setSelectedExams(exams);
    setExam(exams[0]);
    setShowExamPicker(false);
  }

  const letters = ['A', 'B', 'C', 'D'];
  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  const questionsLeft = isPro ? null : FREE_LIMITS.questionsPerDay - dailyCount;
  const availableExams = isPro ? ALL_EXAMS : (selectedExams.length > 0 ? selectedExams : ALL_EXAMS);

  // Exam picker for free users
  if (showExamPicker && !isPro) {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
          {user ? <AppNavbar /> : <Navbar />}
          <main style={{ maxWidth: 560, margin: '0 auto', padding: '60px 24px' }}>
            <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 32, fontWeight: 400, letterSpacing: '-1px', marginBottom: 8, textAlign: 'center' }}>
              {locale === 'ru' ? 'Выбери 2 экзамена' : 'Choose 2 exams'}
            </h1>
            <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', textAlign: 'center', marginBottom: 32 }}>
              {locale === 'ru'
                  ? 'На бесплатном плане доступно 2 экзамена. Выбери сейчас — изменить можно в профиле.'
                  : 'Free plan includes 2 exams. Choose now — you can change them in your profile.'}
            </p>

            <ExamPickerGrid
                selected={selectedExams}
                onToggle={(e) => {
                  setSelectedExams(prev =>
                      prev.includes(e) ? prev.filter(x => x !== e) : prev.length < 2 ? [...prev, e] : prev
                  );
                }}
                locale={locale}
            />

            <button
                onClick={() => selectedExams.length === 2 ? saveExamSelection(selectedExams) : null}
                disabled={selectedExams.length !== 2}
                style={{ width: '100%', background: selectedExams.length === 2 ? '#6B5CE7' : 'hsl(var(--muted))', color: selectedExams.length === 2 ? '#fff' : 'hsl(var(--muted-foreground))', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 500, cursor: selectedExams.length === 2 ? 'pointer' : 'default', fontFamily: 'inherit', marginTop: 24 }}>
              {locale === 'ru' ? `Начать практику (${selectedExams.length}/2)` : `Start practicing (${selectedExams.length}/2)`}
            </button>

            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
              {locale === 'ru' ? 'Хочешь все экзамены? ' : 'Want all exams? '}
              <Link href={`/${locale}/pricing`} style={{ color: '#6B5CE7', textDecoration: 'none', fontWeight: 500 }}>
                {locale === 'ru' ? 'Перейти на Pro →' : 'Upgrade to Pro →'}
              </Link>
            </p>
          </main>
        </div>
    );
  }

  return (
      <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
        {user ? <AppNavbar /> : <Navbar />}
        <main style={{ maxWidth: 760, margin: '0 auto', padding: '16px 16px 80px' }}>

          {/* Header — hidden on mobile */}
          <div className="lp-desktop-only" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <Link href={user ? `/${locale}/home` : `/${locale}`} style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textDecoration: 'none' }}>← {locale === 'ru' ? 'Назад' : 'Back'}</Link>
            <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'hsl(var(--muted-foreground))', alignItems: 'center' }}>
              <span>✓ <strong style={{ color: '#22C07A' }}>{score.correct}</strong></span>
              <span>{locale === 'ru' ? 'Всего' : 'Total'}: <strong>{score.total}</strong></span>
              <span>{locale === 'ru' ? 'Точность' : 'Accuracy'}: <strong>{accuracy}%</strong></span>
              {streak >= 3 && <span style={{ color: '#EF9F27' }}>🔥 {streak}</span>}
            </div>
          </div>

          {/* Mobile score bar */}
          <div className="lp-mobile-only" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '8px 4px' }}>
            <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
              <span>✓ <strong style={{ color: '#22C07A' }}>{score.correct}</strong></span>
              <span style={{ color: 'hsl(var(--muted-foreground))' }}>{score.total} {locale === 'ru' ? 'всего' : 'total'}</span>
              <span style={{ color: accuracy >= 70 ? '#22C07A' : 'hsl(var(--muted-foreground))' }}>{accuracy}%</span>
              {streak >= 3 && <span style={{ color: '#EF9F27' }}>🔥{streak}</span>}
            </div>
          </div>

          {/* Free plan info bar */}
          {!isPro && user && (
              <div style={{ background: questionsLeft === 0 ? 'rgba(232,64,64,0.08)' : 'rgba(107,92,231,0.06)', border: `1px solid ${questionsLeft === 0 ? 'rgba(232,64,64,0.2)' : 'rgba(107,92,231,0.15)'}`, borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, color: questionsLeft === 0 ? '#E84040' : 'hsl(var(--muted-foreground))' }}>
              {questionsLeft === 0
                  ? (locale === 'ru' ? '⚠ Лимит на сегодня исчерпан' : '⚠ Daily limit reached')
                  : (locale === 'ru' ? `Осталось сегодня: ${questionsLeft}/${FREE_LIMITS.questionsPerDay}` : `Today: ${questionsLeft}/${FREE_LIMITS.questionsPerDay} left`)}
            </span>
                <Link href={`/${locale}/pricing`} style={{ fontSize: 12, color: '#6B5CE7', textDecoration: 'none', fontWeight: 500 }}>
                  {locale === 'ru' ? 'Безлимит в Pro →' : 'Unlimited with Pro →'}
                </Link>
              </div>
          )}

          {/* Exam tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {availableExams.map(e => (
                <button key={e} onClick={() => setExam(e)} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: `1px solid ${exam === e ? '#6B5CE7' : 'hsl(var(--border))'}`, background: exam === e ? '#6B5CE7' : 'transparent', color: exam === e ? '#fff' : 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{e}</button>
            ))}
            {!isPro && (
                <button onClick={() => setShowExamPicker(true)} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, border: '1px dashed hsl(var(--border))', background: 'transparent', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {locale === 'ru' ? '✎ Изменить' : '✎ Change'}
                </button>
            )}
          </div>

          {hasSchool && (
              <div style={{ display: 'flex', gap: 4, background: 'hsl(var(--muted))', borderRadius: 8, padding: 3, marginBottom: 12 }}>
                <button onClick={() => { setQuizMode('ai'); setNextQuestion(null); }} style={{ flex: 1, padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', background: quizMode === 'ai' ? 'hsl(var(--background))' : 'transparent', color: quizMode === 'ai' ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit' }}>
                  🤖 {locale === 'ru' ? 'AI вопросы' : 'AI questions'}
                </button>
                <button onClick={() => { setQuizMode('school'); setNextQuestion(null); }} style={{ flex: 1, padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', background: quizMode === 'school' ? 'hsl(var(--background))' : 'transparent', color: quizMode === 'school' ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit' }}>
                  🏫 {locale === 'ru' ? 'Вопросы школы' : 'School questions'}
                </button>
              </div>
          )}

          {/* Difficulty */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {DIFFICULTIES.map(d => (
                <button key={d} onClick={() => setDifficulty(d)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: `1px solid ${difficulty === d ? '#22C07A' : 'hsl(var(--border))'}`, background: difficulty === d ? 'rgba(34,192,122,0.1)' : 'transparent', color: difficulty === d ? '#22C07A' : 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{d}</button>
            ))}
          </div>

          {/* Question card */}
          <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 20, padding: 32, minHeight: 340 }}>
            {limitError === 'daily' ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>⏰</div>
                  <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
                    {locale === 'ru' ? 'Лимит на сегодня исчерпан' : 'Daily limit reached'}
                  </h3>
                  <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 20 }}>
                    {locale === 'ru' ? `Вы ответили на ${FREE_LIMITS.questionsPerDay} вопросов сегодня. Возвращайся завтра или перейди на Pro.` : `You've answered ${FREE_LIMITS.questionsPerDay} questions today. Come back tomorrow or upgrade to Pro.`}
                  </p>
                  <Link href={`/${locale}/pricing`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                    {locale === 'ru' ? 'Перейти на Pro →' : 'Upgrade to Pro →'}
                  </Link>
                </div>
            ) : loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 16 }}>
                  <div style={{ width: 40, height: 40, border: '3px solid hsl(var(--border))', borderTopColor: '#6B5CE7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
                {locale === 'ru' ? 'Генерирую вопрос с AI...' : 'Generating question with AI...'}
              </span>
                </div>
            ) : question ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6B5CE7', textTransform: 'uppercase' }}>{exam} · {question.topic}</span>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: difficulty === 'easy' ? 'rgba(34,192,122,0.1)' : difficulty === 'hard' ? 'rgba(232,64,64,0.1)' : 'rgba(107,92,231,0.1)', color: difficulty === 'easy' ? '#22C07A' : difficulty === 'hard' ? '#E84040' : '#6B5CE7', fontWeight: 600, textTransform: 'capitalize' }}>{difficulty}</span>
                  </div>

                  <p style={{ fontSize: 17, lineHeight: 1.7, marginBottom: 24, fontWeight: 300, color: 'hsl(var(--foreground))' }}>{question.question}</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {question.options.map((opt, i) => {
                      let bg = 'transparent', border = 'hsl(var(--border))', color = 'hsl(var(--foreground))', letterBg = 'hsl(var(--muted))', letterColor = 'hsl(var(--muted-foreground))';
                      if (answered) {
                        if (i === question.correctIndex) { bg = 'rgba(34,192,122,0.1)'; border = '#22C07A'; letterBg = '#22C07A'; letterColor = '#fff'; }
                        else if (i === selected) { bg = 'rgba(232,64,64,0.1)'; border = '#E84040'; letterBg = '#E84040'; letterColor = '#fff'; }
                        else { color = 'hsl(var(--muted-foreground))'; }
                      }
                      return (
                          <button key={i} onClick={() => handleAnswer(i)} disabled={answered} style={{ display: 'flex', alignItems: 'center', gap: 12, background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '13px 16px', color, cursor: answered ? 'default' : 'pointer', textAlign: 'left', fontSize: 14, fontFamily: 'inherit', transition: 'all 0.15s', width: '100%' }}>
                            <span style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: letterBg, color: letterColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>{letters[i]}</span>
                            {opt}
                          </button>
                      );
                    })}
                  </div>

                  {answered && (
                      <ExplanationBlock
                          explanation={question.explanation}
                          isPro={isProQuestion}
                          locale={locale}
                          locale_link={locale}
                      />
                  )}
                </>
            ) : (
                <div style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', paddingTop: 80 }}>
                  {locale === 'ru' ? 'Что-то пошло не так.' : 'Something went wrong.'}{' '}
                  <button onClick={generateQuestion} style={{ color: '#6B5CE7', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>{locale === 'ru' ? 'Попробовать снова' : 'Try again'}</button>
                </div>
            )}
          </div>

          {answered && !limitError && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={generateQuestion} style={{ background: '#6B5CE7', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {locale === 'ru' ? 'Следующий вопрос →' : 'Next question →'}
                </button>
              </div>
          )}

          {!user && (
              <div style={{ marginTop: 24, background: 'rgba(107,92,231,0.06)', border: '1px solid rgba(107,92,231,0.15)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
              {locale === 'ru' ? 'Войди чтобы сохранить прогресс' : 'Sign in to save your progress'}
            </span>
                <Link href={`/${locale}/auth/signup`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                  {locale === 'ru' ? 'Зарегистрироваться →' : 'Sign up free →'}
                </Link>
              </div>
          )}
        </main>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
  );
}

function ExamPickerGrid({ selected, onToggle, locale }: { selected: string[]; onToggle: (e: string) => void; locale: string }) {
  return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {ALL_EXAMS.map(e => {
          const isSelected = selected.includes(e);
          const isDisabled = !isSelected && selected.length >= 2;
          return (
              <button key={e} onClick={() => !isDisabled && onToggle(e)} style={{ padding: '20px 16px', borderRadius: 14, textAlign: 'center', border: `2px solid ${isSelected ? '#6B5CE7' : 'hsl(var(--border))'}`, background: isSelected ? 'rgba(107,92,231,0.1)' : 'hsl(var(--card))', color: isDisabled ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))', cursor: isDisabled ? 'default' : 'pointer', fontFamily: 'inherit', opacity: isDisabled ? 0.4 : 1, transition: 'all 0.15s' }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{e}</div>
                {isSelected && <div style={{ fontSize: 11, color: '#6B5CE7', fontWeight: 600 }}>✓ {locale === 'ru' ? 'Выбран' : 'Selected'}</div>}
              </button>
          );
        })}
      </div>
  );
}
