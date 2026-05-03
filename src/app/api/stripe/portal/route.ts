import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env/server';
import { createServerSupabaseClient } from '@/lib/server-supabase';
import { createServiceRoleClient } from '@/lib/server-supabase';

export async function POST(req: NextRequest) {
  try {
    const env = getServerEnv();
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { locale = 'en' } = await req.json();
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    const admin = createServiceRoleClient();
    const { data: sub, error: subError } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    const customerId = sub?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/${locale}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe portal error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}