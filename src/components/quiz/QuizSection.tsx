'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

const QUIZZES = {
  IELTS: {
    badge: 'IELTS · Reading',
    questions: [
      { q: "The author implies renewable energy adoption has been slower than expected primarily because of:", opts: ["Lack of government funding","Infrastructure transition costs","Public opposition to change","Technological limitations"], correct: 1, explain: { en: "Correct — B. The author emphasizes high infrastructure costs as the primary barrier.", ru: "Правильный — B. Автор акцентирует внимание на высоких затратах переоборудования инфраструктуры." } },
      { q: "Which word is closest in meaning to 'ubiquitous'?", opts: ["Rare","Present everywhere","Controversial","Rapidly changing"], correct: 1, explain: { en: "Ubiquitous means 'present everywhere'. From Latin ubique — everywhere.", ru: "Ubiquitous означает 'вездесущий'. Происходит от латинского ubique — везде." } },
      { q: "The passage suggests that biodiversity loss is primarily driven by:", opts: ["Climate change alone","Multiple interconnected factors","Human population growth","Ocean acidification"], correct: 1, explain: { en: "Biodiversity loss results from multiple interconnected factors, not a single cause.", ru: "Потеря биоразнообразия — результат множества взаимосвязанных факторов." } },
    ],
  },
  SAT: {
    badge: 'SAT · Math',
    questions: [
      { q: "If 3x + 7 = 22, what is the value of x?", opts: ["3","4","5","6"], correct: 2, explain: { en: "3x = 15, so x = 5. Subtract 7 from both sides, then divide by 3.", ru: "3x = 15, значит x = 5. Вычти 7 из обеих частей, затем раздели на 3." } },
      { q: "A rectangle has a perimeter of 36 and a width of 6. What is its area?", opts: ["72","108","54","90"], correct: 0, explain: { en: "Length = (36-12)/2 = 12. Area = 12 × 6 = 72.", ru: "Длина = (36-12)/2 = 12. Площадь = 12 × 6 = 72." } },
      { q: "What is 15% of 240?", opts: ["32","36","40","24"], correct: 1, explain: { en: "15% of 240 = 0.15 × 240 = 36.", ru: "15% от 240 = 0.15 × 240 = 36." } },
    ],
  },
  ЕГЭ: {
    badge: 'ЕГЭ · Русский',
    questions: [
      { q: "Укажи слово с чередующейся гласной в корне:", opts: ["Собирать","Синий","Задание","Влияние"], correct: 0, explain: { en: "The root -бир- has an alternating vowel: собирать/собрать.", ru: "Корень -бир- содержит чередование: собирать / собрать (и/нет и)." } },
      { q: "В каком слове написание НН определяется правилом «в суффиксах отглагольных прилагательных»?", opts: ["Деревянный","Жареный","Купленный","Серебряный"], correct: 1, explain: { en: "Жареный — adjective from verb, one H. The others are adjectives with NN by different rules.", ru: "Жареный — отглагольное прилагательное, пишется одна Н." } },
      { q: "Найди предложение с грамматической ошибкой:", opts: ["Он пришёл вовремя","Благодаря усердия он успел","Вопреки прогнозу потеплело","Он шёл не спеша"], correct: 1, explain: { en: "Благодаря requires dative case: благодаря усердию.", ru: "«Благодаря» требует дательного падежа: благодаря усердию (не усердия)." } },
    ],
  },
};

export function QuizSection() {
  const t = useTranslations('landing');
  const locale = useLocale() as 'en' | 'ru';
  const exams = Object.keys(QUIZZES) as (keyof typeof QUIZZES)[];
  const [exam, setExam] = useState<keyof typeof QUIZZES>('IELTS');
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const letters = ['A','B','C','D'];

  const quiz = QUIZZES[exam];
  const q = quiz.questions[qi];
  const answered = selected !== null;
  const progress = ((qi + (answered ? 1 : 0)) / quiz.questions.length) * 100;

  function handleSelect(i: number) {
    if (answered) return;
    setSelected(i);
    if (i === q.correct) setScore(s => s + 1);
  }

  function handleNext() {
    if (qi < quiz.questions.length - 1) { setQi(qi + 1); setSelected(null); }
    else { setQi(0); setSelected(null); setScore(0); }
  }

  function switchExam(e: keyof typeof QUIZZES) {
    setExam(e); setQi(0); setSelected(null); setScore(0);
  }

  return (
      <section id="quiz" style={{ background: 'hsl(var(--muted))', padding: '96px 0' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#6B5CE7', textTransform: 'uppercase', marginBottom: 16 }}>TRY IT NOW</div>
            <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(28px,5vw,42px)', fontWeight: 400, marginBottom: 12, color: 'hsl(var(--foreground))' }}>
              {locale === 'ru' ? 'Реши несколько вопросов' : 'Solve a few questions'}
            </h2>
            <p style={{ fontSize: 16, color: 'hsl(var(--muted-foreground))', maxWidth: 400, margin: '0 auto' }}>
              {locale === 'ru' ? 'Выбери экзамен — AI объяснит каждый ответ' : 'Pick an exam and answer questions — AI will explain every answer.'}
            </p>
          </div>

          {/* Exam tabs */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
            {exams.map(e => (
                <button key={e} onClick={() => switchExam(e)} style={{ padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: `1.5px solid ${exam === e ? '#6B5CE7' : 'hsl(var(--border))'}`, background: exam === e ? '#6B5CE7' : 'hsl(var(--background))', color: exam === e ? '#fff' : 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {e}
                </button>
            ))}
          </div>

          {/* Progress */}
          <div style={{ height: 3, background: 'hsl(var(--border))', borderRadius: 2, marginBottom: 20 }}>
            <div style={{ height: 3, background: '#6B5CE7', borderRadius: 2, width: `${progress}%`, transition: 'width 0.4s ease' }} />
          </div>

          {/* Question card */}
          <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 20, padding: '28px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 12 }}>
              <span style={{ color: '#6B5CE7', fontWeight: 600 }}>{quiz.badge}</span>
              <span style={{ color: 'hsl(var(--muted-foreground))' }}>{locale === 'ru' ? 'Вопрос' : 'Question'} {qi + 1}/{quiz.questions.length}</span>
            </div>

            <p style={{ fontSize: 17, lineHeight: 1.65, marginBottom: 20, fontWeight: 300, color: 'hsl(var(--foreground))' }}>{q.q}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {q.opts.map((opt, i) => {
                const isCorrect = answered && i === q.correct;
                const isWrong = answered && i === selected && i !== q.correct;
                const isDimmed = answered && i !== q.correct && i !== selected;
                return (
                    <button key={i} onClick={() => handleSelect(i)} disabled={answered} style={{ display: 'flex', alignItems: 'center', gap: 12, background: isCorrect ? 'rgba(34,192,122,0.1)' : isWrong ? 'rgba(232,64,64,0.1)' : isDimmed ? 'transparent' : 'hsl(var(--muted))', border: `1px solid ${isCorrect ? '#22C07A' : isWrong ? '#E84040' : 'hsl(var(--border))'}`, borderRadius: 12, padding: '12px 16px', cursor: answered ? 'default' : 'pointer', textAlign: 'left', color: isDimmed ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))', fontSize: 14, fontFamily: 'inherit', width: '100%', transition: 'all 0.15s' }}>
                      <span style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: isCorrect ? '#22C07A' : isWrong ? '#E84040' : 'hsl(var(--background))', color: (isCorrect || isWrong) ? '#fff' : 'hsl(var(--muted-foreground))', border: `1px solid ${isCorrect ? '#22C07A' : isWrong ? '#E84040' : 'hsl(var(--border))'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>{letters[i]}</span>
                      {opt}
                    </button>
                );
              })}
            </div>

            {answered && (
                <div style={{ marginTop: 16, background: 'rgba(107,92,231,0.08)', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 10, fontSize: 14, color: 'hsl(var(--foreground))', lineHeight: 1.6 }}>
                  <span style={{ color: '#6B5CE7', flexShrink: 0 }}>✦</span>
                  {q.explain[locale] || q.explain.en}
                </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
              ✓ {score}/{quiz.questions.length}
            </span>
              {answered && (
                  <button onClick={handleNext} style={{ background: '#6B5CE7', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {qi < quiz.questions.length - 1 ? (locale === 'ru' ? 'Следующий →' : 'Next →') : (locale === 'ru' ? 'Сначала ↺' : 'Restart ↺')}
                  </button>
              )}
            </div>
          </div>
        </div>
      </section>
  );
}