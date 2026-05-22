import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { MSWProvider } from '@/components/MSWProvider'
import { ThemeProvider } from '@/lib/theme-context'

export const metadata: Metadata = {
  title: 'Britemap Dashboard',
  description: 'Bamboo survey management and verification console',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <MSWProvider>
          <ThemeProvider>
            <Providers>{children}</Providers>
          </ThemeProvider>
        </MSWProvider>
      </body>
    </html>
  )
}
