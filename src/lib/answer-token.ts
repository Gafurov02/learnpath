import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'crypto';

const TOKEN_VERSION = 'v1';
const TOKEN_TTL_MS = 30 * 60 * 1000;

export type AnswerTokenPayload = {
  v: 1;
  nonce: string;
  userId: string;
  exam: string;
  topic: string;
  difficulty: string;
  correctIndex: number;
  optionCount: number;
  explanation: string;
  issuedAt: number;
  expiresAt: number;
  source: 'ai' | 'custom';
};

type CreateAnswerTokenInput = {
  userId: string;
  exam: string;
  topic?: string | null;
  difficulty?: string | null;
  correctIndex: number;
  optionCount: number;
  explanation?: string | null;
  source: 'ai' | 'custom';
};

function base64UrlEncode(value: Buffer) {
  return value.toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url');
}

function getKey(secret: string) {
  return createHash('sha256').update(secret).digest();
}

export function createAnswerToken(secret: string, input: CreateAnswerTokenInput) {
  const now = Date.now();
  const payload: AnswerTokenPayload = {
    v: 1,
    nonce: randomUUID(),
    userId: input.userId,
    exam: input.exam,
    topic: input.topic || 'General',
    difficulty: input.difficulty || 'medium',
    correctIndex: input.correctIndex,
    optionCount: input.optionCount,
    explanation: input.explanation || '',
    issuedAt: now,
    expiresAt: now + TOKEN_TTL_MS,
    source: input.source,
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    TOKEN_VERSION,
    base64UrlEncode(iv),
    base64UrlEncode(ciphertext),
    base64UrlEncode(tag),
  ].join('.');
}

export function openAnswerToken(secret: string, token: string) {
  const [version, ivPart, ciphertextPart, tagPart] = token.split('.');

  if (version !== TOKEN_VERSION || !ivPart || !ciphertextPart || !tagPart) {
    throw new Error('invalid_answer_token');
  }

  const decipher = createDecipheriv('aes-256-gcm', getKey(secret), base64UrlDecode(ivPart));
  decipher.setAuthTag(base64UrlDecode(tagPart));
  const plaintext = Buffer.concat([
    decipher.update(base64UrlDecode(ciphertextPart)),
    decipher.final(),
  ]).toString('utf8');
  const payload = JSON.parse(plaintext) as AnswerTokenPayload;

  if (payload.v !== 1 || Date.now() > payload.expiresAt) {
    throw new Error('expired_answer_token');
  }

  return payload;
}

export function hashAnswerToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
