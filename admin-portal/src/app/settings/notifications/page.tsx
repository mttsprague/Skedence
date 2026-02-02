'use client';

import { NotificationsSubmenu } from '@/components/notifications-submenu';
import { Bell, BellOff } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <NotificationsSubmenu>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center max-w-md mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <Bell className="h-8 w-8 text-gray-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Notifications
          </h1>
          
          <p className="text-gray-600 mb-6">
            Notification settings and preferences will be available here soon.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <p className="text-sm text-blue-800">
              <strong>Coming Soon:</strong> Configure email notifications, SMS alerts, and push notifications for bookings, cancellations, and system updates.
            </p>
          </div>
        </div>
      </div>
    </NotificationsSubmenu>
  );
}
