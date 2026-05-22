'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AppShell } from '@/components/layout/AppShell'

// Route guard: admin-only pages
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { authUser, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!authUser) { router.replace('/login'); return }
    if (authUser.role !== 'admin') router.replace('/queue')
  }, [authUser, loading, router])

  if (loading || !authUser || authUser.role !== 'admin') return null

  return <AppShell>{children}</AppShell>
}
