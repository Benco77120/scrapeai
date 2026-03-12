'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { CreditCard, Zap, ExternalLink, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { PRICING_PLANS } from '@/types'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

export default function BillingPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => { setProfile(data); setLoading(false) })
    })
  }, [])

  async function openPortal() {
    setPortalLoading(true)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'portal' }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else toast.error('Could not open billing portal')
    setPortalLoading(false)
  }

  async function upgrade(priceId: string, planId: string) {
    setUpgrading(planId)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price_id: priceId }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else toast.error('Checkout failed')
    setUpgrading(null)
  }

  if (loading) return (
    <div className="p-6 space-y-3">
      {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
    </div>
  )

  const creditPct = profile ? (profile.credits_used / profile.credits_limit) * 100 : 0
  const currentPlan = PRICING_PLANS.find(p => p.id === profile?.plan)

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="font-display font-700 text-ink text-2xl">Billing</h1>
        <p className="text-ink-muted text-sm mt-1">Manage your subscription and credits</p>
      </div>

      {/* Current plan */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs font-mono text-ink-muted uppercase tracking-wider mb-1">Current plan</div>
            <div className="font-display font-700 text-2xl text-ink">{currentPlan?.name}</div>
            <div className="text-ink-muted text-sm mt-0.5">
              {currentPlan?.price === 0 ? 'Free forever' : `€${currentPlan?.price}/month`}
            </div>
          </div>
          <span className="badge bg-accent/10 text-accent border-accent/20 uppercase">
            {profile?.plan}
          </span>
        </div>

        {/* Credits */}
        <div className="bg-surface rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-muted">Monthly credits</span>
            <span className="font-display font-700 text-ink">
              {profile?.credits_used.toLocaleString()} / {profile?.credits_limit.toLocaleString()}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(creditPct, 100)}%`,
                background: creditPct > 80
                  ? 'linear-gradient(90deg, #f87171, #ef4444)'
                  : undefined
              }}
            />
          </div>
          <div className="text-xs text-ink-faint mt-1.5 font-mono">
            {Math.max(0, (profile?.credits_limit || 0) - (profile?.credits_used || 0)).toLocaleString()} rows remaining this month
          </div>
        </div>

        {profile?.stripe_customer_id && profile.plan !== 'free' && (
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="btn-ghost px-4 py-2.5 rounded-lg text-sm flex items-center gap-2"
          >
            {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
            Manage subscription
            <ExternalLink size={12} />
          </button>
        )}
      </div>

      {/* Upgrade options */}
      {profile?.plan !== 'business' && (
        <div>
          <h2 className="font-display font-600 text-ink mb-3">Upgrade plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRICING_PLANS
              .filter(p => p.id !== 'free' && p.id !== profile?.plan)
              .map(plan => (
                <div key={plan.id} className={cn(
                  "glass-panel rounded-xl p-5",
                  plan.popular && "accent-border"
                )}>
                  {plan.popular && (
                    <div className="text-accent text-xs font-mono uppercase tracking-wider mb-2">Popular</div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-display font-700 text-ink">{plan.name}</div>
                      <div className="text-ink-muted text-sm">€{plan.price}/month</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-700 text-xl text-accent">
                        {plan.rows_per_month.toLocaleString()}
                      </div>
                      <div className="text-ink-faint text-xs font-mono">rows/mo</div>
                    </div>
                  </div>
                  <button
                    onClick={() => upgrade(plan.stripe_price_id, plan.id)}
                    disabled={upgrading === plan.id}
                    className={cn(
                      "w-full py-2.5 rounded-lg text-sm font-display flex items-center justify-center gap-2",
                      plan.popular ? "btn-primary" : "btn-ghost"
                    )}
                  >
                    {upgrading === plan.id
                      ? <><Loader2 size={13} className="animate-spin" /> Processing...</>
                      : `Upgrade to ${plan.name}`
                    }
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
