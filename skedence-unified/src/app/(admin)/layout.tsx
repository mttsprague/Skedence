'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { DashboardLayout } from '@/components/admin/dashboard-layout';
import { ErrorBoundary } from '@/components/error-boundary';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !userData) {
      // Store the intended destination to redirect back after login
      sessionStorage.setItem('redirectAfterLogin', pathname);
      router.push('/login');
    }
  }, [userData, loading, router, pathname]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if redirecting to login
  if (!userData) {
    return null;
  }

  return (
    <ErrorBoundary componentName="Admin Portal">
      <DashboardLayout>{children}</DashboardLayout>
    </ErrorBoundary>
  );
}
