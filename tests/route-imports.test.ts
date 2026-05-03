import { describe, expect, it } from 'vitest';

describe('route modules', () => {
  it('importing API routes does not require env at import-time', async () => {
    const savedEnv = { ...process.env };

    try {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_PRICE_ID;
      delete process.env.ANTHROPIC_API_KEY;

      await expect(import('../src/app/api/cache-questions/route')).resolves.toBeTruthy();
      await expect(import('../src/app/api/school/competition/route')).resolves.toBeTruthy();
      await expect(import('../src/app/api/stripe/webhook/route')).resolves.toBeTruthy();
    } finally {
      process.env = savedEnv;
    }
  });
});

