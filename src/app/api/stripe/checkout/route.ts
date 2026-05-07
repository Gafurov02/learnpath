import { NextRequest, NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env/server';
import { createServerSupabaseClient } from '@/lib/server-supabase';

export async function POST(req: NextRequest) {
  try {
    const env = getServerEnv();

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
      );
    }

    const { tier = 'pro' } = await req.json();

    const plan = tier === 'max' ? 'max' : 'pro';

    // цены
    const amount = plan === 'max' ? '10' : '0.99';

    // создаем invoice
    const response = await fetch(
        'https://pay.crypt.bot/api/createInvoice',
        {
          method: 'POST',
          headers: {
            'Crypto-Pay-API-Token': env.CRYPTO_PAY_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            asset: 'USDT',
            amount,
            description: `LearnPath ${plan.toUpperCase()} Subscription`,
            hidden_message: 'Спасибо за оплату ❤️',
            paid_btn_name: 'openBot',
            paid_btn_url: 'https://t.me/learnpath_robot',
            payload: JSON.stringify({
              user_id: user.id,
              plan,
            }),
            allow_comments: false,
            allow_anonymous: false,
          }),
        }
    );

    const data = await response.json();

    if (!data.ok) {
      return NextResponse.json(
          {
            error: data.error || 'Failed to create invoice',
          },
          { status: 500 }
      );
    }

    return NextResponse.json({
      url: data.result.pay_url,
    });
  } catch (e: any) {
    return NextResponse.json(
        {
          error: e.message || 'Server error',
        },
        { status: 500 }
    );
  }
}