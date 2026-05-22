'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AppShell } from '@/components/layout/AppShell'

// Route guard: admin or verifier
export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  const { authUser, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!authUser) { router.replace('/login'); return }
    if (authUser.role !== 'admin' && authUser.role !== 'verifier') router.replace('/login')
  }, [authUser, loading, router])

  if (loading || !authUser) return null
  if (authUser.role !== 'admin' && authUser.role !== 'verifier') return null

  return <AppShell>{children}</AppShell>
}
