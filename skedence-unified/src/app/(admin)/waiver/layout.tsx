import { BusinessSettingsSubmenu } from '@/components/admin/business-settings-submenu';
import { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata = {
  title: 'Waiver Settings | Skedence Admin',
  description: 'Configure waiver requirements',
};

export default function WaiverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BusinessSettingsSubmenu>{children}</BusinessSettingsSubmenu>;
}
