// ============================================================
// ScrapeAI — Shared TypeScript Types
// ============================================================

export type Plan = 'free' | 'starter' | 'pro' | 'business'
export type ProjectStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type TaskType = 'google_maps' | 'web_scrape' | 'email_extraction' | 'marketplace' | 'directory'

// ── Database Models ──────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  plan: Plan
  credits_used: number
  credits_limit: number
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string | null
  subscription_end_date: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  title: string
  query: string
  status: ProjectStatus
  task_type: TaskType | null
  sources: string[]
  config: ScrapingConfig
  rows_count: number
  error_msg: string | null
  apify_run_id: string | null
  progress: number
  created_at: string
  updated_at: string
}

export interface Result {
  id: string
  project_id: string
  name: string | null
  website: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string | null
  category: string | null
  rating: number | null
  reviews: number | null
  price_range: string | null
  description: string | null
  linkedin: string | null
  twitter: string | null
  funding: string | null
  founded: string | null
  employees: string | null
  extra: Record<string, unknown>
  source_url: string | null
  created_at: string
}

// ── AI Task Interpretation ───────────────────────────────────

export interface ScrapingTask {
  title: string
  task_type: TaskType
  description: string
  location?: string
  country?: string
  keywords: string[]
  target_count: number
  sources: string[]
  config: ScrapingConfig
  output_fields: string[]
}

export interface ScrapingConfig {
  location?: string
  country?: string
  language?: string
  max_results?: number
  search_queries?: string[]
  urls?: string[]
  extract_emails?: boolean
  extract_phones?: boolean
  include_socials?: boolean
  category?: string
  filters?: Record<string, string>
}

// ── API Request / Response ───────────────────────────────────

export interface ScrapeRequest {
  query: string
  project_id?: string
}

export interface ScrapeResponse {
  project_id: string
  task: ScrapingTask
  status: ProjectStatus
  message: string
}

export interface ExportRequest {
  project_id: string
  format: 'csv' | 'json' | 'xlsx'
  fields?: string[]
}

// ── Pricing Plans ────────────────────────────────────────────

export interface PricingPlan {
  id: Plan
  name: string
  price: number
  currency: string
  interval: string
  rows_per_month: number
  features: string[]
  stripe_price_id: string
  popular?: boolean
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: '€',
    interval: 'month',
    rows_per_month: 100,
    stripe_price_id: '',
    features: [
      '100 rows / month',
      'CSV & JSON export',
      '3 saved projects',
      'Community support',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    currency: '€',
    interval: 'month',
    rows_per_month: 1000,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '',
    features: [
      '1,000 rows / month',
      'CSV, JSON & Excel export',
      'Unlimited saved projects',
      'Email extraction',
      'Priority support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    currency: '€',
    interval: 'month',
    rows_per_month: 5000,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
    popular: true,
    features: [
      '5,000 rows / month',
      'All export formats',
      'Scheduled scraping',
      'API access (coming soon)',
      'Advanced deduplication',
      'Priority support',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 199,
    currency: '€',
    interval: 'month',
    rows_per_month: 20000,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID || '',
    features: [
      '20,000 rows / month',
      'All Pro features',
      'Competitor monitoring',
      'Workflow automation',
      'Dedicated support',
      'Custom integrations',
    ],
  },
]

export const PLAN_LIMITS: Record<Plan, number> = {
  free: 100,
  starter: 1000,
  pro: 5000,
  business: 20000,
}

// ── UI Types ─────────────────────────────────────────────────

export interface TableColumn {
  key: keyof Result | string
  label: string
  visible: boolean
  width?: number
}

export interface DashboardStats {
  total_projects: number
  total_rows: number
  credits_used: number
  credits_limit: number
  recent_projects: Project[]
}
