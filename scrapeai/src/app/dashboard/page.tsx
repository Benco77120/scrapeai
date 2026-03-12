'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, ArrowRight, Clock, CheckCircle, Loader2, AlertCircle, TrendingUp, Database, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatDate, getStatusBg, formatNumber } from '@/lib/utils'
import type { Project, Profile } from '@/types'

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: prof }, { data: proj }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('projects').select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(10),
      ])

      setProfile(prof)
      setProjects(proj || [])
      setLoading(false)
    }
    load()
  }, [])

  const totalRows = projects.reduce((s, p) => s + (p.rows_count || 0), 0)
  const completedCount = projects.filter(p => p.status === 'completed').length
  const runningCount = projects.filter(p => p.status === 'running').length

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-700 text-ink text-2xl">
            Good {getTimeOfDay()}, {profile?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-ink-muted text-sm mt-1">What data do you need today?</p>
        </div>
        <Link
          href="/dashboard/search"
          className="btn-primary px-5 py-2.5 rounded-lg text-sm font-display flex items-center gap-2"
        >
          <Plus size={14} />
          New search
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total rows', value: formatNumber(totalRows), icon: Database, color: 'text-accent' },
          { label: 'Searches', value: projects.length, icon: Zap, color: 'text-lime' },
          { label: 'Completed', value: completedCount, icon: CheckCircle, color: 'text-lime' },
          { label: 'Credits left', value: profile ? formatNumber(profile.credits_limit - profile.credits_used) : '—', icon: TrendingUp, color: 'text-accent' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass-panel rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-ink-muted uppercase tracking-wider">{stat.label}</span>
              <stat.icon size={14} className={stat.color} />
            </div>
            <div className={`font-display font-700 text-2xl ${stat.color}`}>{loading ? '—' : stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick search prompt */}
      <Link href="/dashboard/search" className="block mb-8">
        <div className="glass-panel rounded-xl p-4 border border-border card-hover group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <Zap size={15} className="text-accent" />
            </div>
            <span className="text-ink-muted group-hover:text-ink-faint transition-colors text-sm">
              Ask AI for any data... e.g. "Find 200 marketing agencies in Paris with emails"
            </span>
            <ArrowRight size={16} className="text-ink-faint ml-auto flex-shrink-0 group-hover:text-accent transition-colors" />
          </div>
        </div>
      </Link>

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-600 text-ink">Recent searches</h2>
          <Link href="/dashboard/projects" className="text-accent text-sm hover:underline">View all</Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-panel rounded-xl p-10 text-center">
            <Database size={32} className="text-ink-faint mx-auto mb-3" />
            <p className="text-ink-muted mb-4">No searches yet. Start by describing the data you need.</p>
            <Link href="/dashboard/search" className="btn-primary px-6 py-2.5 rounded-lg text-sm font-display inline-flex items-center gap-2">
              <Plus size={14} />
              New search
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/dashboard/results/${project.id}`} className="block glass-panel rounded-xl p-4 card-hover">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {project.status === 'running' ? (
                        <Loader2 size={16} className="text-accent animate-spin" />
                      ) : project.status === 'completed' ? (
                        <CheckCircle size={16} className="text-lime" />
                      ) : project.status === 'failed' ? (
                        <AlertCircle size={16} className="text-red-400" />
                      ) : (
                        <Clock size={16} className="text-yellow-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-500 text-ink text-sm truncate">{project.title}</span>
                        <span className={`badge text-[10px] ${getStatusBg(project.status)}`}>
                          {project.status}
                        </span>
                      </div>
                      <p className="text-ink-faint text-xs truncate">{project.query}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {project.rows_count > 0 && (
                        <div className="font-display font-700 text-sm text-ink">{project.rows_count.toLocaleString()}</div>
                      )}
                      <div className="text-ink-faint text-[10px] font-mono">{formatDate(project.created_at)}</div>
                    </div>
                    <ArrowRight size={14} className="text-ink-faint flex-shrink-0" />
                  </div>
                  {project.status === 'running' && (
                    <div className="progress-bar mt-3">
                      <div className="progress-fill" style={{ width: `${project.progress}%` }} />
                    </div>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function getTimeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
