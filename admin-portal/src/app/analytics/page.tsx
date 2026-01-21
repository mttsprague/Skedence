'use client';

import { DashboardLayout } from '@/components/dashboard-layout';

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-2">View insights and performance metrics</p>
        <div className="mt-8 p-8 bg-white rounded-lg border text-center">
          <p className="text-gray-500">Analytics coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
