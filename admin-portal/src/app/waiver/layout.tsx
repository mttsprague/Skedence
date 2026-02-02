import { BusinessSettingsSubmenu } from '@/components/business-settings-submenu';

export const metadata = {
  title: 'Waiver Settings | Skedence Admin',
  description: 'Configure waiver requirements',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function WaiverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BusinessSettingsSubmenu>{children}</BusinessSettingsSubmenu>;
}
