'use client';

import { DashboardLayout } from '@/components/dashboard-layout';

export default function SchedulePage() {
  return (
    <DashboardLayout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
        <p className="text-gray-600 mt-2">View and manage all bookings</p>
        <div className="mt-8 p-8 bg-white rounded-lg border text-center">
          <p className="text-gray-500">Schedule view coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
