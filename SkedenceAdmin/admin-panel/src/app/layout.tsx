import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Skedence Admin Panel',
  description: 'Internal admin panel for managing Skedence organizations',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.ico', type: 'image/x-icon' }
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
