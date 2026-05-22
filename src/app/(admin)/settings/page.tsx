'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-context'
import { me } from '@/lib/api'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const { authUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const token = authUser?.token ?? ''

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => me.get(token),
    enabled: !!token,
  })

  const [displayName, setDisplayName] = useState('')
  const [nameEditing, setNameEditing] = useState(false)

  const profileMutation = useMutation({
    mutationFn: (body: Parameters<typeof me.patch>[1]) => me.patch(token, body),
    onSuccess: () => setNameEditing(false),
  })

  const notifPrefs = profile?.notificationPreferences ?? { returnPush: false, emailDigest: false }

  function handleNotifToggle(key: 'returnPush' | 'emailDigest', value: boolean) {
    profileMutation.mutate({ notificationPreferences: { ...notifPrefs, [key]: value } })
  }

  const mockMode = process.env.NEXT_PUBLIC_MOCK_API === 'true'

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Settings</h1>

      {/* Appearance */}
      <Section title="Appearance">
        <Row
          label="Color theme"
          description="Switch between light and dark interface."
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {theme === 'dark' ? '☀️ Switch to light' : '🌙 Switch to dark'}
            </button>
          </div>
        </Row>
      </Section>

      {/* Profile */}
      <Section title="Profile">
        <Row label="Email" description="Managed by Firebase Auth — contact an admin to change.">
          <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
            {authUser?.firebaseUser.email}
          </span>
        </Row>

        <Row label="Role">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 capitalize">
            {authUser?.role}
          </span>
        </Row>

        <Row label="Display name">
          {nameEditing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44"
              />
              <button
                onClick={() => profileMutation.mutate({ displayName })}
                disabled={profileMutation.isPending || !displayName.trim()}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setNameEditing(false)}
                className="px-2.5 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {profile?.displayName ?? '—'}
              </span>
              <button
                onClick={() => { setDisplayName(profile?.displayName ?? ''); setNameEditing(true) }}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Edit
              </button>
            </div>
          )}
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Row label="Push on return" description="Receive a push notification when a quadrat is returned for revision.">
          <Toggle
            checked={notifPrefs.returnPush}
            onChange={(v) => handleNotifToggle('returnPush', v)}
          />
        </Row>
        <Row label="Email digest" description="Daily summary of verification activity sent to your email.">
          <Toggle
            checked={notifPrefs.emailDigest}
            onChange={(v) => handleNotifToggle('emailDigest', v)}
          />
        </Row>
      </Section>

      {/* System */}
      <Section title="System">
        <Row label="API base URL">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-xs">
            {process.env.NEXT_PUBLIC_API_BASE_URL || '(not set)'}
          </span>
        </Row>
        <Row label="Mock mode" description="All API calls are intercepted by MSW — no real backend.">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            mockMode
              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
          }`}>
            {mockMode ? 'Enabled' : 'Disabled'}
          </span>
        </Row>
        <Row label="Logged in as">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {authUser?.firebaseUser.uid}
          </span>
        </Row>
        <Row label="Session token">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-xs">
            {authUser?.token.slice(0, 24)}…
          </span>
        </Row>
      </Section>
    </div>
  )
}
