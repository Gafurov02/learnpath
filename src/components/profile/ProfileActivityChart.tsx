'use client';

import {
    AreaChart,
    Area,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';

type Props = {
    data: {
        date: string;
        count: number;
    }[];
};

export function ProfileActivityChart({
                                         data,
                                     }: Props) {
    return (
        <div
            style={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 24,
                padding: 24,
                height: 260,
            }}
        >
            <div
                style={{
                    fontSize: 15,
                    fontWeight: 600,
                    marginBottom: 18,
                }}
            >
                📈 Weekly Activity
            </div>

            <ResponsiveContainer
                width="100%"
                height={170}
            >
                <AreaChart data={data}>
                    <Tooltip />

                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#6B5CE7"
                        fill="#6B5CE7"
                        fillOpacity={0.15}
                        strokeWidth={3}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}