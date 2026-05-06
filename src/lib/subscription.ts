export type SubscriptionAccess = {
  plan?: string | null;
  status?: string | null;
};

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export type SubscriptionTier = 'free' | 'pro' | 'max';

export function getSubscriptionTier(subscription?: SubscriptionAccess | null): SubscriptionTier {
  const plan = subscription?.plan?.toLowerCase();
  const status = subscription?.status?.toLowerCase();

  if (!ACTIVE_STATUSES.has(status ?? '')) {
    return 'free';
  }

  return plan === 'max' ? 'max' : plan === 'pro' ? 'pro' : 'free';
}

export function hasProAccess(subscription?: SubscriptionAccess | null) {
  return getSubscriptionTier(subscription) !== 'free';
}

export function hasMaxAccess(subscription?: SubscriptionAccess | null) {
  return getSubscriptionTier(subscription) === 'max';
}
