'use client'

import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { adminUsers } from '@/lib/api'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import type { Role } from '@/lib/types'

const ROLE_BADGE: Record<Role, string> = {
  admin: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300',
  verifier: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
  user: 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-300',
}

export default function UsersPage() {
  const { authUser } = useAuth()
  const qc = useQueryClient()
  const token = authUser?.token ?? ''
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [deactivateUid, setDeactivateUid] = useState<string | null>(null)

  const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: ({ pageParam }) =>
      adminUsers.list(token, { q: search || undefined, role: roleFilter || undefined, limit: 50, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page?.nextCursor ?? undefined,
    enabled: !!token,
  })

  const deactivateMutation = useMutation({
    mutationFn: (uid: string) => adminUsers.deactivate(token, uid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const items = data?.pages.flatMap((p) => p.items) ?? []
  const userToDeactivate = items.find((u) => u.firebaseUid === deactivateUid)
  const isInitialLoad = isFetching && items.length === 0

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <Link href="/users/new" className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm">
          + New User
        </Link>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 w-64"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="verifier">Verifier</option>
          <option value="user">User</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Name / Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isInitialLoad ? (
              <TableSkeleton cols={4} />
            ) : (
              <>
                {items.map((u) => (
                  <tr key={u.firebaseUid} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.displayName}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={u.isActive ? 'text-emerald-600 dark:text-emerald-400 text-xs' : 'text-slate-400 dark:text-slate-500 text-xs'}>
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <Link href={`/users/${u.firebaseUid}`} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        Edit
                      </Link>
                      {u.isActive && (
                        <button
                          onClick={() => setDeactivateUid(u.firebaseUid)}
                          className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
        {hasNextPage && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
            <button onClick={() => fetchNextPage()} disabled={isFetching} className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50">
              {isFetching ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deactivateUid}
        title="Deactivate user"
        message={`Are you sure you want to deactivate ${userToDeactivate?.displayName ?? 'this user'}? They will lose access immediately.`}
        confirmLabel="Deactivate"
        danger
        onConfirm={() => {
          if (deactivateUid) deactivateMutation.mutate(deactivateUid)
          setDeactivateUid(null)
        }}
        onCancel={() => setDeactivateUid(null)}
      />
    </div>
  )
}
