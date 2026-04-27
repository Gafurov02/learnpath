'use client';

import { useEffect, useState, useRef } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';

type ParsedQuestion = {
    question: string; option_a: string; option_b: string; option_c: string; option_d: string;
    correct_index: number; explanation: string; topic: string; difficulty: string; exam: string;
    valid: boolean; error?: string;
};

export default function ImportPage({ params }: { params: Promise<{ id: string }> }) {
    const locale = useLocale();
    const router = useRouter();
    const [schoolId, setSchoolId] = useState('');
    const [parsed, setParsed] = useState<ParsedQuestion[]>([]);
    const [importing, setImporting] = useState(false);
    const [done, setDone] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const [fileName, setFileName] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => { params.then(p => setSchoolId(p.id)); }, [params]);

    function parseCSV(text: string): ParsedQuestion[] {
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
        return lines.slice(1).map((line, i) => {
            const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)?.map(c => c.trim().replace(/^"|"$/g, '')) ?? [];
            const get = (key: string) => cols[headers.indexOf(key)] ?? '';
            const ci = parseInt(get('correct_index'));
            const valid = !!(get('question') && get('option_a') && get('option_b') && !isNaN(ci) && ci >= 0 && ci <= 3);
            return {
                question: get('question'), option_a: get('option_a'), option_b: get('option_b'),
                option_c: get('option_c'), option_d: get('option_d'), correct_index: ci,
                explanation: get('explanation'), topic: get('topic') || 'General',
                difficulty: get('difficulty') || 'medium', exam: get('exam') || 'IELTS',
                valid, error: valid ? undefined : `Row ${i + 2}: missing required fields`,
            };
        });
    }

    async function parseExcel(buffer: ArrayBuffer): Promise<ParsedQuestion[]> {
        const { read, utils } = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs' as any);
        const wb = read(buffer);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = utils.sheet_to_json(ws);
        return rows.map((row, i) => {
            const ci = parseInt(row.correct_index);
            const valid = !!(row.question && row.option_a && row.option_b && !isNaN(ci));
            return {
                question: row.question || '', option_a: row.option_a || '', option_b: row.option_b || '',
                option_c: row.option_c || '', option_d: row.option_d || '', correct_index: ci,
                explanation: row.explanation || '', topic: row.topic || 'General',
                difficulty: row.difficulty || 'medium', exam: row.exam || 'IELTS',
                valid, error: valid ? undefined : `Row ${i + 2}: missing required fields`,
            };
        });
    }

    async function handleFile(file: File) {
        setFileName(file.name);
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        const isQsze = file.name.endsWith('.qsze');
        if (isExcel) {
            const buf = await file.arrayBuffer();
            const result = await parseExcel(buf);
            setParsed(result);
        } else {
            // qsze is JSON format, CSV otherwise
            const text = await file.text();
            if (isQsze) {
                try {
                    const json = JSON.parse(text);
                    const questions = Array.isArray(json) ? json : json.questions ?? [];
                    const result: ParsedQuestion[] = questions.map((q: any, i: number) => {
                        const opts = q.options || q.answers || [q.a, q.b, q.c, q.d];
                        const ci = typeof q.correct_index === 'number' ? q.correct_index : (typeof q.correct === 'number' ? q.correct : 0);
                        const valid = !!(q.question && opts?.length >= 2);
                        return {
                            question: q.question || '', option_a: opts?.[0] || '', option_b: opts?.[1] || '',
                            option_c: opts?.[2] || '', option_d: opts?.[3] || '', correct_index: ci,
                            explanation: q.explanation || q.explain || '',
                            topic: q.topic || q.category || 'General',
                            difficulty: q.difficulty || 'medium', exam: q.exam || 'IELTS',
                            valid, error: valid ? undefined : `Row ${i + 2}: missing required fields`,
                        };
                    });
                    setParsed(result);
                } catch {
                    setParsed(parseCSV(text));
                }
            } else {
                setParsed(parseCSV(text));
            }
        }
    }

    async function handleImport() {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setImporting(true);
        const valid = parsed.filter(q => q.valid);
        let count = 0;
        for (const q of valid) {
            await supabase.from('custom_questions').insert({
                school_id: schoolId, created_by: user.id,
                exam: q.exam, topic: q.topic, question: q.question,
                options: [q.option_a, q.option_b, q.option_c, q.option_d],
                correct_index: q.correct_index, explanation: q.explanation,
                difficulty: q.difficulty, active: true,
            });
            count++;
            setDone(count);
        }
        setImporting(false);
        setTimeout(() => router.push(`/${locale}/school/${schoolId}/questions`), 1000);
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
                    {locale === 'ru' ? 'Загрузи CSV или Excel файл с вопросами' : 'Upload a CSV or Excel file with questions'}
                </p>

                {/* Download template */}
                <div style={{ background: 'rgba(107,92,231,0.06)', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>
                            {locale === 'ru' ? '📄 Скачай шаблон' : '📄 Download template'}
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
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>CSV, XLS, XLSX, QSZE</div>
                    <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.qsze" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                </div>

                {/* Preview */}
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
                                                    <span style={{ color: '#22C07A' }}>✓ {[q.option_a,q.option_b,q.option_c,q.option_d][q.correct_index]}</span>
                                                </div>
                                            )}
                                        </div>
                                        <span style={{ fontSize: 11, color: q.valid ? '#22C07A' : '#E84040', flexShrink: 0 }}>{q.valid ? '✓' : '✕'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

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