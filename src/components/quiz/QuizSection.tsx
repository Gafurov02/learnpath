'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

const QUIZZES = {
  IELTS: {
    badge: 'IELTS · Reading',
    questions: [
      {
        q: "The author implies renewable energy adoption has been slower than expected primarily because of:",
        opts: ["Lack of government funding", "Infrastructure transition costs", "Public opposition to change", "Technological limitations"],
        correct: 1,
        explain: { en: "Correct — B. The author emphasizes high infrastructure costs as the primary barrier, not political or technical limitations.", ru: "Правильный ответ — B. Автор акцентирует внимание на высоких затратах переоборудования инфраструктуры как главном барьере." }
      },
      {
        q: "Which word is closest in meaning to 'ubiquitous'?",
        opts: ["Rare", "Everywhere present", "Controversial", "Rapidly changing"],
        correct: 1,
        explain: { en: "Ubiquitous means 'present everywhere'. From Latin ubique — everywhere. Common in IELTS academic texts.", ru: "Ubiquitous означает 'вездесущий, повсеместный'. Происходит от латинского ubique — везде." }
      },
      {
        q: "Choose the correct form: 'The data _____ collected over three years.'",
        opts: ["was", "were", "has been", "have"],
        correct: 1,
        explain: { en: "Data is the plural of datum, so 'were' is correct. In British English (IELTS standard) data takes plural verbs.", ru: "Data — множественное число от datum. В британском английском (стандарт IELTS) data употребляется как множественное число." }
      },
    ]
  },
  SAT: {
    badge: 'SAT · Math',
    questions: [
      {
        q: "If 3x + 7 = 22, what is the value of 6x − 4?",
        opts: ["26", "30", "18", "34"],
        correct: 0,
        explain: { en: "From 3x + 7 = 22 → x = 5. Then 6x − 4 = 30 − 4 = 26.", ru: "Из 3x + 7 = 22 получаем x = 5. Тогда 6x − 4 = 30 − 4 = 26." }
      },
      {
        q: "Which value of x satisfies |2x − 3| = 9?",
        opts: ["x = 6 only", "x = −3 only", "x = 6 or x = −3", "x = 3 or x = −6"],
        correct: 2,
        explain: { en: "Two cases: 2x − 3 = 9 → x = 6, and 2x − 3 = −9 → x = −3. Both valid.", ru: "Два случая: 2x − 3 = 9 → x = 6, и 2x − 3 = −9 → x = −3. Оба решения верны." }
      },
      {
        q: "A store marks up items by 40% then offers a 20% discount. Net change?",
        opts: ["12% increase", "20% increase", "8% decrease", "No change"],
        correct: 0,
        explain: { en: "100 → ×1.4 = 140 → ×0.8 = 112. Net: +12%.", ru: "100 → ×1.4 = 140 → ×0.8 = 112. Итог: рост на 12%." }
      },
    ]
  },
  ЕГЭ: {
    badge: 'ЕГЭ · Русский',
    questions: [
      {
        q: "В каком слове верно выделена буква, обозначающая ударный гласный звук?",
        opts: ["звОнит", "дОговор", "нАчать", "красИвее"],
        correct: 3,
        explain: { en: "Correct: красИвее. Stress: звонИт, договОр, начАть, красИвее.", ru: "Правильный ответ — красИвее. Ударение: звонИт, договОр, начАть, красИвее." }
      },
      {
        q: "Укажите пример с ошибкой в образовании формы слова:",
        opts: ["пара носков", "более красивее", "в две тысячи первом году", "трое суток"],
        correct: 1,
        explain: { en: "Error in B: double comparative. Correct: 'красивее' OR 'более красивый'.", ru: "Ошибка — 'более красивее': двойная сравнительная степень. Правильно: 'красивее' ИЛИ 'более красивый'." }
      },
      {
        q: "В каком предложении НЕ со словом пишется СЛИТНО?",
        opts: ["Задача (не)решена до конца.", "Это был (не)высокий, но крепкий человек.", "Я (не)мог успокоиться.", "Письмо (не)отправлено."],
        correct: 1,
        explain: { en: "'Невысокий' is written together because it can be replaced by a synonym (низкий).", ru: "'Невысокий' пишется слитно — можно заменить синонимом (низкий). Краткие причастия и глаголы с НЕ всегда раздельно." }
      },
    ]
  },
};

type ExamKey = keyof typeof QUIZZES;

export function QuizSection() {
  const t = useTranslations('quiz');
  const locale = useLocale();
  const lang = locale === 'ru' ? 'ru' : 'en';

  const [exam, setExam] = useState<ExamKey>('IELTS');
  const [qIndex, setQIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);

  const quiz = QUIZZES[exam];
  const q = quiz.questions[qIndex];
  const letters = ['A', 'B', 'C', 'D'];
  const progress = (qIndex / quiz.questions.length) * 100;

  function handleAnswer(i: number) {
    if (answered) return;
    setAnswered(true);
    setSelected(i);
    setTotal(p => p + 1);
    if (i === q.correct) setScore(p => p + 1);
  }

  function handleNext() {
    setQIndex((qIndex + 1) % quiz.questions.length);
    setAnswered(false);
    setSelected(null);
  }

  function switchExam(key: ExamKey) {
    setExam(key);
    setQIndex(0);
    setAnswered(false);
    setSelected(null);
    setScore(0);
    setTotal(0);
  }

  return (
    <section id="quiz" style={{ background: '#0E0B1A', padding: '96px 0' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', color: '#C4BEFF', textTransform: 'uppercase', marginBottom: '16px' }}>
            {t('tag')}
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 400, letterSpacing: '-1px', color: '#F5F3EF', marginBottom: '12px', lineHeight: 1.1 }}>
            {t('title')}
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.45)', fontWeight: 300 }}>{t('sub')}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {(Object.keys(QUIZZES) as ExamKey[]).map(key => (
            <button key={key} onClick={() => switchExam(key)} style={{
              padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
              border: exam === key ? '1px solid #6B5CE7' : '1px solid rgba(255,255,255,0.12)',
              background: exam === key ? '#6B5CE7' : 'transparent',
              color: exam === key ? '#fff' : 'rgba(255,255,255,0.45)',
              cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
            }}>
              {key}
            </button>
          ))}
        </div>

        <div style={{ height: '2px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', marginBottom: '24px' }}>
          <div style={{ height: '2px', background: '#6B5CE7', borderRadius: '2px', width: `${progress}%`, transition: 'width 0.4s ease' }} />
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '20px', padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: '#C4BEFF', textTransform: 'uppercase' }}>{quiz.badge}</span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)' }}>{t('question')} {qIndex + 1} {t('of')} {quiz.questions.length}</span>
          </div>

          <p style={{ fontSize: '17px', lineHeight: 1.65, color: '#fff', marginBottom: '28px', fontWeight: 300 }}>{q.q}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {q.opts.map((opt, i) => {
              const isCorrect = answered && i === q.correct;
              const isWrong = answered && i === selected && i !== q.correct;
              const isDimmed = answered && i !== q.correct && i !== selected;
              return (
                <button key={i} onClick={() => handleAnswer(i)} disabled={answered} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '13px 16px', borderRadius: '10px', width: '100%',
                  textAlign: 'left', fontSize: '14px', fontFamily: 'inherit',
                  cursor: answered ? 'default' : 'pointer', transition: 'all 0.15s',
                  border: isCorrect ? '1px solid #22C07A' : isWrong ? '1px solid #E84040' : isDimmed ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(255,255,255,0.1)',
                  background: isCorrect ? 'rgba(34,192,122,0.12)' : isWrong ? 'rgba(232,64,64,0.12)' : isDimmed ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.04)',
                  color: isDimmed ? 'rgba(255,255,255,0.22)' : '#fff',
                }}>
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 600, transition: 'all 0.15s',
                    background: isCorrect ? '#22C07A' : isWrong ? '#E84040' : isDimmed ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
                    color: isCorrect || isWrong ? '#fff' : isDimmed ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.4)',
                  }}>{letters[i]}</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {answered && (
            <div style={{
              marginTop: '20px', display: 'flex', gap: '10px', padding: '14px 16px',
              borderRadius: '12px', border: '1px solid rgba(107,92,231,0.25)',
              background: 'rgba(107,92,231,0.12)', fontSize: '13px',
              color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, animation: 'fadeUp 0.3s ease',
            }}>
              <span style={{ color: '#C4BEFF', flexShrink: 0 }}>✦</span>
              {q.explain[lang]}
            </div>
          )}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
            {t('correct')}: <span style={{ color: '#22C07A', fontWeight: 500 }}>{score}</span> / {total}
          </span>
          {answered && (
            <button onClick={handleNext} style={{
              background: '#6B5CE7', color: '#fff', border: 'none',
              borderRadius: '10px', padding: '10px 24px', fontSize: '14px',
              fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              animation: 'fadeUp 0.3s ease',
            }}>
              {t('next')}
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </section>
  );
}
