// ============================================================
// Rate Limiting & Credits Management
// ============================================================
import { createAdminClient } from './supabase'
import type { Plan } from '@/types'

const PLAN_LIMITS: Record<Plan, number> = {
  free: 100,
  starter: 1000,
  pro: 5000,
  business: 20000,
}

// In-memory rate limiter (replace with Redis in production)
const requestCounts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour
  const maxRequests = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_HOUR || '10')

  const record = requestCounts.get(userId)

  if (!record || now > record.resetAt) {
    requestCounts.set(userId, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: maxRequests - record.count }
}

export async function checkCredits(
  userId: string,
  requested: number
): Promise<{ allowed: boolean; available: number; plan: Plan }> {
  const supabase = createAdminClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('plan, credits_used, credits_limit')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return { allowed: false, available: 0, plan: 'free' }
  }

  const available = profile.credits_limit - profile.credits_used
  return {
    allowed: available >= requested,
    available,
    plan: profile.plan as Plan,
  }
}

export async function deductCredits(userId: string, amount: number): Promise<void> {
  const supabase = createAdminClient()
  await supabase.rpc('increment_credits_used', { user_id: userId, amount })
}

export function getMaxRowsForPlan(plan: Plan): number {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free
}

// Reset monthly credits (call from a cron job)
export async function resetMonthlyCredits(): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from('profiles')
    .update({ credits_used: 0 })
    .lt('subscription_end_date', new Date().toISOString())
}

// Clean and deduplicate results
export function deduplicateResults<T extends { email?: string | null; name?: string | null; website?: string | null }>(
  results: T[]
): T[] {
  const seen = new Set<string>()
  return results.filter(item => {
    const key = [
      item.email?.toLowerCase().trim(),
      item.name?.toLowerCase().trim(),
      item.website?.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''),
    ]
      .filter(Boolean)
      .join('|')

    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Normalize a single result
export function normalizeResult(item: Record<string, unknown>): Record<string, unknown> {
  return {
    ...item,
    email: normalizeEmail(item.email as string),
    phone: normalizePhone(item.phone as string),
    website: normalizeUrl(item.website as string),
    name: (item.name as string)?.trim() || null,
  }
}

function normalizeEmail(email?: string): string | null {
  if (!email) return null
  const cleaned = email.toLowerCase().trim()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(cleaned) ? cleaned : null
}

function normalizePhone(phone?: string): string | null {
  if (!phone) return null
  const digits = phone.replace(/[^\d+]/g, '')
  return digits.length >= 7 ? phone.trim() : null
}

function normalizeUrl(url?: string): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed.startsWith('http')) return `https://${trimmed}`
  return trimmed
}
