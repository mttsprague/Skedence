import { DashboardLayout } from '@/components/admin/dashboard-layout';
import { ErrorBoundary } from '@/components/error-boundary';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary componentName="Admin Portal">
      <DashboardLayout>{children}</DashboardLayout>
    </ErrorBoundary>
  );
}
