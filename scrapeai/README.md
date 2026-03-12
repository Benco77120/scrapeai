# ScrapeAI — Deployment Guide

## Overview

ScrapeAI is a full-stack Next.js 14 SaaS application for AI-powered data collection. This guide covers everything from local dev to production deployment.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TailwindCSS |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| AI | OpenAI GPT-4o |
| Scraping | Apify (Google Maps, Web Scraper actors) |
| Payments | Stripe (subscriptions + webhooks) |
| Deployment | Vercel (recommended) |

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/your-org/scrapeai.git
cd scrapeai
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your Project URL and anon key from Settings → API
3. Run the schema:
   - Open Supabase SQL Editor
   - Paste and run: `supabase/migrations/001_initial_schema.sql`

Or using Supabase CLI:
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### 3. Set up OpenAI

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key under API Keys
3. Recommended model: `gpt-4o`

### 4. Set up Apify

1. Register at [apify.com](https://apify.com)
2. Go to Settings → Integrations → API tokens
3. Create a new token
4. Key actors used:
   - `compass/crawler-google-places` — Google Maps scraping
   - `apify/web-scraper` — Generic website scraping

> **Note:** Without an Apify token, the app runs in **demo mode** with mock data. This is great for development.

### 5. Set up Stripe

1. Create account at [stripe.com](https://stripe.com)
2. Go to Products → Create products for each plan:
   - Starter: €29/month recurring
   - Pro: €79/month recurring
   - Business: €199/month recurring
3. Copy the Price IDs (start with `price_...`)
4. For webhooks (local dev): Install Stripe CLI
   ```bash
   brew install stripe/stripe-cli/stripe
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

### 6. Configure environment variables

```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

### 7. Run development server

```bash
npm run dev
# Open http://localhost:3000
```

---

## Production Deployment (Vercel)

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial ScrapeAI"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Add all environment variables from `.env.example`
4. Deploy

### 3. Configure Stripe webhook (production)

1. Go to Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://your-app.vercel.app/api/stripe/webhook`
3. Events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the webhook signing secret → add to `STRIPE_WEBHOOK_SECRET`

### 4. Configure Supabase for production

1. Update your Supabase project settings:
   - Authentication → URL Configuration → Add your production URL
   - Add `https://your-app.vercel.app` to allowed redirect URLs

### 5. Set up monthly credit reset

Create a Vercel Cron Job or use a service like Upstash to call your reset endpoint:

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/reset-credits",
    "schedule": "0 0 1 * *"
  }]
}
```

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── pricing/page.tsx            # Pricing
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx              # Sidebar layout
│   │   ├── page.tsx                # Dashboard home
│   │   ├── search/page.tsx         # New search
│   │   ├── projects/page.tsx       # All projects
│   │   ├── results/[id]/page.tsx   # Results viewer
│   │   └── billing/page.tsx        # Billing
│   └── api/
│       ├── scrape/route.ts         # Start scraping
│       ├── projects/route.ts       # CRUD projects
│       ├── projects/[id]/route.ts  # Single project
│       ├── export/route.ts         # Export data
│       └── stripe/
│           ├── checkout/route.ts
│           └── webhook/route.ts
├── lib/
│   ├── supabase.ts                 # Supabase clients
│   ├── ai.ts                       # OpenAI integration
│   ├── apify.ts                    # Apify scraping
│   ├── stripe.ts                   # Stripe billing
│   ├── credits.ts                  # Rate limiting & credits
│   └── utils.ts                    # Utilities + export helpers
├── types/index.ts                  # TypeScript types
└── middleware.ts                   # Auth protection
supabase/
└── migrations/
    └── 001_initial_schema.sql      # Full DB schema
```

---

## Data Flow

1. **User types prompt** → `POST /api/scrape`
2. **AI interprets** → `openai/gpt-4o` returns structured `ScrapingTask`
3. **Project created** in Supabase with `status: 'running'`
4. **Background scraping** starts (Apify actor launched)
5. **Results inserted** into `results` table as they arrive
6. **Frontend polls** `/api/projects/[id]` every 3 seconds
7. **User exports** → `/api/export` returns CSV/JSON/Excel

---

## Security Checklist

- [x] All API routes check `auth.getUser()` before proceeding
- [x] Row Level Security (RLS) on all Supabase tables
- [x] Users can only access their own projects/results
- [x] API keys stored in environment variables only
- [x] Rate limiting: 10 requests/hour per user (in-memory, upgrade to Redis for prod)
- [x] Stripe webhook signature verification
- [x] SQL injection impossible (Supabase query builder)
- [x] CORS handled by Next.js/Vercel

---

## Extending the Platform

### Adding LinkedIn scraping

```typescript
// In src/lib/apify.ts, add to ACTORS:
linkedin: 'curious_coder/linkedin-profile-scraper',

// In interpretScrapeRequest prompt, add task_type:
// "linkedin": LinkedIn profiles and company pages
```

### Adding scheduled scraping

1. Create `scheduled_at` column in `projects` table
2. Set up Vercel Cron at `/api/cron/run-scheduled`
3. Store cron expression in `projects.config.schedule`

### Adding API access

1. Create `api_keys` table in Supabase
2. Add `/api/v1/scrape` endpoint that authenticates via `X-API-Key` header
3. Apply rate limiting based on plan

---

## Support

- Issues: GitHub Issues
- Email: support@scrapeai.io
- Docs: docs.scrapeai.io
