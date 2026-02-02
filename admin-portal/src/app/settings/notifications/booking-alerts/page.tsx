'use client';

import { useState, useEffect } from 'react';
import { NotificationsSubmenu } from '@/components/notifications-submenu';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

interface BookingAlertSettings {
  sendAppointmentNotifications: boolean;
  sendSummaryEmails: boolean;
  summaryFrequency: 'weekly' | 'daily';
  summaryTime: string; // HH:mm format (24-hour)
  timezone: string;
}

const defaultSettings: BookingAlertSettings = {
  sendAppointmentNotifications: true,
  sendSummaryEmails: false,
  summaryFrequency: 'weekly',
  summaryTime: '19:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export default function BookingAlertsPage() {
  const { orgId } = useAuth();
  const [settings, setSettings] = useState<BookingAlertSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (orgId) {
      loadSettings(orgId);
    }
  }, [orgId]);

  const loadSettings = async (organizationId: string) => {
    try {
      const settingsDoc = await getDoc(doc(db, 'organizations', organizationId, 'settings', 'bookingAlerts'));
      
      if (settingsDoc.exists()) {
        setSettings({ ...defaultSettings, ...settingsDoc.data() });
      }
    } catch (error) {
      console.error('Error loading booking alert settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async <K extends keyof BookingAlertSettings>(
    key: K,
    value: BookingAlertSettings[K]
  ) => {
    if (!orgId) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'organizations', orgId, 'settings', 'bookingAlerts'),
        newSettings,
        { merge: true }
      );
    } catch (error) {
      console.error('Error updating booking alert setting:', error);
      // Revert on error
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <NotificationsSubmenu>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </NotificationsSubmenu>
    );
  }

  return (
    <NotificationsSubmenu>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Booking Alerts</h1>
            <p className="text-gray-600 mt-2">
              Receive email notifications when appointments or classes are booked
            </p>
          </div>
          {saving && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Send Appointment Notifications */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Send appointment notifications
                </h3>
                <p className="text-sm text-gray-600">
                  Account owner receives email notifications when an appointment is scheduled, cancelled, 
                  or rescheduled, and when a package or subscription is ordered.
                </p>
              </div>
              
              <button
                onClick={() => updateSetting('sendAppointmentNotifications', !settings.sendAppointmentNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-4 ${
                  settings.sendAppointmentNotifications ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.sendAppointmentNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Send Summary Emails */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Send summary emails
                </h3>
                <p className="text-sm text-gray-600">
                  You will receive a summary of upcoming appointments
                </p>
              </div>
              
              <button
                onClick={() => updateSetting('sendSummaryEmails', !settings.sendSummaryEmails)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-4 ${
                  settings.sendSummaryEmails ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.sendSummaryEmails ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {settings.sendSummaryEmails && (
              <div className="space-y-4 mt-6 pt-6 border-t border-gray-200">
                {/* Frequency Selection */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      checked={settings.summaryFrequency === 'weekly'}
                      onChange={() => updateSetting('summaryFrequency', 'weekly')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Weekly</div>
                      <div className="text-sm text-gray-600">
                        Summary of upcoming week sent every Monday morning
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      checked={settings.summaryFrequency === 'daily'}
                      onChange={() => updateSetting('summaryFrequency', 'daily')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Daily</div>
                      <div className="text-sm text-gray-600">
                        Appointment summaries sent each day
                      </div>
                    </div>
                  </label>
                </div>

                {/* Time Selection for Daily */}
                {settings.summaryFrequency === 'daily' && (
                  <div className="mt-4 pl-7">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Send at
                    </label>
                    <input
                      type="time"
                      value={settings.summaryTime}
                      onChange={(e) => updateSetting('summaryTime', e.target.value)}
                      className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Time zone: {settings.timezone}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </NotificationsSubmenu>
  );
}
