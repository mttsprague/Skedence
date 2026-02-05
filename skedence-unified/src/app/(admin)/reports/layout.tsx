import { ReportsSubmenu } from '@/components/admin/reports-submenu';

export const metadata = {
  title: 'Reports | Skedence Admin',
  description: 'Business reports and analytics',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReportsSubmenu>{children}</ReportsSubmenu>;
}
