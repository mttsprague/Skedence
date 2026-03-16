import { ReportsSubmenu } from '@/components/admin/reports-submenu';
import { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata = {
  title: 'Reports | Skedence Admin',
  description: 'Business reports and analytics',
};

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReportsSubmenu>{children}</ReportsSubmenu>;
}
