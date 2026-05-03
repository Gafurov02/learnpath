import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env/server';

export async function POST(req: NextRequest) {
  const env = getServerEnv();
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const supabaseAdmin = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
  );

  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature error:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    // Idempotency: record the event id (requires `public.stripe_events` table).
    const { error: eventInsertError } = await supabaseAdmin
      .from('stripe_events')
      .insert({ event_id: event.id, type: event.type });

    // If already processed, exit early.
    if (eventInsertError?.code === '23505') {
      return NextResponse.json({ received: true });
    }

    if (eventInsertError) {
      throw new Error(eventInsertError.message);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (userId) {
          await supabaseAdmin.from('subscriptions').upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            status: 'active',
            plan: 'pro',
          });
        }
        break;
      }
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await supabaseAdmin
            .from('subscriptions')
            .update({ status: sub.status === 'active' ? 'active' : 'cancelled', plan: sub.status === 'active' ? 'pro' : 'free' })
            .eq('stripe_subscription_id', sub.id);
        break;
      }
    }
  } catch (err: any) {
    console.error('Webhook handler error:', err.message);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}