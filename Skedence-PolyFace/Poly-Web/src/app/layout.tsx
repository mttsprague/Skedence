import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'PolyFace Volleyball Academy',
  description: 'Elite volleyball training in the Chattanooga area. Private lessons, group classes, and more for athletes of all levels.',
  metadataBase: new URL('https://www.polyfacevolleyball.com'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'PolyFace Volleyball Academy',
    description: 'Elite volleyball training in the Chattanooga area. Private lessons, group classes, and more.',
    url: 'https://www.polyfacevolleyball.com',
    siteName: 'PolyFace Volleyball Academy',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/polyface-logo-512.png',
        width: 512,
        height: 512,
        alt: 'PolyFace Volleyball Academy',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'PolyFace Volleyball Academy',
    description: 'Elite volleyball training in the Chattanooga area.',
    images: ['/polyface-logo-512.png'],
  },
  other: {
    'theme-color': '#1a2d5a',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
