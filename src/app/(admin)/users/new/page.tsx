'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth-context'
import { adminUsers } from '@/lib/api'

const schema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(80),
  role: z.enum(['admin', 'verifier', 'user']),
  provinces: z.string().optional(), // CSV of province codes for verifiers
  notes: z.string().max(500).optional(),
})
type FormData = z.infer<typeof schema>

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

const inputClass = 'w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500'

export default function NewUserPage() {
  const { authUser } = useAuth()
  const router = useRouter()
  const qc = useQueryClient()
  const token = authUser?.token ?? ''

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'user' },
  })

  const role = watch('role')

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      adminUsers.create(token, {
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        notes: data.notes,
        verificationScope: data.role === 'verifier' && data.provinces
          ? { provinces: data.provinces.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) }
          : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      router.push('/users')
    },
  })

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold text-white mb-6">New User</h1>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Field label="Email" error={errors.email?.message}>
          <input type="email" {...register('email')} placeholder="juan@uplb.edu.ph" className={inputClass} />
        </Field>
        <Field label="Display Name" error={errors.displayName?.message}>
          <input type="text" {...register('displayName')} placeholder="Juan Dela Cruz" className={inputClass} />
        </Field>
        <Field label="Role" error={errors.role?.message}>
          <select {...register('role')} className={inputClass}>
            <option value="user">User (field surveyor)</option>
            <option value="verifier">Verifier</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        {role === 'verifier' && (
          <Field label="Province Scope (CSV)" error={errors.provinces?.message}>
            <input type="text" {...register('provinces')} placeholder="LAG,BAT,CAV" className={inputClass} />
            <p className="mt-1 text-xs text-slate-500">Comma-separated PSGC province codes. Max 50.</p>
          </Field>
        )}
        <Field label="Notes (admin-internal)" error={errors.notes?.message}>
          <textarea {...register('notes')} rows={2} className={inputClass} />
        </Field>

        {mutation.error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
            {String(mutation.error)}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting || mutation.isPending}
            className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm disabled:opacity-50">
            Create User
          </button>
          <button type="button" onClick={() => router.back()} className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
