'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { Navbar } from '@/components/layout/Navbar';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { createClient } from '@/lib/supabase';
import { FREE_LIMITS, PRO_LIMITS, ALL_EXAMS } from '@/lib/limits';
import { ExplanationBlock } from '@/components/quiz/ExplanationBlock';
import { getSubscriptionTier, hasProAccess, type SubscriptionTier } from '@/lib/subscription';
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

const DIFFICULTIES = ['easy', 'medium', 'hard'];

type Question = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
  difficulty: string;
  answerToken: string;
};

type ProgressResponse = {
  correct: boolean;
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
  const [transitioning, setTransitioning] = useState(false);
  const [prefetching, setPrefetching] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<
      'correct' | 'wrong' | null
    >(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const [xpPopup, setXpPopup] = useState<number | null>(null);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);

  const [levelUpPopup, setLevelUpPopup] = useState<{
      level: number;
      title: string;
  } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [dailyCount, setDailyCount] = useState(0);
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [limitError, setLimitError] = useState<'daily' | 'exam' | null>(null);
  const [showExamPicker, setShowExamPicker] = useState(false);
  const [isProQuestion, setIsProQuestion] = useState(false);
  const [quizMode, setQuizMode] = useState<'ai' | 'school'>('ai');
  const [hasSchool, setHasSchool] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [achievementPopup, setAchievementPopup] =
      useState<string | null>(null);
  const { theme } = useTheme();
  const [streakData, setStreakData] = useState({
      streak: 0,
      best: 0,
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setAuthRequired(true);
        return;
      }
      setAuthRequired(false);
      setUser(session.user);

      const { data: sub } = await supabase.from('subscriptions').select('plan, status').eq('user_id', session.user.id).single();
      setIsPro(hasProAccess(sub));
      setTier(getSubscriptionTier(sub));

      const { data: membership } = await supabase.from('school_members').select('school_id').eq('user_id', session.user.id).limit(1).single();
      if (membership?.school_id) setHasSchool(true);

        const { data: streak } = await supabase
            .from('user_streaks')
            .select('streak_count, best_streak')
            .eq('user_id', session.user.id)
            .single();

        if (streak) {
            setStreakData({
                streak: streak.streak_count,
                best: streak.best_streak,
            });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('xp')
            .eq('id', session.user.id)
            .single();

        if (profile?.xp) {
            setXp(profile.xp);

            const calculatedLevel =
                Math.floor(profile.xp / 100) + 1;

            setLevel(calculatedLevel);
        }

      // Get count in the active billing window: 1 day for free, 3 days for Pro.
      const today = new Date();
      today.setDate(today.getDate() - (getSubscriptionTier(sub) === 'pro' ? PRO_LIMITS.windowDays - 1 : 0));
      today.setHours(0,0,0,0);
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

  async function fetchQuestion(): Promise<Question | null> {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 12000);

      try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            exam,
            difficulty,
            locale,
            topic: initialTopic || undefined,
            mode: quizMode
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 403) {
        const data = await res.json();
        if (
            data.error === 'daily_limit_reached' ||
            data.error === 'question_limit_reached'
        ) {
            setLimitError('daily');
        } else if (data.error === 'exam_not_selected') {
            setLimitError('exam');
        }

        return null;
      }

      if (res.status === 401) {
        setAuthRequired(true);
        return null;
      }

      const data = await res.json();

      if (data.question) {
        setIsProQuestion(data.isPro ?? false);
        return data.question;
      }

      return null;
    } catch (err) {
      console.error('fetchQuestion error:', err);
      return null;
    } finally {
          clearTimeout(timeout);
      }
  }

  const generateQuestion = useCallback(async () => {
    setLoading(true);
    setTransitioning(true);
    setAnswered(false);
    setAnswerResult(null);
    setSelected(null);
    setLimitError(null);

    // instant switch from prefetched question
    if (nextQuestion) {
      setQuestion(nextQuestion);
      setNextQuestion(null);
      setAnswerResult(null);

      setAnswered(false);
      setSelected(null);

      setLoading(false);
      setTransitioning(false);

      // Prefetch next in background
      fetchQuestion()
          .then(q => {
            if (q) setNextQuestion(q);
          })
      .catch(() => {});

      return;
    }

    try {
      const q = await fetchQuestion();

      if (q) {
          setQuestion(q);

        // prefetch next in background
        fetchQuestion()
            .then((next) => {
                if (next) setNextQuestion(next);
            })
            .catch(() => {});
      } else {
          setQuestion(null)
      }
    } finally {
        setLoading(false);
        setTransitioning(false);
    }
  }, [
      nextQuestion,
      exam,
      difficulty,
      locale,
      initialTopic,
      quizMode
  ]);

  useEffect(() => {
    if (!showExamPicker) generateQuestion();
  }, [exam, difficulty, showExamPicker]);

  async function handleAnswer(i: number) {
    if (answered || !question || transitioning) return;

    setAnswered(true);
    setSelected(i);

    const correct =
        i === question.correctIndex;
        setAnswerResult(correct ? 'correct' : 'wrong');

    setQuestion(current =>
      current
        ? {
            ...current,
            correctIndex: current.correctIndex,
            explanation: current.explanation,
          }
        : current
    );

    setScore(p => ({
      correct: p.correct + (correct ? 1 : 0),
      total: p.total + 1,
    }));

    if (correct) {
        setXp(prev => prev + 10);

        const newXp = xp + 10;
        const newLevel =
            Math.floor(newXp / 100) +1;

        if (newLevel > level) {
            setLevel(newLevel);
        }

      setStreak(p => p + 1);

      setXpPopup(10);

      setTimeout(() => {
          setXpPopup(null);
      }, 1800);

      if ((score.correct + 1) % 10 === 0) {
          const level = Math.floor((score.correct + 1) / 10);

          setLevelUpPopup({
              level,
              title:
                locale === 'ru'
                    ? `Уровень ${level}`
                    : `Level ${level}`,
          });

          setTimeout(() => {
              setLevelUpPopup(null);
          }, 3200);
      }
    }

    setDailyCount(p => p + 1);

    // streak update
      if (user) {
          fetch('/api/streak', {
              method: 'POST',
          }).catch(() => {});
      }

    // save in background
    if (user) {
      fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answerToken: question.answerToken,
          selectedIndex: i,
        }),
      }).catch(() => {});
    }

    // XP in background
    if (user && correct) {
      fetch('/api/xp', {
        method: 'POST',
      }).catch(() => {});
    }

    if (user) {
        fetch('/api/achievements/check', {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify({
                userId: user.id,

                correctAnswers:
                    score.correct + (correct ? 1 : 0),

                streak:
                    streakData.streak,

                xp:
                    (score.correct + (correct ? 1 : 0)) * 10,
            }),
        })
            .then(async (res) => {
                const data = await res.json();

                if (data.unlocked?.length > 0) {
                    setAchievementPopup(data.unlocked[0]);

                    setTimeout(() => {
                        setAchievementPopup(null);
                    }, 4000);
                }
            })
            .catch(() => {});
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
  const currentLevelXp = (level -1) * 100;
  const nextLevelXp = level * 100;

  const progressXp =
      xp - currentLevelXp;

  const xpNeeded =
      nextLevelXp - currentLevelXp;

  const xpPercent =
      (progressXp / xpNeeded) * 100;

  const activeLimit = tier === 'pro' ? PRO_LIMITS.questionsPerWindow : FREE_LIMITS.questionsPerDay;
  const activeWindowDays = tier === 'pro' ? PRO_LIMITS.windowDays : FREE_LIMITS.windowDays;
  const questionsLeft = tier === 'max' ? null : Math.max(activeLimit - dailyCount, 0);
  const availableExams = isPro ? ALL_EXAMS : (selectedExams.length > 0 ? selectedExams : ALL_EXAMS);

  // Exam picker for free users
  if (showExamPicker && !isPro) {
    return (
        <div style={{ minHeight: '100vh', background: `
 radial-gradient(circle at top left, rgba(107,92,231,0.12), transparent 28%),
 radial-gradient(circle at bottom right, rgba(34,192,122,0.08), transparent 24%),
 hsl(var(--background))
`, color: 'hsl(var(--foreground))' }}>
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
                style={{ width: '100%', background: selectedExams.length === 2 ? '#6B5CE7' : 'hsl(var(--muted))', color: selectedExams.length === 2 ? '#fff' : 'hsl(var(--muted-foreground))', border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, lineHeight: 1.5, fontWeight: 500, cursor: selectedExams.length === 2 ? 'pointer' : 'default', fontFamily: 'inherit', marginTop: 24 }}>
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
      <div style={{ minHeight: '100vh', background: `
 radial-gradient(circle at top left, rgba(107,92,231,0.12), transparent 28%),
 radial-gradient(circle at bottom right, rgba(34,192,122,0.08), transparent 24%),
 hsl(var(--background))
`, color: 'hsl(var(--foreground))' }}>
        {user ? <AppNavbar /> : <Navbar />}
        <main
            style={{
                width: '100%',
                maxWidth: 820,
                margin: '0 auto',
                padding: '32px 16px 220px' }}>

          <div
              style={{
                marginBottom: 24,

                background: 'rgba(255,255,255,0.04)',

                border: '1px solid rgba(255,255,255,0.08)',

                borderRadius: 24,

                padding: '18px 20px',

                backdropFilter: 'blur(24px)',
              }}
          >
            <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                  flexWrap: 'wrap',
                  gap: 12,
                }}
            >
              <Link
                  href={user ? `/${locale}/home` : `/${locale}`}
                  style={{
                    fontSize: 13,
                    color: 'hsl(var(--muted-foreground))',
                    textDecoration: 'none',
                  }}
              >
                ← {locale === 'ru' ? 'Назад' : 'Back'}
              </Link>

              <div
                  style={{
                    display: 'flex',
                    gap: 14,
                    alignItems: 'center',
                    fontSize: 13,
                  }}
              >
      <span>
        ✓ <strong style={{ color: '#22C07A' }}>
          {score.correct}
        </strong>
      </span>

                <span>
        {locale === 'ru' ? 'Всего' : 'Total'}:{' '}
                  <strong>{score.total}</strong>
      </span>

                <span>
        {locale === 'ru' ? 'Точность' : 'Accuracy'}:{' '}
                  <strong>{accuracy}%</strong>
      </span>

                <span
                    style={{
                        color:
                            streakData.streak >= 7
                                ? '#FF7A00'
                                : '#EF9F27',

                        fontWeight: 700,
                    }}
                >
                    🔥 {streakData.streak}
                </span>
              </div>
            </div>

            <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  fontSize: 12,
                  color: 'hsl(var(--muted-foreground))',
                }}
            >
    <span>
      {locale === 'ru'
          ? 'Прогресс'
          : 'Progress'}
    </span>

              <span>{accuracy}%</span>
            </div>

            <div
                style={{
                  height: 8,
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
            >
              <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${accuracy}%` }}
                  transition={{ duration: 0.5 }}
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    background:
                        'linear-gradient(90deg,#6B5CE7,#8B7CFF)',
                  }}
              />
            </div>
          </div>

          {/* Free plan info bar */}
          {tier !== 'max' && user && (
              <div style={{ background: questionsLeft === 0 ? 'rgba(232,64,64,0.08)' : 'rgba(107,92,231,0.06)', border: `1px solid ${questionsLeft === 0 ? 'rgba(232,64,64,0.2)' : 'rgba(107,92,231,0.15)'}`, borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, color: questionsLeft === 0 ? '#E84040' : 'hsl(var(--muted-foreground))' }}>
              {questionsLeft === 0
                  ? (locale === 'ru' ? '⚠ Лимит вопросов исчерпан' : '⚠ Question limit reached')
                  : (locale === 'ru' ? `Осталось: ${questionsLeft}/${activeLimit} за ${activeWindowDays} дн.` : `${questionsLeft}/${activeLimit} left per ${activeWindowDays} day${activeWindowDays > 1 ? 's' : ''}`)}
            </span>
                <Link href={`/${locale}/pricing`} style={{ fontSize: 12, color: '#6B5CE7', textDecoration: 'none', fontWeight: 500 }}>
                  {locale === 'ru' ? 'Безлимит в Max →' : 'Unlimited with Max →'}
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
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {DIFFICULTIES.map(d => (
                <button key={d} onClick={() => setDifficulty(d)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: `1px solid ${difficulty === d ? '#22C07A' : 'hsl(var(--border))'}`, background: difficulty === d ? 'rgba(34,192,122,0.16)' : 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)', color: difficulty === d ? '#22C07A' : 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{d}</button>
            ))}
          </div>

            {/*XP Card*/}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}

                style={{
                    marginBottom: 20,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 22,
                    padding: '18px 20px',
                    backdropFilter: 'blur(24px)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 13,
                                color: 'hsl(var(--muted-foreground))',
                                marginBottom: 4,
                            }}
                        >
                            {locale === 'ru'
                                ? 'Уровень'
                                : 'Level'}
                        </div>

                        <div
                            style={{
                                fontSize: 24,
                                fontWeight: 700,
                            }}
                        >
                            {level}
                        </div>
                    </div>

                    <div
                        style={{
                            fontSize: 13,
                            color: '#6B5CE7',
                            fontWeight: 600,
                        }}
                    >
                        {xp} XP
                    </div>
                </div>

                <div
                    style={{
                        height: 10,
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: 999,
                        overflow: 'hidden',
                        marginBottom: 8,
                    }}
                >
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{
                            width: `${xpPercent}%`,
                        }}
                        transition={{
                            duration: 0.5,
                        }}
                        style={{
                            height: '100%',
                            borderRadius: 999,
                            background:
                                'linear-gradient(90deg,#6B5CE7,#8B7CFF)',
                        }}
                    />
                </div>

                <div
                    style={{
                        fontSize: 12,
                        color: 'hsl(var(--muted-foreground))',
                    }}
                >
                    {locale === 'ru'
                        ? `${xpNeeded - progressXp} XP до следующего уровня`
                        : `${xpNeeded - progressXp} XP to next level`}
                </div>
            </motion.div>

          {/* Question card */}
          <motion.div
              key={question?.question || 'loading' }
              initial={{
                opacity: 0,
                y: 14,
                scale: 0.985,
              }}
              animate={{
                opacity: 1,
                y: 0,
                x:
                    answerResult === 'wrong'
                    ? [0, -4, 4, -2, 2, 0]
                    : 0,
                scale:
                  answerResult === 'correct'
                    ? [1, 1.01, 1]
                    : answerResult === 'wrong'
                    ? [1, 0.995, 1]
                    : 1,

                boxShadow:
                    answerResult === 'correct'
                        ? [
                            theme === 'dark'
                                ? '0 20px 60px rgba(0,0,0,0.45)'
                                : '0 20px 60px rgba(0,0,0,0.08)',

                            '0 0 0 2px rgba(34,192,122,0.35)',

                            theme === 'dark'
                                ? '0 20px 60px rgba(0,0,0,0.45)'
                                : '0 20px 60px rgba(0,0,0,0.08)',
                        ]

                    : answerResult === 'wrong'
                    ? [
                        theme === 'dark'
                            ? '0 20px 60px rgba(0,0,0,0.45)'
                            : '0 20px 60px rgba(0,0,0,0.08)',

                        '0 0 0 2px rgba(232,64,64,0.35)',

                            theme === 'dark'
                                ? '0 20px 60px rgba(0,0,0,0.45)'
                                : '0 20px 60px rgba(0,0,0,0.08)',
                            ]

                        : theme === 'dark'
                        ? '0 20px 60px rgba(0,0,0,0.45)'
                        : '0 20px 60px rgba(0,0,0,0.08)',
              }}
              transition={{
                  duration: 0.38,
              }}
              style={{
                position: 'relative',
                overflow: 'hidden',
                background:
                  theme === 'dark'
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(255,255,255,0.92)',

                border:
                  '1px solid rgba(255,255,255,0.08)',

                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter:
                  'blur(20px)',

                borderRadius: 28,

                padding: 'clamp(20px,4vw,42px)',

                boxShadow:
                    theme === 'dark'
                        ? '0 20px 60px rgba(0,0,0,0.45)'
                        : '0 20px 60px rgba(0,0,0,0.08)',
              }}
          >

              {loading && question && (
                  <div
                      style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(10,10,10,0.28)',
                          backdropFilter: 'blur(8px)',
                          borderRadius: 28,
                          zIndex: 20,

                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                      }}
                  >
                      <div
                          style={{
                              width: 42,
                              height: 42,
                              borderRadius: '50%',
                              border: '3px solid rgba(255,255,255,0.12)',
                              borderTopColor: '#6B5CE7',
                              animation: 'spin 0.8s linear infinite',
                          }}
                      />
                  </div>
              )}

            {authRequired ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
                  <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
                    {locale === 'ru' ? 'Войдите, чтобы начать практику' : 'Sign in to start practicing'}
                  </h3>
                  <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 20 }}>
                    {locale === 'ru' ? 'Так мы сможем сохранить прогресс, XP и защитить генерацию вопросов.' : 'This lets us save progress, XP, and protect question generation.'}
                  </p>
                  <Link href={`/${locale}/auth/login`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                    {locale === 'ru' ? 'Войти →' : 'Sign in →'}
                  </Link>
                </div>
            ) : limitError === 'daily' ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>⏰</div>
                  <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
                    {locale === 'ru' ? 'Лимит на сегодня исчерпан' : 'Daily limit reached'}
                  </h3>
                  <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 20 }}>
                    {locale === 'ru' ? `Вы ответили на ${activeLimit} вопросов за период ${activeWindowDays} дн. Дождись обновления лимита или перейди на Max.` : `You've answered ${activeLimit} questions in the ${activeWindowDays}-day window. Wait for the limit to refresh or upgrade to Max.`}
                  </p>
                  <Link href={`/${locale}/pricing`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                    {locale === 'ru' ? 'Перейти на Max →' : 'Upgrade to Max →'}
                  </Link>
                </div>
            ) : loading && !question ? (
                <div>
                    <div
                        style={{
                            height: 14,
                            width: 180,
                            borderRadius: 999,
                            marginBottom: 24,
                            background: 'rgba(255,255,255,0.08)',
                        }}
                    />

                    <div
                        style={{
                            height: 42,
                            width: '92%',
                            borderRadius: 14,
                            marginBottom: 14,
                            background: 'rgba(255,255,255,0.08)',
                        }}
                    />

                    <div
                        style={{
                            height: 42,
                            width: '75%',
                            borderRadius: 14,
                            marginBottom: 30,
                            background: 'rgba(255,255,255,0.08)',
                        }}
                    />

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                        }}
                    >
                        {[1,2,3,4].map((i) => (
                            <div
                                key={i}
                                style={{
                                    height: 68,
                                    borderRadius: 22,
                                    background: 'rgba(255,255,255,0.06)',
                                }}
                            />
                        ))}
                    </div>
                </div>
            ) : question ? (
                <>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 20,
                            flexWrap: 'wrap',
                            gap: 8,
                        }}
                    >
            <span
                style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    color: '#6B5CE7',
                    textTransform: 'uppercase',
                }}
            >
                {exam} · {question.topic}
            </span>

                        <span
                            style={{
                                fontSize: 11,
                                padding: '3px 10px',
                                borderRadius: 20,
                                background:
                                    difficulty === 'easy'
                                        ? 'rgba(34,192,122,0.1)'
                                        : difficulty === 'hard'
                                            ? 'rgba(232,64,64,0.1)'
                                            : 'rgba(107,92,231,0.1)',
                                color:
                                    difficulty === 'easy'
                                        ? '#22C07A'
                                        : difficulty === 'hard'
                                            ? '#E84040'
                                            : '#6B5CE7',
                                fontWeight: 600,
                                textTransform: 'capitalize',
                            }}
                        >
                {difficulty}
            </span>
                    </div>

                    <p
                        style={{
                            fontSize: 'clamp(24px,4vw,36px)',
                            letterSpacing: '-0.03em',
                            lineHeight: 1.28,
                            marginBottom: 18,
                            fontWeight: 650,
                            color: 'hsl(var(--foreground))',
                        }}
                    >
                        {question.question}
                    </p>

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                        }}
                    >
                        {question.options.map((opt, i) => {
                            let bg = 'transparent';
                            let border = 'hsl(var(--border))';
                            const color = 'hsl(var(--foreground))';

                            if (answered) {
                                if (i === question.correctIndex) {
                                    bg = 'rgba(34,192,122,0.1)';
                                    border = '#22C07A';
                                } else if (i === selected) {
                                    bg = 'rgba(232,64,64,0.1)';
                                    border = '#E84040';
                                }
                            }

                            return (
                                <motion.button
                                    key={i}
                                    onClick={() => handleAnswer(i)}
                                    disabled={answered}
                                    whileHover={
                                        answered
                                            ? {}
                                            : {
                                                scale: 1.012,
                                                y: -3,
                                                boxShadow:
                                                    theme === 'dark'
                                                        ? '0 10px 30px rgba(107,92,231,0.18)'
                                                        : '0 10px 30px rgba(107,92,231,0.12)'
                                            }
                                    }
                                    whileTap={
                                        answered
                                            ? {}
                                            : {
                                                scale: 0.982,
                                                y: 1,
                                            }
                                    }
                                    transition={{
                                        type: 'spring',
                                        stiffness: 260,
                                        damping: 18,
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 14,
                                        width: '100%',
                                        padding: '16px 18px',
                                        borderRadius: 22,
                                        border: `1px solid ${border}`,
                                        minHeight: 74,
                                        background:
                                            bg ||
                                            (theme === 'dark'
                                                ? 'rgba(255,255,255,0.045)'
                                                : 'rgba(255,255,255,0.82)'),
                                        color,
                                        cursor: answered ? 'default' : 'pointer',
                                        textAlign: 'left',
                                        fontSize: 16,
                                        lineHeight: 1.5,
                                        fontWeight: 500,
                                        fontFamily: 'inherit',
                                        backdropFilter: 'blur(14px)',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                        <span
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 12,
                                flexShrink: 0,
                                background:
                                    answered &&
                                    i === question.correctIndex
                                        ? '#22C07A'
                                        : answered && i === selected
                                            ? '#E84040'
                                            : 'rgba(255,255,255,0.08)',

                                color:
                                    answered &&
                                    (i === question.correctIndex ||
                                        i === selected)
                                        ? '#fff'
                                        : 'hsl(var(--foreground))',

                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',

                                fontSize: 13,
                                fontWeight: 650,
                            }}
                        >
                            {letters[i]}
                        </span>

                                    {opt}
                                </motion.button>
                            );
                        })}
                    </div>

                    {answered && (
                        <ExplanationBlock
                            explanation={question.explanation ?? ''}
                            isPro={isProQuestion}
                            locale={locale}
                            locale_link={locale}
                        />
                    )}
                </>
            ) : (
                <div
                    style={{
                        textAlign: 'center',
                        color: 'hsl(var(--muted-foreground))',
                        paddingTop: 80,
                    }}
                >
                    {locale === 'ru'
                        ? 'Что-то пошло не так.'
                        : 'Something went wrong.'}

                    <button
                        onClick={generateQuestion}
                        disabled={transitioning}
                        style={{
                            marginLeft: 12,
                            background:
                                'linear-gradient(135deg,#6B5CE7,#8B7CFF)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 16,
                            padding: '14px 30px',
                            fontSize: 16,
                            lineHeight: 1.5,
                            fontWeight: 650,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        {locale === 'ru'
                            ? 'Попробовать снова'
                            : 'Try again'}
                    </button>
                </div>
            )}
          </motion.div>

            {answered && !limitError && (
                <div
                    style={{
                        position: 'sticky',
                        marginBottom: 12,
                        bottom: 'calc(88px + env(safe-area-inset-bottom))',
                        paddingInline: 16,
                        paddingBottom: 8,
                        display: 'flex',
                        justifyContent: 'center',
                        marginTop: 26,
                        zIndex: 40,
                        pointerEvents: 'none',
                    }}
                >
                    <button
                        onClick={generateQuestion}
                        style={{
                            pointerEvents: 'auto',
                            background: 'linear-gradient(135deg,#6B5CE7,#8B7CFF)',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 16,
                            padding: '14px 28px',
                            fontSize: 14,
                            fontWeight: 600,
                            fontFamily: 'inherit',
                            boxShadow: '0 10px 30px rgba(107,92,231,0.28)',
                            backdropFilter: 'blur(24px)',
                            transition: 'all 0.2s ease',
                            opacity: transitioning ? 0.6 : 1,
                            cursor: transitioning ? 'default' : 'pointer',
                            minWidth: 220,
                            width: '100%',
                            maxWidth: 340,
                        }}
                    >
                        {locale === 'ru'
                            ? 'Следующий вопрос →'
                            : 'Next question →'}
                    </button>
                </div>
            )}

          {!user && (
              <div style={{ marginTop: 24, background: 'rgba(107,92,231,0.06)', border: '1px solid rgba(107,92,231,0.15)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
              {locale === 'ru' ? 'Войди чтобы сохранить прогресс' : 'Sign in to save your progress'}
            </span>
                <Link href={`/${locale}/auth/signup`} style={{ background: '#6B5CE7', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                  {locale === 'ru' ? 'Зарегистрироваться →' : 'Sign up free →'}
                </Link>
              </div>
          )}

            {achievementPopup && (
                <motion.div
                    initial={{
                        opacity: 0,
                        y: 40,
                        scale: 0.9,
                    }}

                    animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                    }}

                    style={{
                        position: 'fixed',

                        bottom: 110,

                        left: '50%',

                        transform: 'translateX(-50%)',

                        zIndex: 9999,

                        background:
                            'linear-gradient(135deg,#6B5CE7,#8B7CFF)',

                        color: '#fff',

                        padding: '16px 24px',

                        borderRadius: 20,

                        boxShadow:
                            '0 18px 50px rgba(107,92,231,0.45)',

                        backdropFilter: 'blur(24px)',
                    }}
                >
                    <div
                        style={{
                            fontSize: 13,
                            opacity: 0.8,
                            marginBottom: 4,
                        }}
                    >
                        Achievement unlocked
                    </div>

                    <div
                        style={{
                            fontSize: 16,
                            fontWeight: 700,
                        }}
                    >
                        🏅 {achievementPopup}
                    </div>
                </motion.div>
            )}

            {xpPopup && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        top: 90,
                        right: 24,
                        zIndex: 9999,

                        background: 'rgba(34,192,122,0.16)',

                        border: '1px solid rgba(34,192,122,0.3)',

                        backdropFilter: 'blur(18px)',

                        borderRadius: 18,

                        padding: '14px 18px',

                        color: '#22C07A',

                        fontWeight: 700,

                        fontSize: 16,

                        boxShadow: '0 10px 30px rgba(34,192,122,0.2)',
                    }}
                >
                    +{xpPopup} XP
                </motion.div>
            )}

            {levelUpPopup && (
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        top: 150,
                        left: '50%',
                        transform: 'translateY(-50%)',

                        zIndex: 9999,

                        background:
                            'linear-gradient(135deg,#6B5CE7,#8B7CFF)',

                        color: '#fff',

                        borderRadius: 26,

                        padding: '24px 34px',

                        boxShadow:
                            '0 18px 60px rgba(107,92,231,0.35)',

                        textAlign: 'center',

                        backdropFilter: 'blur(20px)',
                    }}
                >
                    <div
                        style={{
                            fontSize: 42,
                            marginBottom: 10,
                        }}
                    >
                        🎉
                    </div>

                    <div
                        style={{
                            fontSize: 22,
                            fontWeight: 700,
                            marginBottom: 4,
                        }}
                    >
                        {locale === 'ru'
                            ? 'Новый уровень!'
                            : 'Level Up!'}
                    </div>

                    <div
                        style={{
                            fontSize: 16,
                            lineHeight: 1.5,
                            opacity: 0.9,
                        }}
                    >
                        {levelUpPopup.title}
                    </div>
                </motion.div>
            )}

        </main>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
  );
}

function ExamPickerGrid({ selected, onToggle, locale }: { selected: string[]; onToggle: (e: string) => void; locale: string }) {
  return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {ALL_EXAMS.map(e => {
          const isSelected = selected.includes(e);
          const isDisabled = !isSelected && selected.length >= 2;
          return (
              <motion.button
                  key={e}
                  onClick={() => !isDisabled && onToggle(e)}
                  whileHover={
                    isDisabled
                      ? {}
                      : {
                        scale: 1.02,
                        y: -2,
                        }
                  }
                  whileTap={
                    isDisabled
                        ? {}
                        : {
                          scale: 0.98,
                        }
                  }
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 18,
                    }}
                  style={{
                    padding: '20px 16px',
                    borderRadius: 18,
                    textAlign: 'center',

                    border: `2px solid ${
                      isSelected
                        ? '#6B5CE7'
                        : 'rgba(255,255,255,0.08)'
                    }`,

                    background:
                      isSelected
                        ? 'rgba(107,92,231,0.12)'
                        : 'rgba(255,255,255,0.04)',

                    cursor:
                      isDisabled
                        ? 'default'
                        : 'pointer',

                    fontFamily: 'inherit',

                    opacity: isDisabled ? 0.4 : 1,

                    backdropFilter: 'blur(12px)',

                    transition: 'all 0.2s ease',
                  }}
                  >
                <div style={{ fontSize: 16, lineHeight: 1.5, fontWeight: 600, marginBottom: 4 }}>{e}</div>
                {isSelected && <div style={{ fontSize: 11, color: '#6B5CE7', fontWeight: 600 }}>✓ {locale === 'ru' ? 'Выбран' : 'Selected'}</div>}
              </motion.button>
          );
        })}
      </div>
  );
}
