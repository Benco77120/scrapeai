'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Download, RefreshCw, Loader2, CheckCircle, AlertCircle, ArrowLeft,
  Search, Eye, EyeOff, FileJson, FileText, Table, Filter, Copy, ExternalLink
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { exportToCSV, exportToJSON, exportToXLSX, formatDate, getStatusBg, cn } from '@/lib/utils'
import type { Project, Result } from '@/types'

const COLUMNS: { key: keyof Result | string; label: string; defaultVisible: boolean }[] = [
  { key: 'name', label: 'Name', defaultVisible: true },
  { key: 'email', label: 'Email', defaultVisible: true },
  { key: 'phone', label: 'Phone', defaultVisible: true },
  { key: 'website', label: 'Website', defaultVisible: true },
  { key: 'address', label: 'Address', defaultVisible: true },
  { key: 'city', label: 'City', defaultVisible: false },
  { key: 'country', label: 'Country', defaultVisible: false },
  { key: 'category', label: 'Category', defaultVisible: true },
  { key: 'rating', label: 'Rating', defaultVisible: true },
  { key: 'reviews', label: 'Reviews', defaultVisible: false },
  { key: 'description', label: 'Description', defaultVisible: false },
  { key: 'funding', label: 'Funding', defaultVisible: false },
  { key: 'founded', label: 'Founded', defaultVisible: false },
  { key: 'employees', label: 'Employees', defaultVisible: false },
  { key: 'linkedin', label: 'LinkedIn', defaultVisible: false },
]

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [visibleCols, setVisibleCols] = useState(
    new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
  )
  const [showColPicker, setShowColPicker] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)
  const router = useRouter()

  const loadData = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}?page=${page}&page_size=100`)
    if (!res.ok) { router.push('/dashboard'); return }
    const data = await res.json()
    setProject(data.project)
    setResults(data.results || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [id, page])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Poll while running
  useEffect(() => {
    if (!project || project.status !== 'running') return
    const timer = setInterval(loadData, 3000)
    return () => clearInterval(timer)
  }, [project?.status, loadData])

  const filtered = results.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return [r.name, r.email, r.phone, r.address, r.city, r.website, r.category]
      .some(v => v?.toLowerCase().includes(s))
  })

  async function handleExport(format: 'csv' | 'json' | 'xlsx') {
    setExporting(true)
    try {
      // Fetch ALL results for export
      const res = await fetch(`/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: id, format }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `scrapeai-${project?.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported as ${format.toUpperCase()}`)
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email)
    toast.success('Copied!')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="text-accent animate-spin" />
    </div>
  )

  if (!project) return null

  const isRunning = project.status === 'running'
  const isFailed = project.status === 'failed'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border glass sticky top-0 z-20">
        <div className="flex items-start gap-3 mb-3">
          <button onClick={() => router.push('/dashboard')} className="text-ink-muted hover:text-ink mt-0.5">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display font-700 text-ink text-lg truncate">{project.title}</h1>
              <span className={`badge ${getStatusBg(project.status)}`}>
                {isRunning && <Loader2 size={10} className="animate-spin" />}
                {project.status}
              </span>
            </div>
            <p className="text-ink-faint text-xs mt-0.5 truncate font-mono">"{project.query}"</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={loadData}
              className="btn-ghost p-2 rounded-lg"
              title="Refresh"
            >
              <RefreshCw size={14} className={isRunning ? 'animate-spin' : ''} />
            </button>

            {/* Export dropdown */}
            {project.status === 'completed' && total > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={exporting}
                  className="btn-ghost px-3 py-2 rounded-lg text-xs flex items-center gap-1.5"
                  title="Export CSV"
                >
                  <FileText size={13} />
                  CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  disabled={exporting}
                  className="btn-ghost px-3 py-2 rounded-lg text-xs flex items-center gap-1.5"
                  title="Export JSON"
                >
                  <FileJson size={13} />
                  JSON
                </button>
                <button
                  onClick={() => handleExport('xlsx')}
                  disabled={exporting}
                  className="btn-primary px-4 py-2 rounded-lg text-xs flex items-center gap-1.5"
                  title="Export Excel"
                >
                  {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  Excel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {isRunning && (
          <div>
            <div className="progress-bar mb-1">
              <div className="progress-fill" style={{ width: `${project.progress}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-accent text-xs font-mono">{project.progress}% complete</span>
              <span className="text-ink-muted text-xs font-mono">{results.length} rows collected</span>
            </div>
          </div>
        )}

        {/* Error */}
        {isFailed && (
          <div className="flex items-center gap-2 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 text-sm text-red-400">
            <AlertCircle size={14} />
            {project.error_msg || 'Scraping failed. Please try again.'}
          </div>
        )}

        {/* Toolbar */}
        {total > 0 && (
          <div className="flex items-center gap-3 mt-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                placeholder="Filter results..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field w-full rounded-lg pl-8 pr-3 py-2 text-xs"
              />
            </div>
            <span className="text-ink-muted text-xs font-mono">
              {filtered.length.toLocaleString()} / {total.toLocaleString()} rows
            </span>
            <button
              onClick={() => setShowColPicker(!showColPicker)}
              className={cn("btn-ghost p-2 rounded-lg", showColPicker && "border-accent/30 text-accent")}
              title="Column visibility"
            >
              <Table size={14} />
            </button>
          </div>
        )}

        {/* Column picker */}
        <AnimatePresence>
          {showColPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 p-3 bg-surface rounded-xl border border-border">
                {COLUMNS.map(col => (
                  <button
                    key={col.key}
                    onClick={() => setVisibleCols(prev => {
                      const next = new Set(prev)
                      if (next.has(col.key)) next.delete(col.key)
                      else next.add(col.key)
                      return next
                    })}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-mono transition-all border",
                      visibleCols.has(col.key)
                        ? "bg-accent/10 text-accent border-accent/30"
                        : "bg-transparent text-ink-faint border-border hover:border-ink-faint"
                    )}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {results.length === 0 && !isRunning ? (
          <div className="flex items-center justify-center h-48 text-ink-muted text-sm">
            No results yet.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10 text-center">#</th>
                {COLUMNS.filter(c => visibleCols.has(c.key)).map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id}>
                  <td className="text-center text-ink-faint text-[11px]">{i + 1}</td>
                  {COLUMNS.filter(c => visibleCols.has(c.key)).map(col => (
                    <td key={col.key}>
                      <CellValue col={col.key as string} value={(row as unknown as Record<string, unknown>)[col.key]} onCopy={copyEmail} />
                    </td>
                  ))}
                </tr>
              ))}
              {isRunning && (
                <tr>
                  <td colSpan={visibleCols.size + 1} className="text-center py-4">
                    <div className="flex items-center justify-center gap-2 text-accent text-xs font-mono">
                      <Loader2 size={12} className="animate-spin" />
                      Collecting more data...
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function CellValue({ col, value, onCopy }: { col: string; value: unknown; onCopy: (v: string) => void }) {
  if (!value) return <span className="text-ink-faint">—</span>

  const str = String(value)

  if (col === 'email') return (
    <div className="flex items-center gap-1.5 group">
      <span className="text-accent">{str}</span>
      <button onClick={() => onCopy(str)} className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-accent">
        <Copy size={10} />
      </button>
    </div>
  )

  if (col === 'website' || col === 'linkedin') return (
    <a href={str} target="_blank" rel="noopener noreferrer"
      className="text-accent hover:underline flex items-center gap-1 max-w-[180px] truncate">
      {str.replace(/^https?:\/\//, '').replace(/\/$/, '')}
      <ExternalLink size={10} className="flex-shrink-0" />
    </a>
  )

  if (col === 'rating') return (
    <span className="text-lime font-mono">{Number(str).toFixed(1)} ★</span>
  )

  if (col === 'phone') return (
    <span className="font-mono text-ink-muted">{str}</span>
  )

  return <span title={str}>{str.length > 40 ? str.slice(0, 40) + '…' : str}</span>
}
