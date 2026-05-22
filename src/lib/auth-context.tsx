'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from './firebase'
import type { Role } from './types'

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API === 'true'

interface AuthUser {
  firebaseUser: User
  token: string
  role: Role | null
  verificationScope: string[] | '*' | null
}

interface AuthContextValue {
  authUser: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Synthetic Firebase User stub used in mock mode only
function mockFirebaseUser(email: string): User {
  return { uid: 'admin-uid-001', email, displayName: 'Maria Santos', getIdToken: async () => 'mock-token' } as unknown as User
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (MOCK_MODE) {
      // Check localStorage so mock session survives a page refresh
      const saved = localStorage.getItem('britemap_mock_user')
      if (saved) {
        const { email, role } = JSON.parse(saved) as { email: string; role: Role }
        setAuthUser({ firebaseUser: mockFirebaseUser(email), token: 'mock-token', role, verificationScope: role === 'admin' ? '*' : ['LAG', 'BTG'] })
      }
      setLoading(false)
      return
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setAuthUser(null); setLoading(false); return }
      const tokenResult = await user.getIdTokenResult()
      const claims = tokenResult.claims as { role?: Role; scope?: string[] | '*' }
      setAuthUser({ firebaseUser: user, token: tokenResult.token, role: claims.role ?? null, verificationScope: claims.scope ?? null })
      setLoading(false)
    })
    return unsub
  }, [])

  async function signIn(email: string, password: string) {
    if (MOCK_MODE) {
      // Accept any password in mock mode; role is derived from email prefix
      const role: Role = email.startsWith('verifier') ? 'verifier' : email.startsWith('user') ? 'user' : 'admin'
      localStorage.setItem('britemap_mock_user', JSON.stringify({ email, role }))
      setAuthUser({ firebaseUser: mockFirebaseUser(email), token: 'mock-token', role, verificationScope: role === 'admin' ? '*' : ['LAG', 'BTG'] })
      return
    }
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const tokenResult = await cred.user.getIdTokenResult()
    const claims = tokenResult.claims as { role?: Role; scope?: string[] | '*' }
    setAuthUser({ firebaseUser: cred.user, token: tokenResult.token, role: claims.role ?? null, verificationScope: claims.scope ?? null })
  }

  async function signOut() {
    if (MOCK_MODE) { localStorage.removeItem('britemap_mock_user'); setAuthUser(null); return }
    await firebaseSignOut(auth)
    setAuthUser(null)
  }

  async function refreshToken() {
    if (MOCK_MODE) return 'mock-token'
    const user = auth.currentUser
    if (!user) return null
    const token = await user.getIdToken(true)
    setAuthUser((prev) => (prev ? { ...prev, token } : null))
    return token
  }

  return (
    <AuthContext.Provider value={{ authUser, loading, signIn, signOut, refreshToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
