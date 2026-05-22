'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import clsx from 'clsx'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-context'

interface NavItem {
  label: string
  href: string
  icon: string
  roles: string[]
}

const NAV: NavItem[] = [
  { label: 'Map',          href: '/map',       icon: '🗺',  roles: ['admin', 'verifier'] },
  { label: 'Dashboard',    href: '/dashboard', icon: '📊',  roles: ['admin'] },
  { label: 'Verify Queue', href: '/queue',     icon: '✅',  roles: ['admin', 'verifier'] },
  { label: 'Users',        href: '/users',     icon: '👥',  roles: ['admin'] },
  { label: 'Audit Log',    href: '/audit',     icon: '📋',  roles: ['admin', 'verifier'] },
  { label: 'Batch Runs',   href: '/batch',     icon: '⚙️',  roles: ['admin', 'verifier'] },
  { label: 'Settings',     href: '/settings',  icon: '🔧',  roles: ['admin'] },
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
            BRITE-MAP
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
              <span>{item.icon}</span>
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
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
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
