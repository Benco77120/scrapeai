'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Plus, Trash2, ExternalLink, Search, Loader2, CheckCircle, AlertCircle, Clock, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatDate, getStatusBg, cn } from '@/lib/utils'
import type { Project } from '@/types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/projects?limit=50')
    const data = await res.json()
    setProjects(data.projects || [])
    setLoading(false)
  }

  async function deleteProject(id: string) {
    if (!confirm('Delete this project and all its results?')) return
    setDeleting(id)
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setProjects(p => p.filter(x => x.id !== id))
      toast.success('Project deleted')
    } else {
      toast.error('Failed to delete')
    }
    setDeleting(null)
  }

  const filtered = projects.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.query.toLowerCase().includes(search.toLowerCase())
  )

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'running') return <Loader2 size={14} className="text-accent animate-spin" />
    if (status === 'completed') return <CheckCircle size={14} className="text-lime" />
    if (status === 'failed') return <AlertCircle size={14} className="text-red-400" />
    return <Clock size={14} className="text-yellow-400" />
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-700 text-ink text-2xl">Projects</h1>
          <p className="text-ink-muted text-sm mt-1">{projects.length} total searches</p>
        </div>
        <Link href="/dashboard/search" className="btn-primary px-5 py-2.5 rounded-lg text-sm font-display flex items-center gap-2">
          <Plus size={14} />
          New search
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field w-full rounded-lg pl-9 pr-3 py-2.5 text-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <BarChart3 size={32} className="text-ink-faint mx-auto mb-3" />
          <p className="text-ink-muted mb-4">
            {search ? 'No projects match your search.' : 'No projects yet.'}
          </p>
          {!search && (
            <Link href="/dashboard/search" className="btn-primary px-6 py-2.5 rounded-lg text-sm font-display inline-flex items-center gap-2">
              <Plus size={14} />
              Start first search
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-panel rounded-xl p-4 card-hover group"
            >
              <div className="flex items-center gap-3">
                <StatusIcon status={project.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-500 text-ink truncate">{project.title}</span>
                    <span className={`badge text-[10px] ${getStatusBg(project.status)}`}>
                      {project.status}
                    </span>
                    {project.task_type && (
                      <span className="badge text-[10px] bg-ink-faint/20 text-ink-muted border-ink-faint/20">
                        {project.task_type.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <p className="text-ink-faint text-xs truncate font-mono">"{project.query}"</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  {project.rows_count > 0 && (
                    <div className="text-right hidden sm:block">
                      <div className="font-display font-700 text-sm text-ink">{project.rows_count.toLocaleString()}</div>
                      <div className="text-ink-faint text-[10px] font-mono">rows</div>
                    </div>
                  )}
                  <div className="text-ink-faint text-[10px] font-mono hidden md:block">
                    {formatDate(project.created_at)}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/dashboard/results/${project.id}`}
                      className="btn-ghost p-2 rounded-lg"
                      title="View results"
                    >
                      <ExternalLink size={13} />
                    </Link>
                    <button
                      onClick={() => deleteProject(project.id)}
                      disabled={deleting === project.id}
                      className="btn-ghost p-2 rounded-lg hover:text-red-400 hover:border-red-400/30"
                      title="Delete"
                    >
                      {deleting === project.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} />
                      }
                    </button>
                  </div>
                </div>
              </div>
              {project.status === 'running' && (
                <div className="progress-bar mt-3">
                  <div className="progress-fill" style={{ width: `${project.progress}%` }} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
