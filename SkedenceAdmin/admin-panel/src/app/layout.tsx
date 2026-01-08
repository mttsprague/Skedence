import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Skedence Admin Panel',
  description: 'Internal admin panel for managing Skedence organizations',
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
