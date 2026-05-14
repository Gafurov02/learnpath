# LearnPath — AI Exam Prep Platform

An AI-powered exam preparation platform with personalized learning paths, gamification, and school management features.

## Tech Stack

- **Framework**: Next.js 16.2.1 with App Router
- **UI**: React 19, Tailwind CSS v4, Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Payments**: Stripe
- **Crypto**: Crypto Pay, TON Connect
- **AI**: Anthropic Claude API
- **i18n**: next-intl (English, Russian)

## Getting Started

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env.local
```
Edit `.env.local` and add your credentials:
- Supabase URL and keys
- Anthropic API key
- Stripe keys
- Crypto Pay token
- TON API keys

3. **Set up Supabase database**:
Run the SQL files in order in Supabase SQL Editor:
- `supabase_schema.sql`
- `supabase_subscriptions.sql`
- `supabase_schools.sql`
- `supabase_levels.sql`
- `supabase_achievements.sql`
- `supabase_limits.sql`
- `supabase_api_keys.sql`
- `user_streaks.sql`
- Apply patch files as needed

4. **Run development server**:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run test` - Run tests

## Project Structure

- `src/app/[locale]/` - Localized pages (en, ru)
- `src/components/` - Reusable UI components
- `src/lib/` - Utility functions and Supabase clients
- `src/hooks/` - Custom React hooks
- `src/messages/` - i18n translation files
- `src/app/api/` - API routes

## Features

- **AI-powered quiz generation** using Claude API
- **Personalized study plans** based on user performance
- **Gamification** with XP, levels, achievements, and streaks
- **School management** for teachers to create custom questions and track students
- **Competition leaderboards** for school groups
- **Multi-language support** (English, Russian)
- **Subscription tiers** with Stripe integration
- **Crypto payments** via Crypto Pay and TON

## Deployment

Deploy on Vercel:
```bash
vercel deploy
```

Ensure all environment variables are configured in Vercel project settings.
