'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API === 'true'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { signIn } = useAuth()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetState, setResetState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleReset() {
    if (!resetEmail) return
    if (MOCK_MODE) { setResetState('sent'); return }
    setResetState('sending')
    try {
      await sendPasswordResetEmail(auth, resetEmail)
      setResetState('sent')
    } catch {
      setResetState('error')
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      await signIn(data.email, data.password)
      router.replace('/dashboard')
    } catch {
      setServerError('Invalid email or password.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-8">
          ← Back to main page
        </Link>
        <h1 className="text-2xl font-bold text-white mb-1">BRITE-MAP</h1>
        <p className="text-slate-400 text-sm mb-8">Admin &amp; Verification Console</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              {...register('email')}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm text-slate-300">Password</label>
              <button
                type="button"
                onClick={() => { setShowReset((v) => !v); setResetState('idle') }}
                className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
          </div>

          {serverError && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* ── Forgot password ── */}
        {showReset && (
          <div className="mt-6 p-4 rounded-lg bg-slate-800 border border-slate-700 space-y-3">
            <p className="text-sm text-slate-300 font-medium">Reset your password</p>
            {resetState === 'sent' ? (
              <p className="text-xs text-emerald-400">
                {MOCK_MODE
                  ? 'Password reset is not available in demo mode.'
                  : 'Reset email sent — check your inbox.'}
              </p>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {resetState === 'error' && (
                  <p className="text-xs text-red-400">Could not send reset email. Check the address and try again.</p>
                )}
                <button
                  onClick={handleReset}
                  disabled={resetState === 'sending' || !resetEmail}
                  className="w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {resetState === 'sending' ? 'Sending…' : 'Send reset email'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
