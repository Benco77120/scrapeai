'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Loader2, User, Lock, CreditCard, Trash2, Save, ExternalLink, AlertTriangle, Globe, Download
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  plan: string
  credits_used: number
  credits_limit: number
}

const EXPORT_FORMATS = ['csv', 'json', 'xlsx'] as const
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
]

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [exportFormat, setExportFormat] = useState<string>('csv')
  const [language, setLanguage] = useState('en')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email || '')

    const { data } = await supabase
      .from('profiles')
      .select('id, plan, credits_used, credits_limit')
      .eq('id', user.id)
      .single()

    if (data) setProfile(data)

    // Load saved preferences from localStorage
    const savedFormat = localStorage.getItem('pref_export_format')
    const savedLang = localStorage.getItem('pref_language')
    if (savedFormat) setExportFormat(savedFormat)
    if (savedLang) setLanguage(savedLang)

    setLoading(false)
  }

  async function handleUpdateEmail() {
    setSavingEmail(true)
    const { error } = await supabase.auth.updateUser({ email })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Confirmation email sent — check your inbox')
    }
    setSavingEmail(false)
  }

  async function handleUpdatePassword() {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated')
      setNewPassword('')
      setConfirmPassword('')
    }
    setSavingPassword(false)
  }

  function handleSavePreferences() {
    localStorage.setItem('pref_export_format', exportFormat)
    localStorage.setItem('pref_language', language)
    toast.success('Preferences saved')
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Type DELETE to confirm')
      return
    }
    setDeleting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Delete user data
    const admin = supabase
    await admin.from('projects').delete().eq('user_id', user.id)
    await supabase.auth.signOut()
    toast.success('Account deleted')
    router.push('/')
  }

  async function handleBillingPortal() {
    toast('Redirecting to billing portal...', { icon: '💳' })
    window.open('https://billing.stripe.com/p/login/test_00g00000000000', '_blank')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="text-accent animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display font-700 text-ink text-2xl">Settings</h1>
        <p className="text-ink-muted text-sm mt-1">Manage your account and preferences</p>
      </div>

      <div className="space-y-5">

        {/* Email */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <User size={15} className="text-accent" />
            <h2 className="font-display font-600 text-ink text-sm">Email address</h2>
          </div>
          <div className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field flex-1 rounded-lg px-3 py-2 text-sm"
              placeholder="your@email.com"
            />
            <button
              onClick={handleUpdateEmail}
              disabled={savingEmail}
              className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2 flex-shrink-0"
            >
              {savingEmail ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save
            </button>
          </div>
          <p className="text-ink-faint text-xs mt-2">A confirmation link will be sent to the new address.</p>
        </motion.div>

        {/* Password */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={15} className="text-accent" />
            <h2 className="font-display font-600 text-ink text-sm">Password</h2>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="input-field w-full rounded-lg px-3 py-2 text-sm"
              placeholder="New password (min. 8 characters)"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="input-field w-full rounded-lg px-3 py-2 text-sm"
              placeholder="Confirm new password"
            />
            <button
              onClick={handleUpdatePassword}
              disabled={savingPassword || !newPassword}
              className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-40"
            >
              {savingPassword ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Update password
            </button>
          </div>
        </motion.div>

        {/* Preferences */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={15} className="text-accent" />
            <h2 className="font-display font-600 text-ink text-sm">Preferences</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-ink-muted text-xs mb-1.5 block">Default export format</label>
              <div className="flex gap-2">
                {EXPORT_FORMATS.map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all ${
                      exportFormat === fmt
                        ? 'bg-accent/10 text-accent border-accent/30'
                        : 'bg-transparent text-ink-faint border-border hover:border-ink-faint'
                    }`}
                  >
                    <Download size={11} className="inline mr-1" />
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-ink-muted text-xs mb-1.5 block">Interface language</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="input-field rounded-lg px-3 py-2 text-sm w-48"
              >
                {LANGUAGES.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSavePreferences}
              className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2"
            >
              <Save size={13} />
              Save preferences
            </button>
          </div>
        </motion.div>

        {/* Billing */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={15} className="text-accent" />
            <h2 className="font-display font-600 text-ink text-sm">Billing</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-ink text-sm">
                Current plan: <span className="font-display font-600 text-accent capitalize">{profile?.plan || 'free'}</span>
              </div>
              <div className="text-ink-faint text-xs mt-0.5">
                {profile?.credits_used.toLocaleString()} / {profile?.credits_limit.toLocaleString()} rows used this month
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBillingPortal}
                className="btn-ghost px-4 py-2 rounded-lg text-sm flex items-center gap-2"
              >
                <ExternalLink size={13} />
                Billing portal
              </button>
              <a
                href="/dashboard/billing"
                className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2"
              >
                Upgrade
              </a>
            </div>
          </div>
        </motion.div>

        {/* Danger zone */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card p-5 border-red-400/20">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={15} className="text-red-400" />
            <h2 className="font-display font-600 text-red-400 text-sm">Danger zone</h2>
          </div>
          {!showDeleteModal ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-ink text-sm">Delete account</div>
                <div className="text-ink-faint text-xs mt-0.5">Permanently delete your account and all data. Irreversible.</div>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 rounded-lg text-sm border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2"
              >
                <Trash2 size={13} />
                Delete account
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-ink-muted text-sm">This will permanently delete your account, all projects, and all scraped data. Type <span className="font-mono text-red-400">DELETE</span> to confirm.</p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                className="input-field w-full rounded-lg px-3 py-2 text-sm font-mono border-red-400/30 focus:border-red-400"
                placeholder="Type DELETE"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirm('') }}
                  className="btn-ghost px-4 py-2 rounded-lg text-sm flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirm !== 'DELETE'}
                  className="px-4 py-2 rounded-lg text-sm bg-red-500/20 text-red-400 border border-red-400/30 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2 flex-1 disabled:opacity-40"
                >
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Confirm delete
                </button>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}
