'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Zap, TrendingUp, Calendar, Database, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

interface Profile {
  plan: string
  credits_used: number
  credits_limit: number
}

interface Project {
  id: string
  title: string
  query: string
  rows_count: number
  status: string
  created_at: string
  task_type: string
}

const PLAN_COLORS: Record<string, string> = {
  free: 'text-ink-muted',
  starter: 'text-blue-400',
  pro: 'text-accent',
  business: 'text-lime',
}

export default function UsagePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, projectsRes] = await Promise.all([
      supabase.from('profiles').select('plan, credits_used, credits_limit').eq('id', user.id).single(),
      fetch('/api/projects?limit=50'),
    ])

    if (profileRes.data) setProfile(profileRes.data)
    const projectsData = await projectsRes.json()
    setProjects(projectsData.projects || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="text-accent animate-spin" />
    </div>
  )

  const usedPct = profile ? Math.min((profile.credits_used / profile.credits_limit) * 100, 100) : 0
  const remaining = profile ? profile.credits_limit - profile.credits_used : 0
  const totalRows = projects.reduce((sum, p) => sum + (p.rows_count || 0), 0)
  const completed = projects.filter(p => p.status === 'completed').length

  // Compute last 7 days activity
  const now = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
  const byDay = days.map(day => ({
    label: new Date(day).toLocaleDateString('en', { weekday: 'short' }),
    count: projects.filter(p => p.created_at.slice(0, 10) === day).reduce((s, p) => s + (p.rows_count || 0), 0),
  }))
  const maxDay = Math.max(...byDay.map(d => d.count), 1)

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display font-700 text-ink text-2xl">Usage</h1>
        <p className="text-ink-muted text-sm mt-1">Your data collection activity this month</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Rows collected', value: totalRows.toLocaleString(), icon: Database, color: 'text-accent' },
          { label: 'Searches done', value: projects.length, icon: TrendingUp, color: 'text-lime' },
          { label: 'Completed', value: completed, icon: Calendar, color: 'text-blue-400' },
          { label: 'Credits left', value: remaining.toLocaleString(), icon: Zap, color: 'text-yellow-400' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="card p-4"
          >
            <div className={`${stat.color} mb-2`}><stat.icon size={18} /></div>
            <div className="font-display font-700 text-ink text-2xl">{stat.value}</div>
            <div className="text-ink-faint text-xs mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Credit quota bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-5 mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-ink font-display font-600 text-sm">Monthly quota</span>
            <span className={`ml-2 text-xs font-mono px-2 py-0.5 rounded-full bg-surface border border-border ${PLAN_COLORS[profile?.plan || 'free']}`}>
              {profile?.plan || 'free'}
            </span>
          </div>
          <span className="text-ink-muted text-xs font-mono">
            {profile?.credits_used.toLocaleString()} / {profile?.credits_limit.toLocaleString()} rows
          </span>
        </div>
        <div className="h-2.5 bg-surface rounded-full overflow-hidden border border-border">
          <motion.div
            className={`h-full rounded-full ${usedPct > 85 ? 'bg-red-400' : usedPct > 60 ? 'bg-yellow-400' : 'bg-accent'}`}
            initial={{ width: 0 }}
            animate={{ width: `${usedPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-ink-faint text-xs">{usedPct.toFixed(1)}% used</span>
          {usedPct > 80 && (
            <Link href="/dashboard/billing" className="text-xs text-accent hover:underline flex items-center gap-1">
              Upgrade plan <ArrowRight size={10} />
            </Link>
          )}
        </div>
      </motion.div>

      {/* 7-day chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-5 mb-6"
      >
        <h2 className="font-display font-600 text-ink text-sm mb-4">Rows collected — last 7 days</h2>
        <div className="flex items-end gap-2 h-28">
          {byDay.map((d, i) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-ink-faint text-[10px] font-mono">
                {d.count > 0 ? d.count.toLocaleString() : ''}
              </span>
              <motion.div
                className="w-full rounded-sm bg-accent/20 relative overflow-hidden"
                style={{ height: '80px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.05 }}
              >
                <motion.div
                  className="absolute bottom-0 w-full bg-accent rounded-sm"
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.count / maxDay) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.5 + i * 0.05 }}
                />
              </motion.div>
              <span className="text-ink-faint text-[10px]">{d.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent scrape history */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-display font-600 text-ink text-sm">Scrape history</h2>
        </div>
        {projects.length === 0 ? (
          <div className="p-8 text-center text-ink-muted text-sm">No scrapes yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {projects.slice(0, 20).map(p => (
              <Link
                key={p.id}
                href={`/dashboard/results/${p.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-surface/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-ink text-sm font-display font-500 truncate">{p.title}</div>
                  <div className="text-ink-faint text-xs font-mono truncate mt-0.5">"{p.query}"</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-accent font-mono text-sm font-600">{(p.rows_count || 0).toLocaleString()} rows</div>
                  <div className="text-ink-faint text-xs">{formatDate(p.created_at)}</div>
                </div>
                <ArrowRight size={14} className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
