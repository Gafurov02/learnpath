import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const isRu = locale === 'ru';

    const s: React.CSSProperties = { marginBottom: 32 };
    const h2: React.CSSProperties = { fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 22, fontWeight: 400, marginBottom: 12, color: 'hsl(var(--foreground))' };
    const p: React.CSSProperties = { fontSize: 15, color: 'hsl(var(--muted-foreground))', lineHeight: 1.75, marginBottom: 10 };
    const li: React.CSSProperties = { fontSize: 15, color: 'hsl(var(--muted-foreground))', lineHeight: 1.75, marginBottom: 6 };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
            <Navbar />
            <main style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px 80px' }}>
                <Link href={`/${locale}`} style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textDecoration: 'none', display: 'block', marginBottom: 32 }}>← {isRu ? 'На главную' : 'Back to home'}</Link>

                <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 42, fontWeight: 400, letterSpacing: '-1.5px', marginBottom: 12, color: 'hsl(var(--foreground))' }}>
                    {isRu ? 'Политика конфиденциальности' : 'Privacy Policy'}
                </h1>
                <p style={{ ...p, marginBottom: 48 }}>
                    {isRu ? 'Дата вступления в силу: 1 апреля 2025 г.' : 'Effective date: April 1, 2025'}
                </p>

                <div style={s}>
                    <h2 style={h2}>{isRu ? '1. Какие данные мы собираем' : '1. Data We Collect'}</h2>
                    <p style={p}>{isRu ? 'При использовании LearnPath мы собираем:' : 'When you use LearnPath, we collect:'}</p>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                        {(isRu ? [
                            'Email и имя при регистрации',
                            'Ответы на вопросы и прогресс обучения',
                            'Данные об устройстве и браузере (для аналитики)',
                            'Платёжные данные (через Stripe — мы не храним номера карт)',
                        ] : [
                            'Email and name upon registration',
                            'Quiz answers and learning progress',
                            'Device and browser data (for analytics)',
                            'Payment data (via Stripe — we do not store card numbers)',
                        ]).map(item => <li key={item} style={li}>{item}</li>)}
                    </ul>
                </div>

                <div style={s}>
                    <h2 style={h2}>{isRu ? '2. Как мы используем данные' : '2. How We Use Your Data'}</h2>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                        {(isRu ? [
                            'Персонализация учебного плана и рекомендаций',
                            'Отслеживание прогресса и выдача достижений',
                            'Обработка платежей и управление подпиской',
                            'Улучшение качества AI-объяснений',
                            'Связь с вами по важным вопросам сервиса',
                        ] : [
                            'Personalizing study plans and recommendations',
                            'Tracking progress and awarding achievements',
                            'Processing payments and managing subscriptions',
                            'Improving AI explanation quality',
                            'Communicating important service updates',
                        ]).map(item => <li key={item} style={li}>{item}</li>)}
                    </ul>
                </div>

                <div style={s}>
                    <h2 style={h2}>{isRu ? '3. Хранение данных' : '3. Data Storage'}</h2>
                    <p style={p}>{isRu ? 'Ваши данные хранятся в Supabase (PostgreSQL) на серверах в ЕС. Платёжные данные обрабатываются Stripe и не хранятся на наших серверах.' : 'Your data is stored in Supabase (PostgreSQL) on EU servers. Payment data is processed by Stripe and not stored on our servers.'}</p>
                </div>

                <div style={s}>
                    <h2 style={h2}>{isRu ? '4. Передача данных третьим лицам' : '4. Third-Party Sharing'}</h2>
                    <p style={p}>{isRu ? 'Мы не продаём ваши данные. Мы используем следующих провайдеров:' : 'We do not sell your data. We use the following providers:'}</p>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                        {[
                            isRu ? 'Supabase — база данных и аутентификация' : 'Supabase — database and authentication',
                            isRu ? 'Stripe — обработка платежей' : 'Stripe — payment processing',
                            isRu ? 'Anthropic Claude API — генерация вопросов и объяснений' : 'Anthropic Claude API — question and explanation generation',
                            isRu ? 'Vercel — хостинг' : 'Vercel — hosting',
                        ].map(item => <li key={item} style={li}>{item}</li>)}
                    </ul>
                </div>

                <div style={s}>
                    <h2 style={h2}>{isRu ? '5. Ваши права' : '5. Your Rights'}</h2>
                    <p style={p}>{isRu ? 'Вы вправе:' : 'You have the right to:'}</p>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                        {(isRu ? [
                            'Запросить копию своих данных',
                            'Исправить неточные данные',
                            'Удалить свой аккаунт и все данные',
                            'Отозвать согласие на обработку',
                        ] : [
                            'Request a copy of your data',
                            'Correct inaccurate data',
                            'Delete your account and all data',
                            'Withdraw consent for processing',
                        ]).map(item => <li key={item} style={li}>{item}</li>)}
                    </ul>
                    <p style={{ ...p, marginTop: 12 }}>
                        {isRu ? 'Для удаления аккаунта напишите нам: ' : 'To delete your account, contact us: '}
                        <a href="mailto:boburbek@gafurov.cc" style={{ color: '#6B5CE7', textDecoration: 'none' }}>boburbek@gafurov.cc</a>
                    </p>
                </div>

                <div style={s}>
                    <h2 style={h2}>{isRu ? '6. Cookies' : '6. Cookies'}</h2>
                    <p style={p}>{isRu ? 'Мы используем только необходимые cookie для авторизации и сохранения настроек темы. Рекламные cookie не используются.' : 'We use only essential cookies for authentication and theme preferences. No advertising cookies are used.'}</p>
                </div>

                <div style={s}>
                    <h2 style={h2}>{isRu ? '7. Изменения политики' : '7. Policy Changes'}</h2>
                    <p style={p}>{isRu ? 'При существенных изменениях политики мы уведомим вас по email. Продолжение использования сервиса означает согласие с новой версией.' : 'For material changes, we will notify you by email. Continued use of the service constitutes acceptance of the updated policy.'}</p>
                </div>

                <div style={s}>
                    <h2 style={h2}>{isRu ? '8. Контакты' : '8. Contact'}</h2>
                    <p style={p}>
                        {isRu ? 'По вопросам конфиденциальности: ' : 'For privacy questions: '}
                        <a href="mailto:boburbek@gafurov.cc" style={{ color: '#6B5CE7', textDecoration: 'none' }}>boburbek@gafurov.cc</a>
                    </p>
                </div>
            </main>
        </div>
    );
}