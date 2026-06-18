'use client'

import { useEffect, useState } from 'react'

async function enableMocking() {
  if (process.env.NEXT_PUBLIC_MOCK_API !== 'true') return
  const { worker } = await import('@/mocks/browser')
  return worker.start({
    onUnhandledRequest: 'bypass', // pass unmatched requests to the real network
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })
}

export function MSWProvider({ children }: { children: React.ReactNode }) {
  // If mocking is off, render immediately with no wait
  const mockEnabled = process.env.NEXT_PUBLIC_MOCK_API === 'true'
  const [ready, setReady] = useState(!mockEnabled)

  useEffect(() => {
    if (!mockEnabled) return
    enableMocking()
      .then(() => setReady(true))
      .catch((err) => {
        console.warn('MSW failed to start:', err)
        setReady(true)
      })
  }, [mockEnabled])

  // Blank screen while worker registers — typically <200ms
  if (!ready) return null

  return <>{children}</>
}
