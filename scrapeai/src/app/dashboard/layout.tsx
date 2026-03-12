'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Database, LayoutDashboard, FolderOpen, Settings, LogOut, Plus, Zap, CreditCard, ChevronRight, BarChart3, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: FolderOpen, label: 'Projects', href: '/dashboard/projects' },
  { icon: BarChart3, label: 'Usage', href: '/dashboard/usage' },
  { icon: CreditCard, label: 'Billing', href: '/dashboard/billing' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => setProfile(data))
    })
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const creditPct = profile ? (profile.credits_used / profile.credits_limit) * 100 : 0

  return (
    <div className="min-h-screen bg-void flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-56 glass-panel border-r border-border flex flex-col transition-transform duration-200",
        "lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="px-4 py-4 border-b border-border flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
              <Database size={12} className="text-void" />
            </div>
            <span className="font-display font-700 text-ink tracking-tight">ScrapeAI</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-ink-faint hover:text-ink">
            <X size={16} />
          </button>
        </div>

        {/* New search button */}
        <div className="px-3 py-3">
          <Link
            href="/dashboard/search"
            className="btn-primary w-full py-2.5 rounded-lg text-sm font-display flex items-center justify-center gap-2"
          >
            <Plus size={14} />
            New search
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                  isActive
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "text-ink-muted hover:text-ink hover:bg-surface"
                )}
              >
                <item.icon size={15} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Credits bar */}
        {profile && (
          <div className="px-3 py-3 border-t border-border">
            <div className="bg-surface rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-ink-muted uppercase tracking-wider">Credits</span>
                <span className={cn(
                  "badge text-[10px]",
                  profile.plan === 'free' ? 'bg-ink-faint/20 text-ink-muted border-ink-faint/20' : 'bg-accent/10 text-accent border-accent/20'
                )}>
                  {profile.plan.toUpperCase()}
                </span>
              </div>
              <div className="progress-bar mb-1.5">
                <div className="progress-fill" style={{ width: `${Math.min(creditPct, 100)}%`,
                  background: creditPct > 80 ? 'linear-gradient(90deg, #f87171, #ef4444)' : undefined
                }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-ink-faint">
                  {profile.credits_used.toLocaleString()} / {profile.credits_limit.toLocaleString()}
                </span>
                {profile.plan === 'free' && (
                  <Link href="/pricing" className="text-[10px] text-accent hover:underline">Upgrade</Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* User */}
        {profile && (
          <div className="px-3 py-3 border-t border-border">
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-surface transition-colors group">
              <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
                <span className="text-accent text-xs font-700 font-display">
                  {(profile.full_name || profile.email)[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-500 text-ink truncate">{profile.full_name || 'User'}</div>
                <div className="text-[10px] text-ink-faint truncate">{profile.email}</div>
              </div>
              <button onClick={signOut} className="text-ink-faint hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                <LogOut size={13} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-void/80 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border glass sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-ink-muted hover:text-ink">
            <Menu size={20} />
          </button>
          <span className="font-display font-700 text-ink">ScrapeAI</span>
        </div>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
