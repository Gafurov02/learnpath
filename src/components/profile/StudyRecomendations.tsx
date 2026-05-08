'use client';

type WeakTopic = {
    topic: string;
    exam: string;
    accuracy: number;
};

export function StudyRecommendations({
                                         weakTopics,
                                         streak,
                                         accuracy,
                                     }: {
    weakTopics: WeakTopic[];
    streak: number;
    accuracy: number;
}) {
    const recommendations: string[] = [];

    if (accuracy < 50) {
        recommendations.push(
            'Your overall accuracy is low. Focus on fundamentals before harder questions.'
        );
    }

    if (streak === 0) {
        recommendations.push(
            'Start a daily streak to improve long-term memory retention.'
        );
    }

    if (streak >= 7) {
        recommendations.push(
            'Amazing consistency. You are building strong learning habits.'
        );
    }

    weakTopics.slice(0, 3).forEach((topic) => {
        recommendations.push(
            `Practice ${topic.topic} in ${topic.exam} — current accuracy is ${topic.accuracy}%.`
        );
    });

    if (recommendations.length === 0) {
        recommendations.push(
            'You are doing great. Continue practicing to maintain your progress.'
        );
    }

    return (
        <div
            style={{
                background:
                    'linear-gradient(135deg,#18122B,#2E1F63)',
                borderRadius: 24,
                padding: 24,
                color: '#fff',
                border:
                    '1px solid rgba(255,255,255,0.08)',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 18,
                }}
            >
                <div
                    style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        background:
                            'rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                    }}
                >
                    🧠
                </div>

                <div>
                    <div
                        style={{
                            fontSize: 16,
                            fontWeight: 700,
                        }}
                    >
                        AI Study Coach
                    </div>

                    <div
                        style={{
                            fontSize: 12,
                            opacity: 0.7,
                        }}
                    >
                        Personalized recommendations
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                }}
            >
                {recommendations.map((rec, index) => (
                    <div
                        key={index}
                        style={{
                            background:
                                'rgba(255,255,255,0.06)',
                            borderRadius: 16,
                            padding: '14px 16px',
                            fontSize: 13,
                            lineHeight: 1.6,
                        }}
                    >
                        {rec}
                    </div>
                ))}
            </div>
        </div>
    );
}