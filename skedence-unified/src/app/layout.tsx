import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from '@/hooks/useAuth';
import { GoogleTagManager, GoogleTagManagerNoScript } from '@/components/analytics/GoogleTagManager';
import { ToastProvider } from '@/components/ui/toast-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PWAProvider } from '@/components/pwa-provider';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

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
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
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
        
        {/* Crisp Chat Widget */}
        <Script
          id="crisp-chat"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.$crisp=[];
              window.CRISP_WEBSITE_ID="61108fde-6e52-4e72-b95d-8e259698df87";
              (function(){
                d=document;
                s=d.createElement("script");
                s.src="https://client.crisp.chat/l.js";
                s.async=1;
                d.getElementsByTagName("head")[0].appendChild(s);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
