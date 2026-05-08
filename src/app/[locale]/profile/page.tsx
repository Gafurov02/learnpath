'use client';

import { useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { getLevelByXp, LEVELS } from '@/lib/levels';
import { hasProAccess } from '@/lib/subscription';
import { getUserAvatarUrl, getUserDisplayName } from '@/lib/user-profile';
import { ProfileOverview } from "@/components/profile/ProfileOverview";
import { ProfileActivityChart } from "@/components/profile/ProfileActivityChart";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { toast } from "sonner";
import { ProfileAchievements } from "@/components/profile/ProfileAchievements";
import { ProfileStatsTab } from "@/components/profile/ProfileStatsTab";
import {diff} from "@vitest/utils/diff";

type Achievement = { code: string; name: string; description: string; icon: string; earned: boolean; earned_at?: string };
type Attempt = { exam: string; topic: string; correct: boolean; difficulty: string; created_at: string };

async function resizeAvatarFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 192;
        const smallestSide = Math.min(image.width, image.height);
        const offsetX = (image.width - smallestSide) / 2;
        const offsetY = (image.height - smallestSide) / 2;

        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas is not available'));
          return;
        }

        context.drawImage(image, offsetX, offsetY, smallestSide, smallestSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };

      image.onerror = () => reject(new Error('Could not read the selected image'));
      image.src = typeof reader.result === 'string' ? reader.result : '';
    };

    reader.onerror = () => reject(new Error('Could not read the selected file'));
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const locale = useLocale();
  const t = useTranslations('app');
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'achievements'>('stats');
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push(`/${locale}/auth/login`); return; }
      const u = session.user;
      setUser(u);
      setNickname(getUserDisplayName(u));
      setAvatarUrl(getUserAvatarUrl(u));
      const [subRes, attemptsRes, achRes, allAchRes] = await Promise.all([
        supabase.from('subscriptions').select('xp, plan, status').eq('user_id', u.id).single(),
        supabase.from('quiz_attempts').select('exam, topic, correct, difficulty, created_at').eq('user_id', u.id).order('created_at', { ascending: false }).limit(500),
        supabase.from('user_achievements').select('achievement, earned_at').eq('user_id', u.id),
        supabase.from('achievements').select('*'),
      ]);
      setXp(subRes.data?.xp ?? 0);
      setIsPro(hasProAccess(subRes.data));
      setAttempts(attemptsRes.data ?? []);

      // Streak
      const dates = [...new Set((attemptsRes.data ?? []).map((a: any) => new Date(a.created_at).toDateString()))];
      let s = 0; const today = new Date();
      for (let i = 0; i < dates.length; i++) { const d = new Date(today); d.setDate(d.getDate() - i); if (dates.includes(d.toDateString())) s++; else break; }
      setStreak(s);

      const earnedMap = new Map((achRes.data ?? []).map((a: any) => [a.achievement, a.earned_at]));
      setAchievements((allAchRes.data ?? []).map((a: any) => ({ code: a.code, name: a.name, description: a.description, icon: a.icon, earned: earnedMap.has(a.code), earned_at: earnedMap.get(a.code) })));
      setLoading(false);
    });
  }, []);

  if (loading) return (
      <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: '#6B5CE7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
  );

  const level = getLevelByXp(xp);
  const nextLevel = LEVELS[LEVELS.findIndex(l => l.name === level.name) + 1];
  const progress = nextLevel ? Math.round(((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100) : 100;
  const name = getUserDisplayName(user);
  const total = attempts.length;
  const correct = attempts.filter(a => a.correct).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Per-exam stats
  const examStats: Record<string, { total: number; correct: number }> = {};
  attempts.forEach(a => {
    if (!examStats[a.exam]) examStats[a.exam] = { total: 0, correct: 0 };
    examStats[a.exam].total++;
    if (a.correct) examStats[a.exam].correct++;
  });

  // Per-topic weak areas (Pro)
  const topicStats: Record<string, { total: number; correct: number; exam: string }> = {};
  attempts.forEach(a => {
    const key = `${a.exam}::${a.topic}`;
    if (!topicStats[key]) topicStats[key] = { total: 0, correct: 0, exam: a.exam };
    topicStats[key].total++;
    if (a.correct) topicStats[key].correct++;
  });
  const weakTopics = Object.entries(topicStats)
      .map(([key, s]) => ({ topic: key.split('::')[1], exam: s.exam, accuracy: Math.round((s.correct / s.total) * 100), total: s.total }))
      .filter(t => t.total >= 3)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

  const strongTopics = Object.entries(topicStats)
      .map(([key, s]) => ({ topic: key.split('::')[1], exam: s.exam, accuracy: Math.round((s.correct / s.total) * 100), total: s.total }))
      .filter(t => t.total >= 3)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5);

  // Activity last 7 days
  const last7: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    const count = attempts.filter(a => new Date(a.created_at).toDateString() === dateStr).length;
    last7.push({ date: d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' }), count });
  }
  const maxCount = Math.max(...last7.map(d => d.count), 1);

  // Difficulty breakdown
  const diffStats = { easy: { total: 0, correct: 0 }, medium: { total: 0, correct: 0 }, hard: { total: 0, correct: 0 } };
  attempts.forEach(a => {
    const d = a.difficulty as keyof typeof diffStats;
    if (diffStats[d]) { diffStats[d].total++; if (a.correct) diffStats[d].correct++; }
  });

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = `/${locale}`;
  }

  async function handleAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const resizedAvatar = await resizeAvatarFile(file);
      setAvatarUrl(resizedAvatar);
    } finally {
      event.target.value = '';
    }
  }

  async function handleSaveProfile() {
    const trimmedNickname = nickname.trim();
    if (trimmedNickname === '') {
      return;
    }

    if (!user) {
      return;
    }

    setSavingProfile(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          full_name: trimmedNickname,
          nickname: trimmedNickname,
          avatar_url: avatarUrl || null,
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        setUser(data.user);
        setNickname(getUserDisplayName(data.user));
        setAvatarUrl(getUserAvatarUrl(data.user));
      }

      toast.success(
          locale === 'ru'
              ? 'Профиль обновлён'
              : 'Profile updated'
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (locale === 'ru' ? 'Не удалось обновить профиль' : 'Could not update the profile'));
    } finally {
      setSavingProfile(false);
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500,
    border: 'none', background: active ? 'hsl(var(--background))' : 'transparent',
    color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s',
  });

  return (
      <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
        <AppNavbar />
        <main style={{ maxWidth: 860, margin: '0 auto', padding: '20px 16px 80px' }}>

          <ProfileHero
              name={name}
              email={user?.email}
              avatarUrl={avatarUrl}
              xp={xp}
              level={level.name}
              streak={streak}
              progress={progress}
              isPro={isPro}
          />

          <ProfileOverview
              xp={xp}
              streak={streak}
              accuracy={accuracy}
              plan={isPro ? 'pro' : 'free'}
          />

          <ProfileActivityChart data={last7} />

          <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Avatar upload */}
            <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }} title={locale === 'ru' ? 'Нажми чтобы изменить фото' : 'Click to change photo'}>
              <UserAvatar avatarUrl={avatarUrl} email={user?.email} name={nickname.trim() || name} id={user?.id} size={44} accent={isPro ? 'pro' : 'default'} />
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: '#6B5CE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', border: '2px solid hsl(var(--background))' }}>✎</div>
              <input type="file" accept="image/*" onChange={handleAvatarFileChange} style={{ display: 'none' }} />
            </label>

            <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveProfile(); }}
                placeholder={locale === 'ru' ? 'Никнейм' : 'Nickname'}
                style={{ flex: 1, minWidth: 120, padding: '8px 12px', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 14, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', fontFamily: 'inherit', outline: 'none' }}
            />

            <button onClick={handleSaveProfile} disabled={savingProfile} style={{ background: savingProfile ? '#9B8DFF' : '#6B5CE7', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: savingProfile ? 'default' : 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              {savingProfile ? '...' : (locale === 'ru' ? 'Сохранить' : 'Save')}
            </button>

            {avatarUrl && (
                <button onClick={() => setAvatarUrl(null)} style={{ background: 'transparent', border: '1px solid hsl(var(--border))', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'hsl(var(--muted-foreground))', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>✕</button>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'hsl(var(--muted))', borderRadius: 10, padding: 4 }}>
            <button onClick={() => setActiveTab('stats')} style={tabStyle(activeTab === 'stats')}>
              📊 {locale === 'ru' ? 'Статистика' : 'Statistics'}
              {isPro && <span style={{ marginLeft: 6, fontSize: 10, background: 'linear-gradient(135deg,#6B5CE7,#9B8DFF)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontWeight: 700 }}>PRO</span>}
            </button>
            <button onClick={() => setActiveTab('achievements')} style={tabStyle(activeTab === 'achievements')}>
              🏆 {t('achievements')} · {achievements.filter(a => a.earned).length}/{achievements.length}
            </button>
          </div>

          {/* ACHIEVEMENTS TAB */}
          {activeTab === 'achievements' && (
              <ProfileAchievements
                  achievements={achievements}
              />
          )}

          {/* STATS TAB */}
          {activeTab === 'stats' && (
              <ProfileStatsTab
                  locale={locale}
                  isPro={isPro}
                  examStats={examStats}
                  diffStats={diffStats}
                  weakTopics={weakTopics}
                  strongTopics={strongTopics}
              />
          )}
        </main>
      </div>
  );
}
