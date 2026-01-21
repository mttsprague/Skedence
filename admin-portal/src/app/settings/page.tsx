'use client';

import { DashboardLayout } from '@/components/dashboard-layout';

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Configure your organization preferences</p>
        <div className="mt-8 p-8 bg-white rounded-lg border text-center">
          <p className="text-gray-500">Settings coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
