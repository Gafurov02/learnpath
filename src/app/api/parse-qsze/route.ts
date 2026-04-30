import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { gunzipSync, inflateRawSync, inflateSync } from 'zlib';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const DEFAULT_EXAM = 'ЕГЭ';
const DEFAULT_TOPIC = 'General';
const DEFAULT_DIFFICULTY = 'medium';
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

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

type QuestionCandidate = {
  question?: unknown;
  options?: unknown;
  option_a?: unknown;
  option_b?: unknown;
  option_c?: unknown;
  option_d?: unknown;
  correct_index?: unknown;
  correctIndex?: unknown;
  answer?: unknown;
  correct_answer?: unknown;
  explanation?: unknown;
  topic?: unknown;
  difficulty?: unknown;
  exam?: unknown;
};

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDifficulty(value: unknown) {
  const difficulty = asString(value).toLowerCase();
  return VALID_DIFFICULTIES.has(difficulty) ? difficulty : DEFAULT_DIFFICULTY;
}

function normalizeOptions(candidate: QuestionCandidate) {
  if (Array.isArray(candidate.options)) {
    return candidate.options.map(asString).filter(Boolean);
  }

  return [candidate.option_a, candidate.option_b, candidate.option_c, candidate.option_d]
    .map(asString)
    .filter(Boolean);
}

function parseCorrectIndex(value: unknown, options: string[]) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value >= 0 && value < options.length ? value : -1;
  }

  const text = asString(value);
  if (!text) {
    return -1;
  }

  const numeric = Number(text);
  if (Number.isInteger(numeric) && numeric >= 0 && numeric < options.length) {
    return numeric;
  }

  const letter = text.toUpperCase();
  if (/^[A-Z]$/.test(letter)) {
    const index = letter.charCodeAt(0) - 65;
    return index >= 0 && index < options.length ? index : -1;
  }

  return options.findIndex((option) => option.toLowerCase() === text.toLowerCase());
}

function toParsedQuestion(candidate: QuestionCandidate, index: number): ParsedQuestion {
  const question = asString(candidate.question);
  const options = normalizeOptions(candidate);
  const correctIndex = parseCorrectIndex(
    candidate.correct_index ?? candidate.correctIndex ?? candidate.answer ?? candidate.correct_answer,
    options
  );
  const valid = question.length > 0 && options.length >= 2 && correctIndex >= 0;
  const correctAnswer = correctIndex >= 0 ? options[correctIndex] : '';

  return {
    question,
    options,
    correct_index: correctIndex >= 0 ? correctIndex : 0,
    explanation: asString(candidate.explanation) || (correctAnswer ? `Правильный ответ: ${correctAnswer}` : ''),
    topic: asString(candidate.topic) || DEFAULT_TOPIC,
    difficulty: normalizeDifficulty(candidate.difficulty),
    exam: asString(candidate.exam) || DEFAULT_EXAM,
    valid,
    error: valid ? undefined : `Question ${index + 1}: missing question, answers, or correct answer`,
  };
}

function tryJson(text: string) {
  const payload = JSON.parse(text) as unknown;
  const questions = Array.isArray(payload)
    ? payload
    : typeof payload === 'object' && payload !== null && Array.isArray((payload as { questions?: unknown }).questions)
      ? (payload as { questions: unknown[] }).questions
      : [];

  if (questions.length === 0) {
    throw new Error('JSON has no questions array');
  }

  return questions.map((question, index) => toParsedQuestion(question as QuestionCandidate, index));
}

function tryQst(text: string) {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const candidates: QuestionCandidate[] = [];
  let current: { question: string; options: string[]; correctIndex: number } | null = null;

  for (const line of lines) {
    const marker = line[0];
    const value = line.slice(1).trim();

    if (marker === '?' && value) {
      if (current) {
        candidates.push({
          question: current.question,
          options: current.options,
          correct_index: current.correctIndex,
        });
      }

      current = { question: value, options: [], correctIndex: -1 };
      continue;
    }

    if ((marker === '+' || marker === '-') && current && value) {
      if (marker === '+' && current.correctIndex === -1) {
        current.correctIndex = current.options.length;
      }
      current.options.push(value);
    }
  }

  if (current) {
    candidates.push({
      question: current.question,
      options: current.options,
      correct_index: current.correctIndex,
    });
  }

  if (candidates.length === 0) {
    throw new Error('QST questions not found');
  }

  return candidates.map(toParsedQuestion);
}

function readUInt32LE(data: Buffer, state: { pos: number }) {
  if (state.pos + 4 > data.length) {
    throw new Error('Unexpected end of file');
  }

  const value = data.readUInt32LE(state.pos);
  state.pos += 4;
  return value;
}

function readInt32LE(data: Buffer, state: { pos: number }) {
  if (state.pos + 4 > data.length) {
    throw new Error('Unexpected end of file');
  }

  const value = data.readInt32LE(state.pos);
  state.pos += 4;
  return value;
}

function readString(data: Buffer, state: { pos: number }) {
  const length = readUInt32LE(data, state);

  if (length > data.length - state.pos) {
    throw new Error('String length is outside file bounds');
  }

  const value = data.subarray(state.pos, state.pos + length).toString('utf8').trim();
  state.pos += length;
  return value;
}

function tryAssystQsz(data: Buffer) {
  const state = { pos: 0 };
  const candidates: QuestionCandidate[] = [];

  while (state.pos < data.length) {
    while (state.pos < data.length && data[state.pos] === 0) {
      state.pos += 1;
    }

    if (data.length - state.pos < 8) {
      break;
    }

    const question = readString(data, state);
    const answerCount = readUInt32LE(data, state);

    if (!question || answerCount < 2 || answerCount > 32) {
      throw new Error('Invalid QSZ structure');
    }

    const options: string[] = [];
    let correctIndex = -1;

    for (let answerIndex = 0; answerIndex < answerCount; answerIndex += 1) {
      const answer = readString(data, state);
      const flag = readInt32LE(data, state);

      if (answer) {
        if (flag !== 0 && correctIndex === -1) {
          correctIndex = options.length;
        }
        options.push(answer);
      }
    }

    candidates.push({ question, options, correct_index: correctIndex });
  }

  if (candidates.length === 0) {
    throw new Error('QSZ questions not found');
  }

  return candidates.map(toParsedQuestion);
}

function tryLegacyQsze(data: Buffer) {
  const state = { pos: 0 };

  if (data.length < 28) {
    throw new Error('Legacy QSZE header is too short');
  }

  state.pos += 4;
  const titleLength = readUInt32LE(data, state);
  state.pos += titleLength;
  state.pos += 16;
  const questionCount = readUInt32LE(data, state);
  state.pos += 8;

  if (questionCount < 1 || questionCount > 5000) {
    throw new Error('Invalid legacy QSZE question count');
  }

  const candidates: QuestionCandidate[] = [];

  for (let questionIndex = 0; questionIndex < questionCount; questionIndex += 1) {
    if (questionIndex > 0 && state.pos + 4 <= data.length && data.readUInt32LE(state.pos) === 0) {
      state.pos += 4;
    }

    const question = readString(data, state);
    state.pos += 8;
    const answerCount = readUInt32LE(data, state);
    const correctIndex = readUInt32LE(data, state);

    if (answerCount < 2 || answerCount > 32) {
      throw new Error('Invalid legacy QSZE answer count');
    }

    const options: string[] = [];
    for (let answerIndex = 0; answerIndex < answerCount; answerIndex += 1) {
      options.push(readString(data, state));
      state.pos += 8;
    }

    candidates.push({ question, options, correct_index: correctIndex });
  }

  return candidates.map(toParsedQuestion);
}

function getTextCandidates(data: Buffer) {
  const text = data.toString('utf8').replace(/^\uFEFF/, '').trim();
  return text ? [text] : [];
}

function getBinaryCandidates(input: Buffer) {
  const candidates: { name: string; data: Buffer }[] = [{ name: 'raw', data: input }];

  for (const [name, decompress] of [
    ['zlib', inflateSync],
    ['gzip', gunzipSync],
    ['raw-deflate', inflateRawSync],
  ] as const) {
    try {
      candidates.push({ name, data: decompress(input) });
    } catch {
      // Some QSZE/QSZ exports are raw text, some are zlib-compressed. Try all safe paths.
    }
  }

  return candidates;
}

function parseQuestions(input: Buffer) {
  const errors: string[] = [];

  for (const candidate of getBinaryCandidates(input)) {
    for (const text of getTextCandidates(candidate.data)) {
      for (const [name, parse] of [
        ['JSON', tryJson],
        ['QST', tryQst],
      ] as const) {
        try {
          return { questions: parse(text), format: `${candidate.name}/${name}` };
        } catch (error) {
          errors.push(`${candidate.name}/${name}: ${error instanceof Error ? error.message : 'failed'}`);
        }
      }
    }

    for (const [name, parse] of [
      ['Assyst QSZ', tryAssystQsz],
      ['Legacy QSZE', tryLegacyQsze],
    ] as const) {
      try {
        return { questions: parse(candidate.data), format: `${candidate.name}/${name}` };
      } catch (error) {
        errors.push(`${candidate.name}/${name}: ${error instanceof Error ? error.message : 'failed'}`);
      }
    }
  }

  throw new Error(
    `Не удалось распознать файл. Поддерживаются QST, QSZ/QSZE на zlib и JSON. ${errors.slice(0, 3).join('; ')}`
  );
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const arrayBuffer = await req.arrayBuffer();

    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'Файл пустой' }, { status: 400 });
    }

    if (arrayBuffer.byteLength > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Файл слишком большой. Максимум 5 MB.' }, { status: 413 });
    }

    const { questions, format } = parseQuestions(Buffer.from(arrayBuffer));

    return NextResponse.json({
      questions,
      count: questions.length,
      validCount: questions.filter((question) => question.valid).length,
      format,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Не удалось разобрать файл' },
      { status: 400 }
    );
  }
}
