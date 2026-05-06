import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env/server';
import { createServerSupabaseClient } from '@/lib/server-supabase';

export async function POST(req: NextRequest) {
  try {
    const env = getServerEnv();
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { locale = 'en', tier = 'pro' } = await req.json();
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const plan = tier === 'max' ? 'max' : 'pro';
    const price = plan === 'max'
      ? env.STRIPE_MAX_PRICE_ID
      : (env.STRIPE_PRO_PRICE_ID || env.STRIPE_PRICE_ID);

    if (!price) {
      return NextResponse.json({ error: `Missing Stripe price for ${plan}` }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/${locale}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${locale}/pricing`,
      metadata: { user_id: user.id, locale, plan },
      subscription_data: {
        metadata: { user_id: user.id, locale, plan },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe checkout error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
