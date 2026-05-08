'use client';

import { Flame, Trophy, Target, Crown } from 'lucide-react';
import { ProfileStatsCard } from './ProfileStatsCard';

type Props = {
    xp: number;
    streak: number;
    accuracy: number;
    plan: string;
};

export function ProfileOverview({
                                    xp,
                                    streak,
                                    accuracy,
                                    plan,
                                }: Props) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns:
                    'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
            }}
        >
            <ProfileStatsCard
                label="Total XP"
                value={xp.toLocaleString()}
                hint="Keep practicing to level up"
                color="#6B5CE7"
                icon={<Trophy size={18} />}
            />

            <ProfileStatsCard
                label="Current Streak"
                value={`${streak} days`}
                hint="Consistency beats motivation"
                color="#EF9F27"
                icon={<Flame size={18} />}
            />

            <ProfileStatsCard
                label="Accuracy"
                value={`${accuracy}%`}
                hint="Correct answer ratio"
                color="#22C07A"
                icon={<Target size={18} />}
            />

            <ProfileStatsCard
                label="Subscription"
                value={plan.toUpperCase()}
                hint="Current active plan"
                color="#378ADD"
                icon={<Crown size={18} />}
            />
        </div>
    );
}