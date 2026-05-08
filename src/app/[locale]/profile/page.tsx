'use client';

import { useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { createClient } from '@/lib/supabase';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { UserAvatar } from '@/components/ui/UserAvatar';

import { getLevelByXp, LEVELS } from '@/lib/levels';
import { getLeagueByXp } from '@/lib/league';
import { hasProAccess } from '@/lib/subscription';

import {
  getUserAvatarUrl,
  getUserDisplayName,
} from '@/lib/user-profile';

import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileOverview } from '@/components/profile/ProfileOverview';
import { ProfileActivityChart } from '@/components/profile/ProfileActivityChart';
import { ProfileAchievements } from '@/components/profile/ProfileAchievements';
import { ProfilePageSkeleton } from '@/components/profile/ProfilePageSkeleton';
import { StudyRecommendations } from '@/components/profile/StudyRecomendations';
import { DailyQuests } from '@/components/profile/DailyQuests';
import { LeagueCard } from '@/components/profile/LeagueCard';

type Achievement = {
  code: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earned_at?: string;
};

type Attempt = {
  exam: string;
  topic: string;
  correct: boolean;
  difficulty: string;
  created_at: string;
};

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

        context.drawImage(
            image,
            offsetX,
            offsetY,
            smallestSide,
            smallestSide,
            0,
            0,
            size,
            size
        );

        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };

      image.onerror = () =>
          reject(new Error('Could not read the selected image'));

      image.src =
          typeof reader.result === 'string' ? reader.result : '';
    };

    reader.onerror = () =>
        reject(new Error('Could not read the selected file'));

    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const locale = useLocale();
  const router = useRouter();

  const [user, setUser] = useState<SupabaseUser | null>(null);

  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const [loading, setLoading] = useState(true);

  const [isPro, setIsPro] = useState(false);

  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      const u = session.user;

      setUser(u);

      setNickname(getUserDisplayName(u));
      setAvatarUrl(getUserAvatarUrl(u));

      const [
        subRes,
        attemptsRes,
        achRes,
        allAchRes,
      ] = await Promise.all([
        supabase
            .from('subscriptions')
            .select('xp, plan, status')
            .eq('user_id', u.id)
            .single(),

        supabase
            .from('quiz_attempts')
            .select(
                'exam, topic, correct, difficulty, created_at'
            )
            .eq('user_id', u.id)
            .order('created_at', { ascending: false })
            .limit(500),

        supabase
            .from('user_achievements')
            .select('achievement, earned_at')
            .eq('user_id', u.id),

        supabase.from('achievements').select('*'),
      ]);

      setXp(subRes.data?.xp ?? 0);

      setIsPro(hasProAccess(subRes.data));

      setAttempts(attemptsRes.data ?? []);

      const dates = [
        ...new Set(
            (attemptsRes.data ?? []).map((a: any) =>
                new Date(a.created_at).toDateString()
            )
        ),
      ];

      let s = 0;

      const today = new Date();

      for (let i = 0; i < dates.length; i++) {
        const d = new Date(today);

        d.setDate(d.getDate() - i);

        if (dates.includes(d.toDateString())) {
          s++;
        } else {
          break;
        }
      }

      setStreak(s);

      const earnedMap = new Map(
          (achRes.data ?? []).map((a: any) => [
            a.achievement,
            a.earned_at,
          ])
      );

      setAchievements(
          (allAchRes.data ?? []).map((a: any) => ({
            code: a.code,
            name: a.name,
            description: a.description,
            icon: a.icon,
            earned: earnedMap.has(a.code),
            earned_at: earnedMap.get(a.code),
          }))
      );

      setLoading(false);
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    window.location.href = `/${locale}`;
  }

  async function handleAvatarFileChange(
      event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const resizedAvatar = await resizeAvatarFile(file);

      setAvatarUrl(resizedAvatar);
    } finally {
      event.target.value = '';
    }
  }

  async function handleSaveProfile() {
    const trimmedNickname = nickname.trim();

    if (!trimmedNickname || !user) return;

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

      if (error) throw error;

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
      toast.error(
          error instanceof Error
              ? error.message
              : locale === 'ru'
                  ? 'Не удалось обновить профиль'
                  : 'Could not update the profile'
      );
    } finally {
      setSavingProfile(false);
    }
  }

  if (loading) {
    return (
        <div
            style={{
              minHeight: '100vh',
              background: 'hsl(var(--background))',
            }}
        >
          <AppNavbar />
          <ProfilePageSkeleton />
        </div>
    );
  }

  const level = getLevelByXp(xp);

  const league = getLeagueByXp(xp);

  const nextLevel =
      LEVELS[
      LEVELS.findIndex((l) => l.name === level.name) + 1
          ];

  const progress = nextLevel
      ? Math.round(
          ((xp - level.minXp) /
              (nextLevel.minXp - level.minXp)) *
          100
      )
      : 100;

  const name = getUserDisplayName(user);

  const total = attempts.length;

  const correct = attempts.filter((a) => a.correct).length;

  const accuracy =
      total > 0 ? Math.round((correct / total) * 100) : 0;

  const dailyQuests = [
    {
      title: 'Solve 20 questions',
      progress: total,
      target: 20,
      reward: 120,
    },
    {
      title: 'Reach 80% accuracy',
      progress: accuracy,
      target: 80,
      reward: 200,
    },
    {
      title: 'Maintain streak',
      progress: streak,
      target: 7,
      reward: 250,
    },
  ];

  const topicStats: Record<
      string,
      {
        total: number;
        correct: number;
        exam: string;
      }
  > = {};

  attempts.forEach((a) => {
    const key = `${a.exam}::${a.topic}`;

    if (!topicStats[key]) {
      topicStats[key] = {
        total: 0,
        correct: 0,
        exam: a.exam,
      };
    }

    topicStats[key].total++;

    if (a.correct) topicStats[key].correct++;
  });

  const weakTopics = Object.entries(topicStats)
      .map(([key, s]) => ({
        topic: key.split('::')[1],
        exam: s.exam,
        accuracy: Math.round(
            (s.correct / s.total) * 100
        ),
        total: s.total,
      }))
      .filter((t) => t.total >= 3)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

  const last7: { date: string; count: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();

    d.setDate(d.getDate() - i);

    const dateStr = d.toDateString();

    const count = attempts.filter(
        (a) =>
            new Date(a.created_at).toDateString() ===
            dateStr
    ).length;

    last7.push({
      date: d.toLocaleDateString(
          locale === 'ru' ? 'ru-RU' : 'en-US',
          { weekday: 'short' }
      ),
      count,
    });
  }

  const glassCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    borderRadius: 28,
    boxShadow: '0 10px 40px rgba(0,0,0,0.24)',
  };

  return (
      <div
          style={{
            minHeight: '100vh',
            background: `
          radial-gradient(circle at top left, rgba(120,119,198,0.18), transparent 28%),
          radial-gradient(circle at bottom right, rgba(91,141,239,0.16), transparent 30%),
          hsl(var(--background))
        `,
            color: 'hsl(var(--foreground))',
            position: 'relative',
            overflow: 'hidden',
          }}
      >
        <AppNavbar />

        <main
            style={{
              position: 'relative',
              maxWidth: 1320,
              margin: '0 auto',
              padding: window.innerWidth < 768
                ? '20px 14px 120px'
                : '40px 24px 120px',
              display: 'flex',
              flexDirection: 'column',
              gap: 28,
              zIndex: 2,
            }}
        >
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

          {/* ACCOUNT */}
          <div
              style={{
                ...glassCard,
                padding: 24,
                display: 'flex',
                flexDirection:
                  window.innerWidth < 768 ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems:
                  window.innerWidth < 768 ? 'stretch' : 'center',
                gap: 20,
                flexWrap: 'wrap',
              }}
          >
            <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
            >
              <label
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                  }}
              >
                <UserAvatar
                    avatarUrl={avatarUrl}
                    email={user?.email}
                    name={nickname.trim() || name}
                    id={user?.id}
                    size={62}
                    accent={isPro ? 'pro' : 'default'}
                />

                <div
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#6B5CE7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      color: '#fff',
                      border:
                          '2px solid rgba(15,15,20,1)',
                    }}
                >
                  ✎
                </div>

                <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    style={{ display: 'none', boxSizing: 'border-box' }}
                />
              </label>

              <div>
                <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                >
                  {locale === 'ru'
                      ? 'Настройки аккаунта'
                      : 'Account Settings'}
                </div>

                <div
                    style={{
                      fontSize: 13,
                      color:
                          'hsl(var(--muted-foreground))',
                    }}
                >
                  {locale === 'ru'
                      ? 'Управление профилем'
                      : 'Manage your profile'}
                </div>
              </div>
            </div>

            <div
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
            >
              <input
                  value={nickname}
                  onChange={(e) =>
                      setNickname(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveProfile();
                    }
                  }}
                  placeholder={
                    locale === 'ru'
                        ? 'Никнейм'
                        : 'Nickname'
                  }
                  style={{
                    width:
                      window.innerWidth < 768
                        ? '100%'
                        : 220,
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--background))',
                    color: 'hsl(var(--foreground))',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                    boxShadow:
                        '0 2px 10px rgba(0,0,0,0.04)',
                  }}
              />

              <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  style={{
                    height: 44,
                    padding: '0 18px',
                    borderRadius: 14,
                    border: 'none',
                    background: '#6B5CE7',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flex: window.innerWidth < 768 ? 1 : undefined,
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}
              >
                {savingProfile
                    ? '...'
                    : locale === 'ru'
                        ? 'Сохранить'
                        : 'Save'}
              </button>

              <button
                  onClick={handleLogout}
                  style={{
                    height: 44,
                    padding: '0 18px',
                    borderRadius: 14,
                    border:
                        '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#ff8080',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flex: window.innerWidth < 768 ? 1 : undefined,
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}
              >
                {locale === 'ru'
                    ? 'Выйти'
                    : 'Logout'}
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                    window.innerWidth < 1024
                        ? '1fr'
                        : 'minmax(0,1fr) 340px',
                gap: 24,
                alignItems: 'start',
              }}
          >
            {/* LEFT */}
            <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 24,
                }}
            >
              <ProfileOverview
                  xp={xp}
                  streak={streak}
                  accuracy={accuracy}
                  plan={isPro ? 'pro' : 'free'}
              />

              <LeagueCard
                  name={league.name}
                  icon={league.icon}
                  color={league.color}
                  xp={xp}
              />

              <ProfileActivityChart data={last7} />

              <div
                  style={{
                    ...glassCard,
                    padding: 18,
                  }}
              >
                <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      marginBottom: 18,
                    }}
                >
                  🏆{' '}
                  {locale === 'ru'
                      ? 'Достижения'
                      : 'Achievements'}
                </div>

                <div
                    style={{
                      maxHeight:
                        window.innerWidth < 768
                            ? 'unset'
                            : 620,
                      overflowY: 'auto',
                      paddingRight: 4,
                    }}
                >
                  <ProfileAchievements
                      achievements={achievements}
                  />
                </div>
              </div>

              <StudyRecommendations
                  weakTopics={weakTopics}
                  streak={streak}
                  accuracy={accuracy}
              />
            </div>

            {/* RIGHT */}
            <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 24,
                  position:
                    window.innerWidth < 1024
                        ? 'relative'
                        : 'sticky',
                  top:
                    window.innerWidth < 1024
                        ? undefined
                        : 100,
                }}
            >
              <DailyQuests quests={dailyQuests} />
            </div>
          </div>
        </main>
      </div>
  );
}