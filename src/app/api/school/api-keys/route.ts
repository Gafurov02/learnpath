import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'crypto';

async function canManageSchool(admin: SupabaseClient, schoolId: string | null, userId: string) {
    if (!schoolId) {
        return { ok: false, status: 400, error: 'school_id_required' };
    }

    const { data: school, error: schoolError } = await admin
        .from('schools')
        .select('owner_id')
        .eq('id', schoolId)
        .maybeSingle();

    if (schoolError) {
        throw new Error(schoolError.message);
    }

    if (!school) {
        return { ok: false, status: 404, error: 'school_not_found' };
    }

    if (school.owner_id === userId) {
        return { ok: true };
    }

    const { data: membership, error: membershipError } = await admin
        .from('school_members')
        .select('role')
        .eq('school_id', schoolId)
        .eq('user_id', userId)
        .maybeSingle();

    if (membershipError) {
        throw new Error(membershipError.message);
    }

    return membership?.role === 'teacher'
        ? { ok: true }
        : { ok: false, status: 403, error: 'forbidden' };
}

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const school_id = searchParams.get('school_id');

    const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const access = await canManageSchool(admin, school_id, user.id);
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data } = await admin.from('api_keys')
        .select('id, name, key_preview, active, last_used, requests, created_at')
        .eq('school_id', school_id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { school_id, name } = await req.json();

    // Generate key: lp_sk_<random32>
    const rawKey = `lp_sk_${randomBytes(24).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPreview = `...${rawKey.slice(-4)}`;

    const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const access = await canManageSchool(admin, school_id, user.id);
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    await admin.from('api_keys').insert({
        school_id, user_id: user.id,
        key_hash: keyHash, key_preview: keyPreview,
        name: name || 'Default key',
    });

    // Return raw key ONCE — never stored
    return NextResponse.json({ key: rawKey, preview: keyPreview });
}

export async function DELETE(req: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await admin.from('api_keys').delete().eq('id', id).eq('user_id', user.id);
    return NextResponse.json({ ok: true });
}
