# Playbook AI

A trading journal and playbook management platform that helps traders improve discipline, track performance, and build better habits — powered by AI-assisted analysis.

> **Educational tool only.** Playbook AI does not provide investment advice, trading signals, or financial recommendations. All AI-generated content is for self-reflection and pattern recognition purposes only.

---

## Features

- **Playbook Builder** — Define your trading strategy with entry/exit rules, risk parameters, allowed sessions, and setup types. Version-controlled playbooks keep your edge documented.
- **Trade Journal** — Log every trade with a guided questionnaire: what you saw, your trigger, stop rationale, emotional state, and post-trade reflection.
- **CSV Import + Post-Import Review** — Upload trades from any broker export. A guided review wizard walks you through a sample of imported trades to improve setup classification.
- **Adherence Engine** — Every trade is scored against your active playbook. Instant feedback on which rules you followed and which you broke.
- **Dashboard & Charts** — Equity curve, adherence over time, P&L by setup, average R by hour, off-plan rate by day-of-week, and emotion-vs-outcome heatmap.
- **Daily Review** — End-of-day journaling with AI-generated summaries and improvement suggestions.
- **Setup Clusters** — AI groups similar trades into clusters and suggests setup type labels, helping you discover patterns in your trading.
- **Insight Snapshots** — Periodic behavioral insights: FOMO trade underperformance, best/worst sessions, streak patterns, risk violations.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Auth | NextAuth v5 (Auth.js) + Credentials provider |
| Database | PostgreSQL via Prisma ORM v7 |
| UI | Tailwind CSS v4 + Radix UI + shadcn/ui components |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| AI | Pluggable provider interface (mock included; swap in Claude API) |
| Storage | Pluggable provider interface (local filesystem included) |
| CSV parsing | PapaParse |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or hosted)

### 1. Clone and install

```bash
git clone <repo-url>
cd Playbook-AI
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/playbookai"

# NextAuth
NEXTAUTH_SECRET="your-secret-here"   # generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# Storage provider: "local" (default) or "s3"
STORAGE_PROVIDER="local"

# AI provider: "mock" (default) or "claude"
AI_PROVIDER="mock"

# Claude API (only needed if AI_PROVIDER=claude)
# ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. Set up the database

```bash
# Push schema to database
npm run db:push

# Seed with demo data
npm run db:seed
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo credentials:**
- Email: `demo@playbookai.app`
- Password: `password123`

### Smoke test
Run the seeded happy-path smoke test:

```bash
npm run test:smoke
```

The smoke test uses your local Chrome installation, starts the local Next.js app automatically if it is not already running, and verifies:
- login
- dashboard
- playbook
- strategy detail
- import center
- journal
- trade detail
- post-import review
- daily review

---

## Project Structure

```
Playbook-AI/
├── app/
│   ├── (auth)/              # Login, register pages
│   ├── (app)/               # Authenticated app shell
│   │   ├── dashboard/       # Main dashboard with charts
│   │   ├── journal/         # Trade journal + detail pages
│   │   ├── playbook/        # Strategy management
│   │   ├── import/          # CSV import + post-import review
│   │   ├── daily-review/    # Daily journaling
│   │   ├── onboarding/      # First-run wizard
│   │   └── settings/        # Profile, risk rules, notifications
│   └── api/                 # Route handlers (auth, upload, AI)
├── components/
│   ├── ui/                  # Base shadcn/ui primitives
│   ├── layout/              # Sidebar, TopBar, MobileNav
│   ├── shared/              # AdherenceBadge, EmotionSelect, etc.
│   ├── dashboard/           # Chart components
│   ├── journal/             # Trade table, detail panel, questionnaire
│   ├── playbook/            # PlaybookWizard, PlaybookCard, etc.
│   ├── import/              # CsvUploader, PostImportReviewWizard
│   ├── daily-review/        # DailyReviewForm
│   ├── onboarding/          # OnboardingWizard
│   └── settings/            # SettingsClient
├── lib/
│   ├── actions/             # Server actions (trade, strategy, import, etc.)
│   ├── ai/                  # AI provider interface + mock implementation
│   ├── storage/             # Storage provider interface + local implementation
│   ├── integrations/        # Broker + chart-data provider interfaces
│   ├── adherence-engine/    # Rule-based adherence scoring
│   ├── utils/               # Chart data transforms, trade metrics, formatters
│   └── validations/         # Zod schemas for all forms
├── types/
│   └── index.ts             # Domain types and enums
├── hooks/
│   └── use-toast.ts         # Global toast state
└── prisma/
    ├── schema.prisma        # Full database schema
    └── seed.ts              # Demo data seeder
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema changes to database (no migration history) |
| `npm run db:migrate` | Run database migrations (generates history) |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:studio` | Open Prisma Studio (database browser) |
| `npm run db:reset` | Reset database and re-seed |
| `npm run setup` | Full setup: install → generate → push → seed |

---

## AI Integration

The AI layer uses a pluggable provider pattern. The included `MockAIProvider` returns realistic responses without requiring an API key — useful for development and demos.

To connect Claude:

1. Set `AI_PROVIDER=claude` in your environment
2. Add `ANTHROPIC_API_KEY=sk-ant-...`
3. Implement `lib/ai/claude.provider.ts` extending the `AIProvider` interface

The interface covers:
- `analyzeStrategy(strategy)` → coaching notes on your playbook
- `analyzeTrade(trade, strategy)` → per-trade adherence analysis
- `analyzeTradeV2(trade, strategy)` → extended analysis with matched/broken rules
- `summarizeDailyReview(trades, review, strategy)` → end-of-day summary
- `generateInsights(trades, strategy)` → periodic behavioral insights
- `clusterSetups(trades)` → group similar trades into setup clusters

All AI outputs carry an educational disclaimer and are framed as pattern recognition, not trading advice.

---

## Storage

Local storage saves files to `public/uploads/` and serves them as static assets. For production, implement `lib/storage/s3.provider.ts` using the `StorageProvider` interface and set `STORAGE_PROVIDER=s3`.

---

## Disclaimer

Playbook AI is an educational journaling tool. It does not analyze market conditions, provide entry/exit signals, or offer investment advice of any kind. All analysis is purely retrospective, based on your own trade data, and intended for self-reflection and pattern recognition.

Past performance of your own trades does not guarantee future results.
