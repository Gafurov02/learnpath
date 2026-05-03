import type { User } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env/server';

type AdminLikeUser = Pick<User, 'email' | 'app_metadata' | 'user_metadata'>;

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function parseAdminEmails() {
  return (getServerEnv().ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

function hasAdminRole(value: unknown): boolean {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'admin' || normalized === 'superadmin';
  }

  if (Array.isArray(value)) {
    return value.some((entry) => hasAdminRole(entry));
  }

  return false;
}

function hasAdminFlag(metadata: Record<string, unknown> | undefined) {
  return metadata?.admin === true || metadata?.is_admin === true;
}

export function isAdminUser(user: AdminLikeUser | null | undefined) {
  if (!user) {
    return false;
  }

  const email = normalizeEmail(user.email);
  const adminEmails = parseAdminEmails();
  const userMetadata = user.user_metadata as Record<string, unknown> | undefined;
  const appMetadata = user.app_metadata as Record<string, unknown> | undefined;

  return (
    (email !== '' && adminEmails.includes(email)) ||
    hasAdminRole(userMetadata?.role) ||
    hasAdminRole(appMetadata?.role) ||
    hasAdminRole(userMetadata?.roles) ||
    hasAdminRole(appMetadata?.roles) ||
    hasAdminFlag(userMetadata) ||
    hasAdminFlag(appMetadata)
  );
}
