export type SubscriptionAccess = {
  plan?: string | null;
  status?: string | null;
};

export function hasProAccess(subscription?: SubscriptionAccess | null) {
  const plan = subscription?.plan?.toLowerCase();
  const status = subscription?.status?.toLowerCase();

  return plan === 'pro' && (status === 'active' || status === 'trialing');
}
