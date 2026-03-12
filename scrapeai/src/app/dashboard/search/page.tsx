'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Zap, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  { text: 'Find 200 restaurants in Berlin with emails and phone numbers', tag: 'Google Maps' },
  { text: 'List AI startups in Europe with websites and funding', tag: 'Directory' },
  { text: 'Marketing agencies in Madrid — extract contact emails', tag: 'Email' },
  { text: 'Top Shopify stores selling supplements in the US', tag: 'E-commerce' },
  { text: 'Dentists in London with phone numbers and ratings', tag: 'Google Maps' },
  { text: 'SaaS companies in Amsterdam under 50 employees', tag: 'Directory' },
  { text: 'Real estate agencies in Paris with contact details', tag: 'Google Maps' },
  { text: 'LinkedIn profiles of CTOs in Berlin fintech startups', tag: 'LinkedIn' },
]

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'interpreting' | 'launching'>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [query])

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault()
    if (!query.trim() || loading) return

    setLoading(true)
    setPhase('interpreting')

    try {
      await new Promise(r => setTimeout(r, 800)) // slight delay for UX
      setPhase('launching')

      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 402) {
          toast.error('Not enough credits. Please upgrade your plan.')
          router.push('/pricing')
          return
        }
        throw new Error(data.error || 'Failed to start search')
      }

      toast.success('Search started!')
      router.push(`/dashboard/results/${data.project_id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
      setPhase('idle')
    }
  }

  function useSuggestion(text: string) {
    setQuery(text)
    textareaRef.current?.focus()
  }

  return (
    <div className="flex flex-col min-h-full p-6">
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-5">
            <Sparkles size={12} className="text-accent" />
            <span className="text-accent text-xs font-mono uppercase tracking-widest">AI Data Collection</span>
          </div>
          <h1 className="font-display font-700 text-3xl md:text-4xl text-ink mb-3">
            What data do you need?
          </h1>
          <p className="text-ink-muted text-base">
            Describe it in plain language. ScrapeAI does the rest.
          </p>
        </motion.div>

        {/* Search form */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <form onSubmit={handleSearch} className="relative">
            <div className={cn(
              "glass-panel rounded-2xl overflow-hidden transition-all duration-200",
              query ? "accent-border shadow-accent" : "border-border",
              loading && "opacity-80"
            )}>
              {/* Input area */}
              <div className="flex items-start gap-3 p-4">
                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap size={14} className="text-accent" />
                </div>
                <textarea
                  ref={textareaRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSearch()
                    }
                  }}
                  disabled={loading}
                  placeholder="Describe the data you want to collect..."
                  rows={1}
                  className="flex-1 bg-transparent border-none outline-none text-ink placeholder-ink-faint text-base resize-none py-1 leading-relaxed disabled:opacity-60"
                  style={{ minHeight: '28px', maxHeight: '200px' }}
                />
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                <div className="text-xs text-ink-faint font-mono">
                  {query.length > 0
                    ? `${query.length} chars · Press Enter to search`
                    : 'Press Enter to search · Shift+Enter for new line'
                  }
                </div>
                <button
                  type="submit"
                  disabled={!query.trim() || loading}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-display transition-all",
                    query.trim() && !loading
                      ? "btn-primary"
                      : "bg-surface text-ink-faint cursor-not-allowed border border-border"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {phase === 'interpreting' ? 'Interpreting...' : 'Launching...'}
                    </>
                  ) : (
                    <>
                      Collect data
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Loading phase indicator */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex items-center gap-3 px-4 py-3 bg-accent/5 border border-accent/20 rounded-xl"
              >
                <div className="spinner" />
                <span className="text-accent text-sm font-mono">
                  {phase === 'interpreting'
                    ? '🧠 AI is interpreting your request...'
                    : '🚀 Launching data collection engine...'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Suggestions */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <p className="text-ink-faint text-xs font-mono uppercase tracking-wider mb-3">Try these examples</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.04 }}
                  onClick={() => useSuggestion(s.text)}
                  className="glass-panel rounded-lg px-4 py-3 text-left card-hover group flex items-center justify-between gap-3"
                >
                  <span className="text-ink-muted text-xs group-hover:text-ink transition-colors leading-relaxed">
                    {s.text}
                  </span>
                  <span className={cn(
                    "badge text-[10px] flex-shrink-0",
                    s.tag === 'Google Maps' ? 'bg-lime/10 text-lime border-lime/20' :
                    s.tag === 'Email' ? 'bg-accent/10 text-accent border-accent/20' :
                    'bg-ink-faint/20 text-ink-muted border-ink-faint/20'
                  )}>
                    {s.tag}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
