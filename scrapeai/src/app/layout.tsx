import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'ScrapeAI — Ask AI for any data on the internet.',
  description: 'Collect structured business data from the internet using natural language. Find restaurants, companies, contacts, and more with a single prompt.',
  keywords: ['web scraping', 'data collection', 'AI', 'lead generation', 'business data'],
  openGraph: {
    title: 'ScrapeAI',
    description: 'Ask AI for any data on the internet.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#12121c',
              color: '#e8e8f0',
              border: '1px solid #1e1e2e',
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#00e5ff', secondary: '#06060a' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#06060a' } },
          }}
        />
      </body>
    </html>
  )
}
