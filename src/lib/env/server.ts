import { z } from 'zod';

const serverEnvSchema = z.object({
  // Public (still required on server for SSR + API routes)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),

  // Server-only
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_ID: z.string().min(1),
  STRIPE_PRO_PRICE_ID: z.string().min(1).optional(),
  STRIPE_MAX_PRICE_ID: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1),
  ADMIN_EMAILS: z.string().optional(),
});

let cached: z.infer<typeof serverEnvSchema> | null = null;

export function getServerEnv() {
  if (cached) {
    return cached;
  }

  cached = serverEnvSchema.parse(process.env);
  return cached;
}
