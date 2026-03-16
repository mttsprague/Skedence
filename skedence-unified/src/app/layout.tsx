import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/hooks/useAuth';
import { GoogleTagManager, GoogleTagManagerNoScript } from '@/components/analytics/GoogleTagManager';
import { ToastProvider } from '@/components/ui/toast-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PWAProvider } from '@/components/pwa-provider';
import CrispChat from '@/components/crisp-chat';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "Skedence - Coaching Business Management Software",
  description: "Transform your coaching business with Skedence. Schedule sessions, sell lesson packages, manage clients, and get paid online. Built for coaches, trainers, and instructors.",
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.ico', type: 'image/x-icon' }
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Skedence',
  },
  openGraph: {
    title: 'Skedence - Coaching Business Management Software',
    description: 'Transform your coaching business with Skedence. Schedule sessions, sell lesson packages, manage clients, and get paid online.',
    url: 'https://skedence.com',
    siteName: 'Skedence',
    images: [
      {
        url: 'https://skedence.com/og-image.png',
        width: 1024,
        height: 1024,
        alt: 'Skedence - Coaching Business Management',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Skedence - Coaching Business Management Software',
    description: 'Transform your coaching business with Skedence. Schedule sessions, sell lesson packages, and get paid online.',
    images: ['https://skedence.com/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <GoogleTagManager />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <GoogleTagManagerNoScript />
        <PWAProvider />
        <AuthProvider>
          <TooltipProvider delayDuration={300}>
            {children}
            <ToastProvider />
          </TooltipProvider>
        </AuthProvider>
        
        {/* Crisp Chat Widget - Only on marketing/support pages */}
        <CrispChat />
      </body>
    </html>
  );
}
