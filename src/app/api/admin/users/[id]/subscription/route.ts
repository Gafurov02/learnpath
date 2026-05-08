import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/server-supabase';
import { isAdminUser } from '@/lib/admin-access';
import { hasProAccess } from '@/lib/subscription';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const { access } = await req.json();

  if (access !== 'pro' && access !== 'max' && access !== 'free') {
    return NextResponse.json({ error: 'Invalid access value' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: existingSubscription, error: existingSubscriptionError } = await admin
    .from('subscriptions')
    .select('xp, level')
    .eq('user_id', id)
    .maybeSingle();

  if (existingSubscriptionError) {
    return NextResponse.json({ error: existingSubscriptionError.message }, { status: 500 });
  }

  const payload = {
    user_id: id,
    xp: existingSubscription?.xp ?? 0,
    level: existingSubscription?.level ?? 'beginner',
    plan: access === 'max' ? 'max' : access === 'pro' ? 'pro' : 'free',
    status: access === 'max' || access === 'pro' ? 'active' : 'free',
  };

  const { data: subscription, error: subscriptionError } = await admin
    .from('subscriptions')
    .upsert(payload, {
      onConflict: 'user_id',
    })
    .select('user_id, xp, level, plan, status')
    .single();

  if (subscriptionError) {
    return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
  }

  return NextResponse.json({
    subscription,
    hasProAccess: hasProAccess(subscription),
  });
}
