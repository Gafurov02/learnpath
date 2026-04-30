'use client';

import { useEffect, useState, useRef } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppNavbar } from '@/components/layout/AppNavbar';

type ParsedQuestion = {
    question: string; options: string[];
    correct_index: number; explanation: string; topic: string; difficulty: string; exam: string;
    valid: boolean; error?: string;
};

type ImportSummary = {
    imported: number;
    skipped: number;
    newAchievements: string[];
};

export default function ImportPage({ params }: { params: Promise<{ id: string }> }) {
    const locale = useLocale();
    const router = useRouter();
    const [schoolId, setSchoolId] = useState('');
    const [parsed, setParsed] = useState<ParsedQuestion[]>([]);
    const [importing, setImporting] = useState(false);
    const [done, setDone] = useState(0);
    const [format, setFormat] = useState('');
    const [importError, setImportError] = useState('');
    const [summary, setSummary] = useState<ImportSummary | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [fileName, setFileName] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => { params.then(p => setSchoolId(p.id)); }, [params]);

    function parseCsvLine(line: string) {
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

    function parseCorrectIndex(value: string, options: string[]) {
        const trimmed = value.trim();
        const numeric = Number(trimmed);

        if (Number.isInteger(numeric) && numeric >= 0 && numeric < options.length) {
            return numeric;
        }

        const letter = trimmed.toUpperCase();
        if (/^[A-Z]$/.test(letter)) {
            const index = letter.charCodeAt(0) - 65;
            return index >= 0 && index < options.length ? index : -1;
        }

        return options.findIndex(option => option.toLowerCase() === trimmed.toLowerCase());
    }

    function parseCSV(text: string): ParsedQuestion[] {
        const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());

        if (lines.length < 2) {
            return [{
                question: '',
                options: [],
                correct_index: 0,
                explanation: '',
                topic: 'General',
                difficulty: 'medium',
                exam: 'IELTS',
                valid: false,
                error: locale === 'ru' ? 'CSV должен содержать заголовок и хотя бы одну строку' : 'CSV must contain a header and at least one row',
            }];
        }

        const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
        return lines.slice(1).map((line, i) => {
            const cols = parseCsvLine(line);
            const get = (key: string) => cols[headers.indexOf(key)]?.trim() ?? '';
            const options = [get('option_a'), get('option_b'), get('option_c'), get('option_d')].filter(Boolean);
            const correctIndex = parseCorrectIndex(get('correct_index') || get('answer') || get('correct_answer'), options);
            const valid = !!(get('question') && options.length >= 2 && correctIndex >= 0);

            return {
                question: get('question'),
                options,
                correct_index: correctIndex >= 0 ? correctIndex : 0,
                explanation: get('explanation'),
                topic: get('topic') || 'General',
                difficulty: get('difficulty') || 'medium',
                exam: get('exam') || 'IELTS',
                valid,
                error: valid ? undefined : `Row ${i + 2}: missing question, answers, or correct answer`,
            };
        });
    }

    async function handleFile(file: File) {
        setFileName(file.name);
        setDone(0);
        setFormat('');
        setSummary(null);
        setImportError('');

        const lowerName = file.name.toLowerCase();
        const isBinaryQuestionFile = lowerName.endsWith('.qsze') || lowerName.endsWith('.qsz') || lowerName.endsWith('.qst') || lowerName.endsWith('.json');
        const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');

        if (isBinaryQuestionFile) {
            await parseQsze(file);
        } else if (isExcel) {
            setParsed([{
                question: locale === 'ru' ? 'Excel импорт временно отключён' : 'Excel import is temporarily disabled',
                options: [],
                correct_index: 0,
                explanation: '',
                topic: '',
                difficulty: 'medium',
                exam: '',
                valid: false,
                error: locale === 'ru' ? 'Сохрани таблицу как CSV и загрузи снова' : 'Save the sheet as CSV and upload it again',
            }]);
        } else {
            const text = await file.text();
            setParsed(parseCSV(text));
            setFormat('CSV');
        }
    }

    async function parseQsze(file: File) {
        try {
            const buf = await file.arrayBuffer();
            const res = await fetch('/api/parse-qsze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/octet-stream' },
                body: buf,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Server parse error');
            if (data.questions?.length > 0) {
                setParsed(data.questions);
                setFormat(data.format ?? 'QSZE');
            } else {
                setParsed([{ question: 'Вопросов не найдено в файле', options: [], correct_index: 0, explanation: '', topic: '', difficulty: 'medium', exam: '', valid: false, error: 'No questions found' }]);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Server parse error';
            setParsed([{ question: `Ошибка: ${message}`, options: [], correct_index: 0, explanation: '', topic: '', difficulty: 'medium', exam: '', valid: false, error: message }]);
        }
    }

    async function handleImport() {
        if (!schoolId) return;

        setImporting(true);
        setImportError('');
        setSummary(null);
        const valid = parsed.filter(q => q.valid);

        try {
            const response = await fetch(`/api/school/${schoolId}/questions/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions: valid }),
            });

            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'Import failed');

            setDone(payload.imported ?? valid.length);
            setSummary({
                imported: payload.imported ?? valid.length,
                skipped: payload.skipped ?? 0,
                newAchievements: payload.newAchievements ?? [],
            });
            setTimeout(() => router.push(`/${locale}/school/${schoolId}/questions`), 1200);
        } catch (error: unknown) {
            setImportError(error instanceof Error ? error.message : 'Import failed');
        } finally {
            setImporting(false);
        }
    }

    const valid = parsed.filter(q => q.valid);
    const invalid = parsed.filter(q => !q.valid);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
            <AppNavbar />
            <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 80px' }}>
                <Link href={`/${locale}/school/${schoolId}/questions`} style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textDecoration: 'none', display: 'block', marginBottom: 20 }}>
                    ← {locale === 'ru' ? 'Назад к вопросам' : 'Back to questions'}
                </Link>
                <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 28, fontWeight: 400, letterSpacing: '-0.5px', marginBottom: 6 }}>
                    {locale === 'ru' ? 'Импорт вопросов' : 'Import questions'}
                </h1>
                <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 24 }}>
                    {locale === 'ru' ? 'Загрузи CSV, JSON, QST, QSZ или QSZE файл с вопросами' : 'Upload a CSV, JSON, QST, QSZ, or QSZE file with questions'}
                </p>

                {/* Download template */}
                <div style={{ background: 'rgba(107,92,231,0.06)', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>
                            {locale === 'ru' ? '📄 Скачай шаблон CSV' : '📄 Download CSV template'}
                        </div>
                        <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                            {locale === 'ru' ? 'Колонки: question, option_a-d, correct_index, explanation, topic, difficulty, exam' : 'Columns: question, option_a-d, correct_index, explanation, topic, difficulty, exam'}
                        </div>
                    </div>
                    <a href="/questions-template.csv" download style={{ background: '#6B5CE7', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                        {locale === 'ru' ? 'Скачать CSV' : 'Download CSV'}
                    </a>
                </div>

                {/* Drop zone */}
                <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                    onClick={() => fileRef.current?.click()}
                    style={{ border: `2px dashed ${dragOver ? '#6B5CE7' : 'hsl(var(--border))'}`, borderRadius: 16, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'rgba(107,92,231,0.05)' : 'transparent', transition: 'all 0.2s', marginBottom: 20 }}
                >
                    <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
                    <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
                        {fileName || (locale === 'ru' ? 'Перетащи файл или нажми для выбора' : 'Drop file or click to browse')}
                    </div>
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>CSV, JSON, QST, QSZ, QSZE</div>
                    <input ref={fileRef} type="file" accept=".csv,.json,.qst,.qsz,.qsze,.xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                </div>

                {/* Preview */}
                {parsed.length > 0 && (
                    <>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                            {format && (
                                <div style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>
                                    {locale === 'ru' ? 'Формат' : 'Format'}: {format}
                                </div>
                            )}
                            <div style={{ background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#22C07A', fontWeight: 500 }}>
                                ✓ {valid.length} {locale === 'ru' ? 'валидных' : 'valid'}
                            </div>
                            {invalid.length > 0 && (
                                <div style={{ background: 'rgba(232,64,64,0.1)', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#E84040', fontWeight: 500 }}>
                                    ✕ {invalid.length} {locale === 'ru' ? 'с ошибками' : 'with errors'}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, maxHeight: 360, overflowY: 'auto' }}>
                            {parsed.map((q, i) => (
                                <div key={i} style={{ background: q.valid ? 'hsl(var(--card))' : 'rgba(232,64,64,0.05)', border: `1px solid ${q.valid ? 'hsl(var(--border))' : 'rgba(232,64,64,0.3)'}`, borderRadius: 10, padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{q.question || q.error}</div>
                                            {q.valid && (
                                                <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                                                    <span>{q.exam}</span><span>{q.topic}</span><span>{q.difficulty}</span>
                                                    <span style={{ color: '#22C07A' }}>✓ {q.options[q.correct_index]}</span>
                                                    <span>{q.options.length} {locale === 'ru' ? 'вариантов' : 'options'}</span>
                                                </div>
                                            )}
                                        </div>
                                        <span style={{ fontSize: 11, color: q.valid ? '#22C07A' : '#E84040', flexShrink: 0 }}>{q.valid ? '✓' : '✕'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {valid.length > 0 && (
                            <>
                                {importError && (
                                    <div style={{ background: 'rgba(232,64,64,0.08)', border: '1px solid rgba(232,64,64,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E84040', marginBottom: 12 }}>
                                        {importError}
                                    </div>
                                )}
                                {summary && (
                                    <div style={{ background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.28)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#168A58', marginBottom: 12 }}>
                                        {locale === 'ru'
                                            ? `Импортировано: ${summary.imported}. Пропущено: ${summary.skipped}.`
                                            : `Imported: ${summary.imported}. Skipped: ${summary.skipped}.`}
                                        {summary.newAchievements.length > 0 && ` ${locale === 'ru' ? 'Новые достижения:' : 'New achievements:'} ${summary.newAchievements.join(', ')}`}
                                    </div>
                                )}
                                <button
                                    onClick={handleImport}
                                    disabled={importing || !!summary}
                                    style={{ width: '100%', background: importing || summary ? '#9B8DFF' : '#6B5CE7', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 500, cursor: importing || summary ? 'default' : 'pointer', fontFamily: 'inherit' }}
                                >
                                    {importing
                                        ? `${locale === 'ru' ? 'Импортирую' : 'Importing'} ${done}/${valid.length}...`
                                        : `${locale === 'ru' ? 'Импортировать' : 'Import'} ${valid.length} ${locale === 'ru' ? 'вопросов' : 'questions'}`}
                                </button>
                            </>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
