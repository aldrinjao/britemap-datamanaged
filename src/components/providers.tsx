'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { AuthProvider } from '@/lib/auth-context'

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session; stable across re-renders
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: (failureCount, error: unknown) => {
              // Don't retry auth errors
              if (error instanceof Error && 'status' in error) {
                const status = (error as { status: number }).status
                if (status === 401 || status === 403) return false
              }
              return failureCount < 2
            },
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
