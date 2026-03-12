'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { CheckCircle, Zap, Database, ArrowLeft, Loader2 } from 'lucide-react'
import { PRICING_PLANS } from '@/types'
import { cn } from '@/lib/utils'

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubscribe(priceId: string, planId: string) {
    if (planId === 'free') { router.push('/auth/signup'); return }
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_id: priceId }),
      })
      const data = await res.json()
      if (data.error) {
        if (res.status === 401) { router.push('/auth/signup'); return }
        throw new Error(data.error)
      }
      window.location.href = data.url
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-void">
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(0,229,255,0.06) 0%, transparent 60%)'
      }} />

      {/* Nav */}
      <nav className="relative z-10 border-b border-border/50 glass">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
              <Database size={14} className="text-void" />
            </div>
            <span className="font-display font-700 text-ink text-lg">ScrapeAI</span>
          </Link>
          <Link href="/" className="text-ink-muted text-sm flex items-center gap-1 hover:text-ink">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
      </nav>

      <div className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="font-display font-800 text-4xl md:text-5xl text-ink mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-ink-muted text-lg max-w-xl mx-auto">
              Start free. Scale as your data needs grow. Cancel anytime.
            </p>
          </div>

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRICING_PLANS.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "glass-panel rounded-2xl p-6 flex flex-col relative",
                  plan.popular && "accent-border shadow-accent"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="bg-accent text-void text-[10px] font-display font-700 uppercase tracking-wider px-3 py-1 rounded-full">
                      Most popular
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <div className="text-ink-muted text-sm font-mono uppercase tracking-wider mb-1">{plan.name}</div>
                  <div className="font-display font-800 text-4xl text-ink">
                    {plan.currency}{plan.price}
                  </div>
                  <div className="text-ink-faint text-sm mt-0.5">per month</div>
                </div>

                <div className="mb-6 p-3 bg-surface rounded-xl">
                  <div className="font-display font-700 text-2xl text-accent">
                    {plan.rows_per_month.toLocaleString()}
                  </div>
                  <div className="text-ink-muted text-xs font-mono">rows / month</div>
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <CheckCircle size={13} className="text-lime mt-0.5 flex-shrink-0" />
                      <span className="text-ink-muted text-sm">{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.stripe_price_id, plan.id)}
                  disabled={loading === plan.id}
                  className={cn(
                    "w-full py-3 rounded-xl text-sm font-display font-600 flex items-center justify-center gap-2 transition-all",
                    plan.popular
                      ? "btn-primary"
                      : plan.id === 'free'
                        ? "bg-surface border border-border text-ink hover:border-ink-muted"
                        : "btn-ghost"
                  )}
                >
                  {loading === plan.id ? (
                    <><Loader2 size={14} className="animate-spin" /> Processing...</>
                  ) : (
                    plan.id === 'free' ? 'Start free' : `Get ${plan.name}`
                  )}
                </button>
              </motion.div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mt-20 max-w-2xl mx-auto">
            <h2 className="font-display font-700 text-2xl text-ink text-center mb-8">Common questions</h2>
            <div className="space-y-4">
              {[
                { q: 'What counts as a "row"?', a: 'Each business or contact record returned counts as one row. Duplicates are removed automatically.' },
                { q: 'How accurate is the email extraction?', a: 'We extract emails directly from company websites and public directories, achieving 60–80% coverage for most business types.' },
                { q: 'Can I use this for cold outreach?', a: 'Yes. ScrapeAI is used by thousands of sales teams and agencies for building prospecting lists. Always follow GDPR and local regulations.' },
                { q: 'Can I cancel anytime?', a: 'Yes, you can cancel your subscription at any time. Credits remain usable until the end of the billing period.' },
                { q: 'What sources do you scrape?', a: 'We use Google Maps, company websites, business directories, startup databases (Crunchbase-style), and marketplace listings.' },
              ].map(({ q, a }, i) => (
                <div key={i} className="glass-panel rounded-xl p-5">
                  <div className="font-display font-600 text-ink mb-2">{q}</div>
                  <div className="text-ink-muted text-sm leading-relaxed">{a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
