'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import clsx from 'clsx'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-context'

// ─── Nav icons ────────────────────────────────────────────────────────────────

const I = {
  map: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <path d="M1 3.5 5.5 2l5 1.5L15 2v10l-4.5 1.5-5-1.5L1 13.5V3.5z"/>
      <path d="M5.5 2v10M10.5 3.5v10"/>
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1"/>
      <rect x="9.5" y="1.5" width="5" height="5" rx="1"/>
      <rect x="1.5" y="9.5" width="5" height="5" rx="1"/>
      <rect x="9.5" y="9.5" width="5" height="5" rx="1"/>
    </svg>
  ),
  queue: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <path d="M10 1.5H11A1.5 1.5 0 0112.5 3v10A1.5 1.5 0 0111 14.5H5A1.5 1.5 0 013.5 13V3A1.5 1.5 0 015 1.5H6"/>
      <path d="M6 1.5A1 1 0 017 .5h2a1 1 0 011 1v.5a1 1 0 01-1 1H7a1 1 0 01-1-1V1.5z"/>
      <path d="M5.5 8.5l1.5 1.5 3.5-3.5"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <circle cx="6" cy="5" r="2.5"/>
      <path d="M1 14c0-2.5 2-4.5 5-4.5s5 2 5 4.5"/>
      <path d="M11 7a2 2 0 000-4M15 14c0-2-1.5-3.5-3.5-4"/>
    </svg>
  ),
  audit: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <path d="M3.5 1.5A1 1 0 014.5.5H10l3 3v10a1 1 0 01-1 1H4.5a1 1 0 01-1-1V1.5z"/>
      <path d="M10 .5V4h3.5"/>
      <path d="M5.5 7h5M5.5 9.5h5M5.5 12h3"/>
    </svg>
  ),
  batch: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <circle cx="8" cy="8" r="6.5"/>
      <path d="M8 4.5V8l2.5 1.5"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <circle cx="8" cy="8" r="2"/>
      <path d="M8 1v2M8 13v2M3 3l1.5 1.5M11.5 11.5 13 13M1 8h2M13 8h2M3 13l1.5-1.5M11.5 4.5 13 3"/>
    </svg>
  ),
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: string[]
}

const NAV: NavItem[] = [
  { label: 'Map',            href: '/map',       icon: I.map,       roles: ['admin', 'verifier'] },
  { label: 'Dashboard',      href: '/dashboard', icon: I.dashboard, roles: ['admin'] },
  { label: 'Verify Queue',   href: '/queue',     icon: I.queue,     roles: ['admin', 'verifier'] },
  { label: 'Users',          href: '/users',     icon: I.users,     roles: ['admin'] },
  { label: 'Audit Log',      href: '/audit',     icon: I.audit,     roles: ['admin', 'verifier'] },
  { label: 'Batch Runs',     href: '/batch',     icon: I.batch,     roles: ['admin', 'verifier'] },
  { label: 'Settings',       href: '/settings',  icon: I.settings,  roles: ['admin'] },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { authUser, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()

  const role = authUser?.role ?? null
  const visibleNav = NAV.filter((n) => role && n.roles.includes(role))

  async function handleSignOut() {
    await signOut()
    router.replace('/login')
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800">
          <Link href="/" className="font-bold text-lg tracking-tight text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors">
            BRITEMAP
          </Link>
          <span className="ml-2 text-xs text-slate-400 uppercase">{role}</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                pathname.startsWith(item.href)
                  ? 'bg-emerald-100 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer: theme toggle + user */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4 shrink-0">
              {theme === 'dark' ? (
                <><circle cx="8" cy="8" r="3.5"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M12 4l1-1M3 13l1-1"/></>
              ) : (
                <path d="M13 9A6 6 0 016 2a6 6 0 100 12 6 6 0 007-5z"/>
              )}
            </svg>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>

          {/* User */}
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-1.5">
              {authUser?.firebaseUser.email}
            </p>
            <button
              onClick={handleSignOut}
              className="w-full text-xs text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors text-left"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
