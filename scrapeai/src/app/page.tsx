'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Zap, Globe, Mail, Database, Download, CheckCircle, Star } from 'lucide-react'

const EXAMPLE_QUERIES = [
  'Find 500 restaurants in Berlin with emails and phone numbers',
  'List AI startups in Europe with websites and funding rounds',
  'Marketing agencies in Madrid — extract contact emails',
  'Top e-commerce stores in France with founders and LinkedIn',
  'Dentists in London with phone numbers and ratings',
  'SaaS companies in Amsterdam under 50 employees',
]

const DEMO_RESULTS = [
  { name: 'Café Mitte', email: 'info@cafemitte.de', phone: '+49 30 1234567', address: 'Berlin, DE', rating: '4.5 ★' },
  { name: 'Restaurant Prenzlauer', email: 'contact@prenzlauer.de', phone: '+49 30 9876543', address: 'Berlin, DE', rating: '4.2 ★' },
  { name: 'Kreuzberg Bistro', email: 'hello@kreuzbergbistro.com', phone: '+49 30 5554433', address: 'Berlin, DE', rating: '4.7 ★' },
  { name: 'Charlottenburg Kitchen', email: 'info@ck-berlin.de', phone: '+49 30 3332211', address: 'Berlin, DE', rating: '4.1 ★' },
  { name: 'Tempelhof Grill', email: 'orders@tgrill.de', phone: '+49 30 7778899', address: 'Berlin, DE', rating: '3.9 ★' },
]

const STEPS = [
  { icon: <Zap size={18} />, label: 'Describe', desc: 'Type your data request in plain English' },
  { icon: <Globe size={18} />, label: 'Collect', desc: 'AI finds sources and launches scrapers' },
  { icon: <Mail size={18} />, label: 'Enrich', desc: 'Emails, phones, and contacts extracted' },
  { icon: <Download size={18} />, label: 'Export', desc: 'Download as CSV, JSON or Excel' },
]

export default function LandingPage() {
  const [queryIdx, setQueryIdx] = useState(0)
  const [typed, setTyped] = useState('')
  const [demoVisible, setDemoVisible] = useState(false)
  const [visibleRows, setVisibleRows] = useState(0)

  // Typewriter effect
  useEffect(() => {
    const target = EXAMPLE_QUERIES[queryIdx]
    let i = 0
    setTyped('')
    setDemoVisible(false)
    setVisibleRows(0)

    const type = setInterval(() => {
      setTyped(target.slice(0, i + 1))
      i++
      if (i >= target.length) {
        clearInterval(type)
        setTimeout(() => {
          setDemoVisible(true)
          // Reveal rows one by one
          let row = 0
          const rowTimer = setInterval(() => {
            setVisibleRows(r => r + 1)
            row++
            if (row >= DEMO_RESULTS.length) {
              clearInterval(rowTimer)
              setTimeout(() => {
                setQueryIdx(idx => (idx + 1) % EXAMPLE_QUERIES.length)
              }, 2500)
            }
          }, 250)
        }, 500)
      }
    }, 28)
    return () => clearInterval(type)
  }, [queryIdx])

  return (
    <div className="min-h-screen bg-void overflow-hidden">
      {/* Background grid */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,229,255,0.08) 0%, transparent 60%)'
      }} />

      {/* Nav */}
      <nav className="relative z-50 border-b border-border/50 glass">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
              <Database size={14} className="text-void" />
            </div>
            <span className="font-display font-700 text-ink text-lg tracking-tight">ScrapeAI</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-ink-muted">
            <Link href="/pricing" className="hover:text-ink transition-colors">Pricing</Link>
            <Link href="#features" className="hover:text-ink transition-colors">Features</Link>
            <Link href="/auth/login" className="hover:text-ink transition-colors">Sign in</Link>
            <Link href="/auth/signup" className="btn-primary px-4 py-1.5 rounded-md text-sm">
              Start free →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-accent text-xs font-mono font-500 tracking-widest uppercase">AI-powered data collection</span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-800 text-ink leading-[0.95] tracking-tight mb-6">
              Ask AI for any<br />
              <span className="shimmer-text">data on the internet.</span>
            </h1>

            <p className="text-ink-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Describe the data you need. ScrapeAI finds the sources, launches the scrapers,
              extracts emails and phones, and delivers a clean dataset — in minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/auth/signup" className="btn-primary px-8 py-3.5 rounded-lg text-base font-display flex items-center gap-2 w-full sm:w-auto justify-center">
                Start collecting data
                <ArrowRight size={16} />
              </Link>
              <Link href="/auth/login" className="btn-ghost px-8 py-3.5 rounded-lg text-base w-full sm:w-auto justify-center flex items-center gap-2">
                View demo
              </Link>
            </div>

            <p className="text-ink-faint text-sm mt-4">Free plan includes 100 rows/month. No credit card required.</p>
          </motion.div>
        </div>
      </section>

      {/* Live demo terminal */}
      <section className="relative z-10 px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="glass-panel rounded-xl overflow-hidden shadow-panel"
          >
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-lime/60" />
              </div>
              <span className="text-ink-faint text-xs font-mono ml-2">scrapeai — new search</span>
            </div>

            {/* Query input */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3 bg-void/60 rounded-lg px-4 py-3 border border-border/50">
                <Zap size={16} className="text-accent flex-shrink-0" />
                <span className="text-ink text-sm font-mono flex-1 min-h-[20px]">
                  {typed}
                  <span className="cursor-blink" />
                </span>
              </div>
            </div>

            {/* Results table */}
            <AnimatePresence>
              {demoVisible && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-x-auto"
                >
                  <div className="px-4 py-2 flex items-center gap-2 border-b border-border/50">
                    <span className="text-lime text-xs font-mono">● collecting...</span>
                    <div className="progress-bar flex-1">
                      <div className="progress-fill" style={{ width: `${(visibleRows / DEMO_RESULTS.length) * 100}%` }} />
                    </div>
                    <span className="text-ink-muted text-xs font-mono">{visibleRows} rows</span>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Location</th>
                        <th>Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEMO_RESULTS.slice(0, visibleRows).map((row, i) => (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <td className="font-500 text-ink">{row.name}</td>
                          <td className="text-accent">{row.email}</td>
                          <td className="text-ink-muted">{row.phone}</td>
                          <td className="text-ink-muted">{row.address}</td>
                          <td className="text-lime">{row.rating}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="px-4 py-3 flex items-center justify-between border-t border-border/50">
              <span className="text-ink-faint text-xs font-mono">Powered by ScrapeAI + Apify + OpenAI</span>
              <div className="flex gap-2">
                <span className="badge bg-lime/10 text-lime border-lime/20">CSV</span>
                <span className="badge bg-accent/10 text-accent border-accent/20">JSON</span>
                <span className="badge bg-ink-faint/20 text-ink-muted border-ink-faint/20">Excel</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="features" className="relative z-10 py-20 px-6 border-t border-border/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-700 text-ink mb-3">How it works</h2>
            <p className="text-ink-muted">Four steps from prompt to dataset.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-panel rounded-xl p-6 card-hover relative"
              >
                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4">
                  {step.icon}
                </div>
                <div className="text-xs font-mono text-ink-faint mb-1">0{i + 1}</div>
                <div className="font-display font-600 text-ink mb-2">{step.label}</div>
                <div className="text-ink-muted text-sm leading-relaxed">{step.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="relative z-10 py-20 px-6 border-t border-border/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-700 text-ink mb-3">Example requests</h2>
            <p className="text-ink-muted">Whatever data you need, just ask for it.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {EXAMPLE_QUERIES.map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-panel rounded-lg p-4 card-hover cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-accent mt-0.5 flex-shrink-0">›</span>
                  <span className="text-ink-muted text-sm group-hover:text-ink transition-colors">{q}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="relative z-10 py-20 px-6 border-t border-border/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-700 text-ink mb-3">Simple pricing</h2>
          <p className="text-ink-muted mb-10">Start free. Scale as you grow.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { plan: 'Free', price: '€0', rows: '100 rows' },
              { plan: 'Starter', price: '€29', rows: '1,000 rows' },
              { plan: 'Pro', price: '€79', rows: '5,000 rows', popular: true },
              { plan: 'Business', price: '€199', rows: '20,000 rows' },
            ].map((p, i) => (
              <div key={i} className={`glass-panel rounded-xl p-4 text-center ${p.popular ? 'accent-border' : ''}`}>
                {p.popular && <div className="text-accent text-xs font-mono mb-2 uppercase tracking-wider">Popular</div>}
                <div className="font-display font-700 text-ink text-sm mb-1">{p.plan}</div>
                <div className="font-display font-700 text-2xl text-ink mb-1">{p.price}</div>
                <div className="text-ink-muted text-xs font-mono">{p.rows}/mo</div>
              </div>
            ))}
          </div>
          <Link href="/pricing" className="text-accent text-sm hover:underline">
            View full pricing details →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 px-6 border-t border-border/30">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl font-700 text-ink mb-4">
            Ready to collect data?
          </h2>
          <p className="text-ink-muted mb-8">
            Join thousands of sales teams, researchers, and agencies using ScrapeAI.
          </p>
          <Link href="/auth/signup" className="btn-primary px-10 py-4 rounded-lg text-base font-display inline-flex items-center gap-2">
            Start for free
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-ink-muted">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-accent" />
            <span className="font-display font-600 text-ink">ScrapeAI</span>
            <span className="text-ink-faint">— Ask AI for any data on the internet.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-ink transition-colors">Pricing</Link>
            <Link href="/auth/login" className="hover:text-ink transition-colors">Login</Link>
            <Link href="/auth/signup" className="hover:text-ink transition-colors">Sign up</Link>
          </div>
          <div className="text-ink-faint text-xs">© 2025 ScrapeAI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
