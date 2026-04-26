import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
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
                    {isRu ? 'Условия использования' : 'Terms of Service'}
                </h1>
                <p style={{ ...p, marginBottom: 48 }}>
                    {isRu ? 'Дата вступления в силу: 1 апреля 2025 г.' : 'Effective date: April 1, 2025'}
                </p>

                <div style={s}>
                    <h2 style={h2}>{isRu ? '1. Принятие условий' : '1. Acceptance of Terms'}</h2>
                    <p style={p}>{isRu ? 'Используя LearnPath, вы соглашаетесь с настоящими Условиями использования. Если вы не согласны — не используйте сервис.' : 'By accessing or using LearnPath, you agree to be bound by these Terms of Service. If you disagree, please do not use our service.'}</p>
                </div>

                <div style={s}>
                    <h2 style={h2}>{isRu ? '2. Описание сервиса' : '2. Description of Service'}</h2>
                    <p style={p}>{isRu ? 'LearnPath — это AI-платформа для подготовки к экзаменам. Мы предоставляем:' : 'LearnPath is an AI-powered exam preparation platform. We provide:'}</p>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                        {(isRu ? ['Адаптивные вопросы с AI-объяснениями', 'Персональный учебный план', 'Статистику прогресса', 'Групповые инструменты для школ и курсов'] : ['Adaptive questions with AI explanations', 'Personalized study plans', 'Progress statistics', 'Group tools for schools and courses']).map(item => (
                            <li key={item} style={li}>{item}</li>
                        ))}
                    </ul>
                </div>

                <div style={s}>
                    <h2 style={h2}>{isRu ? '3. Аккаунты пользователей' : '3. User Accounts'}</h2>
                    <p style={p}>{isRu ? 'Вы несёте ответственность за сохранность своего аккаунта и пароля. Сообщайте нам о любом несанкционированном использовании аккаунта.' : 'You are responsible for maintaining the security of your account and password. Please notify us of any unauthorized use of your account.'}</p>
                </div>

                <div style={s}>
                    <h2 style={h2}>{isRu ? '4. Платежи и подписка' : '4. Payments & Subscriptions'}</h2>
                    <p style={p}>{isRu ? 'Платная подписка Pro стоит $10 в месяц и продлевается автоматически. Вы можете отменить её в любой момент через портал управления подпиской. Возврат средств осуществляется в течение 7 дней с момента оплаты.' : 'The Pro subscription costs $10/month and renews automatically. You may cancel at any time via the customer portal. Refunds are available within 7 days of payment.'}</p>
                </div>

                <div style={s}>
                    <h2 style={h2}>{isRu ? '5. Запрещённое использование' : '5. Prohibited Use'}</h2>
                    <p style={p}>{isRu ? 'Вы не вправе:' : 'You may not:'}</p>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                        {(isRu ? ['Перепродавать или передавать доступ к сервису', 'Использовать автоматизированные инструменты для скрейпинга', 'Публиковать вредоносный контент в системе школ', 'Обходить технические ограничения сервиса'] : ['Resell or transfer access to the service', 'Use automated tools to scrape content', 'Post harmful content in the school system', 'Circumvent technical restrictions']).map(item => (
                            <li key={item} style={li}>{item}</li>
                        ))}
                    </ul>
                </div>

                <div style={s}>
                    <h2 style={h2}>{isRu ? '6. Интеллектуальная собственность' : '6. Intellectual Property'}</h2>
                    <p style={p}>{isRu ? 'Весь контент LearnPath, включая AI-сгенерированные вопросы, интерфейс и логотипы, является собственностью LearnPath. Пользовательский контент (вопросы, загруженные учителями) остаётся собственностью пользователя.' : 'All LearnPath content, including AI-generated questions, interface, and logos, is owned by LearnPath. User-generated content (questions uploaded by teachers) remains the property of the user.'}</p>
                </div>

                <div style={s}>
                    <h2 style={h2}>{isRu ? '7. Отказ от гарантий' : '7. Disclaimer of Warranties'}</h2>
                    <p style={p}>{isRu ? 'Сервис предоставляется "как есть". Мы не гарантируем определённые результаты на экзаменах. AI-объяснения могут содержать ошибки — используйте их как дополнение к официальным учебным материалам.' : 'The service is provided "as is". We do not guarantee specific exam results. AI explanations may contain errors — use them as a supplement to official study materials.'}</p>
                </div>

                <div style={s}>
                    <h2 style={h2}>{isRu ? '8. Контакты' : '8. Contact'}</h2>
                    <p style={p}>
                        {isRu ? 'По вопросам об условиях использования: ' : 'For questions about these Terms: '}
                        <a href="mailto:boburbek@gafurov.cc" style={{ color: '#6B5CE7', textDecoration: 'none' }}>boburbek@gafurov.cc</a>
                    </p>
                </div>
            </main>
        </div>
    );
}