'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppNavbar } from '@/components/layout/AppNavbar';

type ParsedQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  topic: string;
  difficulty: string;
  exam: string;
  valid: boolean;
  error?: string;
};

const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDifficulty(value: unknown) {
  const difficulty = asString(value).toLowerCase();
  return VALID_DIFFICULTIES.has(difficulty) ? difficulty : 'medium';
}

function parseOptions(rawOptions: string, row: Record<string, string>) {
  if (rawOptions) {
    try {
      const parsed = JSON.parse(rawOptions);
      if (Array.isArray(parsed)) {
        return parsed.map(asString).filter(Boolean);
      }
      return rawOptions.split(/[|;]/).map((option) => option.trim()).filter(Boolean);
    } catch {
      return rawOptions.split(/[|;]/).map((option) => option.trim()).filter(Boolean);
    }
  }

  return [row.option_a, row.option_b, row.option_c, row.option_d]
    .map((option) => option?.trim() ?? '')
    .filter(Boolean);
}

function parseCorrectIndex(value: string, options: string[]) {
  const trimmed = value.trim();
  const numeric = Number(trimmed);

  if (Number.isInteger(numeric) && numeric >= 0 && numeric < options.length) {
    return numeric;
  }

  if (/^[A-Za-z]$/.test(trimmed)) {
    const index = trimmed.toUpperCase().charCodeAt(0) - 65;
    return index >= 0 && index < options.length ? index : -1;
  }

  return options.findIndex((option) => option.toLowerCase() === trimmed.toLowerCase());
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCSV(text: string): ParsedQuestion[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    return [{
      question: '',
      options: [],
      correct_index: 0,
      explanation: '',
      topic: 'General',
      difficulty: 'medium',
      exam: 'ЕГЭ',
      valid: false,
      error: 'CSV must include a header row and at least one question',
    }];
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());

  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line);
    const row = headers.reduce<Record<string, string>>((acc, header, cellIndex) => {
      acc[header] = cells[cellIndex] ?? '';
      return acc;
    }, {});
    const options = parseOptions(row.options, row);
    const correctIndex = parseCorrectIndex(row.correct_index || row.correctindex || row.answer || row.correct_answer || '', options);
    const valid = Boolean(row.question?.trim()) && options.length >= 2 && correctIndex >= 0;

    return {
      question: row.question ?? '',
      options,
      correct_index: correctIndex >= 0 ? correctIndex : 0,
      explanation: row.explanation ?? '',
      topic: row.topic || 'General',
      difficulty: normalizeDifficulty(row.difficulty),
      exam: row.exam || 'ЕГЭ',
      valid,
      error: valid ? undefined : `Row ${index + 2}: missing question, options, or correct answer`,
    };
  });
}

function normalizeServerQuestion(question: Partial<ParsedQuestion>, index: number): ParsedQuestion {
  const options = Array.isArray(question.options)
    ? question.options.map(asString).filter(Boolean)
    : [];
  const correctIndex = Number(question.correct_index);
  const valid = Boolean(asString(question.question)) &&
    options.length >= 2 &&
    Number.isInteger(correctIndex) &&
    correctIndex >= 0 &&
    correctIndex < options.length;

  return {
    question: asString(question.question),
    options,
    correct_index: valid ? correctIndex : 0,
    explanation: asString(question.explanation),
    topic: asString(question.topic) || 'General',
    difficulty: normalizeDifficulty(question.difficulty),
    exam: asString(question.exam) || 'ЕГЭ',
    valid,
    error: valid ? undefined : question.error || `Question ${index + 1}: invalid structure`,
  };
}

function unsupportedSpreadsheet(locale: string): ParsedQuestion[] {
  return [{
    question: locale === 'ru'
      ? 'XLS/XLSX пока не разбирается в браузере без дополнительной библиотеки'
      : 'XLS/XLSX is not parsed in the browser yet',
    options: [],
    correct_index: 0,
    explanation: '',
    topic: '',
    difficulty: 'medium',
    exam: '',
    valid: false,
    error: locale === 'ru'
      ? 'Сохрани таблицу как CSV и загрузи ещё раз'
      : 'Save the sheet as CSV and upload it again',
  }];
}

export default function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = useLocale();
  const router = useRouter();
  const [schoolId, setSchoolId] = useState('');
  const [parsed, setParsed] = useState<ParsedQuestion[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [format, setFormat] = useState('');
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { params.then((p) => setSchoolId(p.id)); }, [params]);

  async function parseStructuredFile(file: File) {
    const response = await fetch('/api/parse-qsze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: await file.arrayBuffer(),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Server parse error');
    }

    setFormat(data.format || '');
    return Array.isArray(data.questions)
      ? data.questions.map((question: Partial<ParsedQuestion>, index: number) => normalizeServerQuestion(question, index))
      : [];
  }

  async function handleFile(file: File) {
    const lowerName = file.name.toLowerCase();
    setFileName(file.name);
    setFormat('');
    setMessage('');
    setDone(0);

    try {
      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        setParsed(unsupportedSpreadsheet(locale));
        return;
      }

      if (lowerName.endsWith('.qst') || lowerName.endsWith('.qsz') || lowerName.endsWith('.qsze') || lowerName.endsWith('.json')) {
        const result = await parseStructuredFile(file);
        setParsed(result.length > 0 ? result : [{
          question: locale === 'ru' ? 'Вопросов не найдено в файле' : 'No questions found in the file',
          options: [],
          correct_index: 0,
          explanation: '',
          topic: '',
          difficulty: 'medium',
          exam: '',
          valid: false,
          error: 'No questions found',
        }]);
        return;
      }

      setFormat('CSV');
      setParsed(parseCSV(await file.text()));
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setParsed([{
        question: `${locale === 'ru' ? 'Ошибка' : 'Error'}: ${text}`,
        options: [],
        correct_index: 0,
        explanation: '',
        topic: '',
        difficulty: 'medium',
        exam: '',
        valid: false,
        error: text,
      }]);
    }
  }

  async function handleImport() {
    const valid = parsed.filter((question) => question.valid);
    if (!schoolId || valid.length === 0) return;

    setImporting(true);
    setMessage('');
    setDone(0);

    try {
      const response = await fetch(`/api/schools/${schoolId}/questions/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: valid }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setDone(data.imported ?? valid.length);
      setMessage(locale === 'ru'
        ? `Импортировано: ${data.imported ?? valid.length}. Пропущено: ${data.skipped ?? 0}.`
        : `Imported: ${data.imported ?? valid.length}. Skipped: ${data.skipped ?? 0}.`);
      setTimeout(() => router.push(`/${locale}/schools/${schoolId}/questions`), 900);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (locale === 'ru' ? 'Не удалось импортировать' : 'Import failed'));
    } finally {
      setImporting(false);
    }
  }

  const valid = parsed.filter((question) => question.valid);
  const invalid = parsed.filter((question) => !question.valid);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      <AppNavbar />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 80px' }}>
        <Link href={`/${locale}/schools/${schoolId}/questions`} style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textDecoration: 'none', display: 'block', marginBottom: 20 }}>
          ← {locale === 'ru' ? 'Назад к вопросам' : 'Back to questions'}
        </Link>
        <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 28, fontWeight: 400, letterSpacing: '-0.5px', marginBottom: 6 }}>
          {locale === 'ru' ? 'Импорт вопросов' : 'Import questions'}
        </h1>
        <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 24 }}>
          {locale === 'ru'
            ? 'Загрузи CSV, JSON, QST, QSZ или QSZE. Запись идёт через защищённый серверный импорт.'
            : 'Upload CSV, JSON, QST, QSZ, or QSZE. Questions are saved through the secure server import.'}
        </p>

        <div style={{ background: 'rgba(107,92,231,0.06)', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>
              {locale === 'ru' ? '📄 CSV-шаблон' : '📄 CSV template'}
            </div>
            <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
              {locale === 'ru' ? 'Колонки: question, option_a-d, correct_index, explanation, topic, difficulty, exam' : 'Columns: question, option_a-d, correct_index, explanation, topic, difficulty, exam'}
            </div>
          </div>
          <a href="/questions-template.csv" download style={{ background: '#6B5CE7', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
            {locale === 'ru' ? 'Скачать CSV' : 'Download CSV'}
          </a>
        </div>

        <div
          onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => { event.preventDefault(); setDragOver(false); const file = event.dataTransfer.files[0]; if (file) handleFile(file); }}
          onClick={() => fileRef.current?.click()}
          style={{ border: `2px dashed ${dragOver ? '#6B5CE7' : 'hsl(var(--border))'}`, borderRadius: 16, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'rgba(107,92,231,0.05)' : 'transparent', transition: 'all 0.2s', marginBottom: 20 }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
            {fileName || (locale === 'ru' ? 'Перетащи файл или нажми для выбора' : 'Drop file or click to browse')}
          </div>
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>CSV, JSON, QST, QSZ, QSZE</div>
          <input ref={fileRef} type="file" accept=".csv,.json,.qst,.qsz,.qsze,.xlsx,.xls" style={{ display: 'none' }} onChange={(event) => { const file = event.target.files?.[0]; if (file) handleFile(file); }} />
        </div>

        {parsed.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#22C07A', fontWeight: 500 }}>
                ✓ {valid.length} {locale === 'ru' ? 'валидных' : 'valid'}
              </div>
              {invalid.length > 0 && (
                <div style={{ background: 'rgba(232,64,64,0.1)', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#E84040', fontWeight: 500 }}>
                  ✕ {invalid.length} {locale === 'ru' ? 'с ошибками' : 'with errors'}
                </div>
              )}
              {format && (
                <div style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
                  {format}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, maxHeight: 360, overflowY: 'auto' }}>
              {parsed.map((question, index) => (
                <div key={`${question.question}-${index}`} style={{ background: question.valid ? 'hsl(var(--card))' : 'rgba(232,64,64,0.05)', border: `1px solid ${question.valid ? 'hsl(var(--border))' : 'rgba(232,64,64,0.3)'}`, borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{question.question || question.error}</div>
                      {question.valid && (
                        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'hsl(var(--muted-foreground))', flexWrap: 'wrap' }}>
                          <span>{question.exam}</span>
                          <span>{question.topic}</span>
                          <span>{question.difficulty}</span>
                          <span>{question.options.length} {locale === 'ru' ? 'варианта' : 'options'}</span>
                          <span style={{ color: '#22C07A' }}>✓ {question.options[question.correct_index] || '?'}</span>
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: question.valid ? '#22C07A' : '#E84040', flexShrink: 0 }}>{question.valid ? '✓' : '✕'}</span>
                  </div>
                </div>
              ))}
            </div>

            {message && (
              <div style={{ marginBottom: 12, fontSize: 13, color: message.toLowerCase().includes('error') || message.toLowerCase().includes('fail') || message.toLowerCase().includes('не удалось') ? '#E84040' : '#22C07A' }}>
                {message}
              </div>
            )}

            {valid.length > 0 && (
              <button
                onClick={handleImport}
                disabled={importing}
                style={{ width: '100%', background: importing ? '#9B8DFF' : '#6B5CE7', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 500, cursor: importing ? 'default' : 'pointer', fontFamily: 'inherit' }}
              >
                {importing
                  ? `${locale === 'ru' ? 'Импортирую' : 'Importing'} ${done}/${valid.length}...`
                  : `${locale === 'ru' ? 'Импортировать' : 'Import'} ${valid.length} ${locale === 'ru' ? 'вопросов' : 'questions'}`}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
