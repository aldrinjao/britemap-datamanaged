'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth-context'
import { adminUsers } from '@/lib/api'
import type { Role } from '@/lib/types'

const schema = z.object({
  displayName: z.string().min(1, 'Required').max(80),
  role: z.enum(['admin', 'verifier', 'user']),
  provinces: z.string().optional(),
  isActive: z.boolean(),
  notes: z.string().max(500).optional(),
})
type FormData = z.infer<typeof schema>

const ROLE_BADGE: Record<Role, string> = {
  admin:    'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300',
  verifier: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
  user:     'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-300',
}

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500'

export default function EditUserPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params)
  const { authUser } = useAuth()
  const router = useRouter()
  const qc = useQueryClient()
  const token = authUser?.token ?? ''

  // Fetch the current user record
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user', uid],
    queryFn: () => adminUsers.get(token, uid),
    enabled: !!token,
  })
  const user = data?.user

  const { register, handleSubmit, watch, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Populate form once user data arrives
  useEffect(() => {
    if (!user) return
    const scope = user.verificationScope
    reset({
      displayName: user.displayName,
      role: user.role,
      provinces: Array.isArray(scope) ? scope.join(', ') : '',
      isActive: user.isActive,
      notes: user.notes ?? '',
    })
  }, [user, reset])

  const role = watch('role')

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      adminUsers.update(token, uid, {
        displayName: data.displayName,
        role: data.role,
        isActive: data.isActive,
        notes: data.notes || undefined,
        verificationScope:
          data.role === 'verifier' && data.provinces
            ? { provinces: data.provinces.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) }
            : data.role === 'admin'
            ? '*'
            : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-user', uid] })
      router.push('/users')
    },
  })

  if (isLoading) {
    return (
      <div className="p-6 max-w-lg space-y-4">
        <div className="h-7 w-32 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="h-4 w-64 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-9 w-full rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <p className="text-red-500 dark:text-red-400 text-sm">User not found.</p>
        <button onClick={() => router.back()} className="mt-3 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">
          ← Back
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">{user.displayName}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE[user.role]}`}>
              {user.role}
            </span>
            <span className={`text-xs ${user.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {user.isActive ? 'Active' : 'Deactivated'}
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">{uid}</p>
        </div>
        <div className="text-right text-xs text-slate-400 dark:text-slate-500 space-y-0.5">
          <p>Created {new Date(user.createdAt).toLocaleDateString()}</p>
          <p>Updated {new Date(user.updatedAt).toLocaleDateString()}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1 font-medium">Display Name</label>
          <input type="text" {...register('displayName')} className={inputClass} />
          {errors.displayName && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.displayName.message}</p>}
        </div>

        <div>
          <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1 font-medium">Role</label>
          <select {...register('role')} className={inputClass}>
            <option value="user">User</option>
            <option value="verifier">Verifier</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {role === 'verifier' && (
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1 font-medium">
              Province Scope
              <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">(comma-separated codes)</span>
            </label>
            <input
              type="text"
              {...register('provinces')}
              placeholder="LAG, BTG, CAV"
              className={inputClass}
            />
          </div>
        )}

        <div>
          <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1 font-medium">Notes</label>
          <textarea {...register('notes')} rows={2} className={inputClass} />
          {errors.notes && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.notes.message}</p>}
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" {...register('isActive')} className="w-4 h-4 rounded accent-emerald-500" />
          <span className="text-sm text-slate-700 dark:text-slate-300">Account active</span>
        </label>

        {mutation.error && (
          <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">
            {String(mutation.error)}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending || !isDirty}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
