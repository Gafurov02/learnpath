export type League = {
    name: string;
    minXp: number;
    color: string;
    icon: string;
};

export const LEAGUES: League[] = [
    {
        name: 'Bronze',
        minXp: 0,
        color: '#A97142',
        icon: '🥉',
    },
    {
        name: 'Silver',
        minXp: 500,
        color: '#B8C0CC',
        icon: '🥈',
    },
    {
        name: 'Gold',
        minXp: 1500,
        color: '#F4B942',
        icon: '🥇',
    },
    {
        name: 'Platinum',
        minXp: 3500,
        color: '#57D6C1',
        icon: '💎',
    },
    {
        name: 'Diamond',
        minXp: 7000,
        color: '#6B5CE7',
        icon: '👑',
    },
    {
        name: 'Master',
        minXp: 12000,
        color: '#FF4D9D',
        icon: '🔥',
    },
];

export function getLeagueByXp(xp: number) {
    let league = LEAGUES[0];

    for (const l of LEAGUES) {
        if (xp >= l.minXp) {
            league = l;
        }
    }

    return league;
}