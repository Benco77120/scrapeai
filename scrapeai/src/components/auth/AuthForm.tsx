'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Database, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        })
        if (error) throw error
        toast.success('Account created! Welcome to ScrapeAI.')
        router.push('/dashboard')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Welcome back!')
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,229,255,0.06) 0%, transparent 60%)'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <Database size={16} className="text-void" />
            </div>
            <span className="font-display font-700 text-ink text-xl tracking-tight">ScrapeAI</span>
          </Link>
        </div>

        <div className="glass-panel rounded-2xl p-8">
          <h1 className="font-display font-700 text-ink text-2xl mb-1 text-center">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-ink-muted text-sm text-center mb-8">
            {mode === 'signup'
              ? 'Start collecting data for free'
              : 'Sign in to your ScrapeAI account'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-mono text-ink-muted uppercase tracking-wider block mb-2">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="Your name"
                  className="input-field w-full rounded-lg px-4 py-3 text-sm"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-mono text-ink-muted uppercase tracking-wider block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="input-field w-full rounded-lg px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-ink-muted uppercase tracking-wider block mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="input-field w-full rounded-lg px-4 py-3 text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 rounded-lg text-sm font-display flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  <span>{mode === 'signup' ? 'Creating account...' : 'Signing in...'}</span>
                </>
              ) : (
                mode === 'signup' ? 'Create free account' : 'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-ink-muted">
            {mode === 'signup' ? (
              <>Already have an account?{' '}
                <Link href="/auth/login" className="text-accent hover:underline">Sign in</Link>
              </>
            ) : (
              <>No account yet?{' '}
                <Link href="/auth/signup" className="text-accent hover:underline">Create one free</Link>
              </>
            )}
          </div>

          {mode === 'signup' && (
            <p className="text-ink-faint text-xs text-center mt-4 leading-relaxed">
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </p>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-ink-faint text-sm hover:text-ink-muted transition-colors flex items-center gap-1 justify-center">
            <ArrowLeft size={12} />
            Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
