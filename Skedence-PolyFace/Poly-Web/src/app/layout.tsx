import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Polyface Volleyball Academy',
  description: 'Elite volleyball training and lessons',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
