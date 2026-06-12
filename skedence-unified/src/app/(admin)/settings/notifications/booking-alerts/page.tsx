'use client';

import { useState, useEffect } from 'react';
import { NotificationsSubmenu } from '@/components/admin/notifications-submenu';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface BookingAlertSettings {
  sendAppointmentNotifications: boolean;
  sendLessonBookingNotifications: boolean;
  sendLessonCancellationNotifications: boolean;
  sendPackagePurchaseNotifications: boolean;
  sendClassRegistrationNotifications: boolean;
  sendClassCancellationNotifications: boolean;
  sendNewClientRegistrationNotifications: boolean;
  sendSummaryEmails: boolean;
  summaryFrequency: 'weekly' | 'daily';
  summaryTime: string; // HH:mm format (24-hour)
  timezone: string;
}

const defaultSettings: BookingAlertSettings = {
  sendAppointmentNotifications: true,
  sendLessonBookingNotifications: true,
  sendLessonCancellationNotifications: true,
  sendPackagePurchaseNotifications: true,
  sendClassRegistrationNotifications: true,
  sendClassCancellationNotifications: true,
  sendNewClientRegistrationNotifications: true,
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
        <div className="max-w-4xl space-y-6">
          <div>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96 mt-2" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-96" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </NotificationsSubmenu>
    );
  }

  return (
    <NotificationsSubmenu>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Booking Alerts</h1>
            <p className="text-foreground/80 mt-2">
              Receive email notifications when appointments or classes are booked
            </p>
          </div>
          {saving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Send appointment notifications
                </h3>
                <p className="text-sm text-foreground/80">
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

            {/* Individual Notification Toggles - Only shown when master toggle is ON */}
            {settings.sendAppointmentNotifications && (
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                <p className="text-sm font-medium text-foreground/80 mb-4">
                  Choose which notifications you want to receive:
                </p>

                {/* Lesson Booking Notifications */}
                <div className="flex items-start justify-between pl-4 py-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Lesson booking notifications</div>
                    <p className="text-sm text-foreground/70 mt-1">
                      Get notified when a client books a 1-on-1 lesson
                    </p>
                  </div>
                  <button
                    onClick={() => updateSetting('sendLessonBookingNotifications', !settings.sendLessonBookingNotifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-4 ${
                      settings.sendLessonBookingNotifications ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.sendLessonBookingNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Lesson Cancellation Notifications */}
                <div className="flex items-start justify-between pl-4 py-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Lesson cancellation notifications</div>
                    <p className="text-sm text-foreground/70 mt-1">
                      Get notified when a client cancels a 1-on-1 lesson
                    </p>
                  </div>
                  <button
                    onClick={() => updateSetting('sendLessonCancellationNotifications', !settings.sendLessonCancellationNotifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-4 ${
                      settings.sendLessonCancellationNotifications ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.sendLessonCancellationNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Class Registration Notifications */}
                <div className="flex items-start justify-between pl-4 py-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Class registration notifications</div>
                    <p className="text-sm text-foreground/70 mt-1">
                      Get notified when a client registers for a group class
                    </p>
                  </div>
                  <button
                    onClick={() => updateSetting('sendClassRegistrationNotifications', !settings.sendClassRegistrationNotifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-4 ${
                      settings.sendClassRegistrationNotifications ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.sendClassRegistrationNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Class Cancellation Notifications */}
                <div className="flex items-start justify-between pl-4 py-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Class cancellation notifications</div>
                    <p className="text-sm text-foreground/70 mt-1">
                      Get notified when a client cancels a group class registration
                    </p>
                  </div>
                  <button
                    onClick={() => updateSetting('sendClassCancellationNotifications', !settings.sendClassCancellationNotifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-4 ${
                      settings.sendClassCancellationNotifications ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.sendClassCancellationNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Package Purchase Notifications */}
                <div className="flex items-start justify-between pl-4 py-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Package purchase notifications</div>
                    <p className="text-sm text-foreground/70 mt-1">
                      Get notified when a client purchases a lesson package
                    </p>
                  </div>
                  <button
                    onClick={() => updateSetting('sendPackagePurchaseNotifications', !settings.sendPackagePurchaseNotifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-4 ${
                      settings.sendPackagePurchaseNotifications ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.sendPackagePurchaseNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* New Client Registration Notifications */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  New client registration alerts
                </h3>
                <p className="text-sm text-foreground/80">
                  Receive an email when a new client registers and joins your organization.
                </p>
              </div>
              <button
                onClick={() => updateSetting('sendNewClientRegistrationNotifications', !settings.sendNewClientRegistrationNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-4 ${
                  settings.sendNewClientRegistrationNotifications ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.sendNewClientRegistrationNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Send Summary Emails */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Send summary emails
                </h3>
                <p className="text-sm text-foreground/80">
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
                      <div className="font-medium text-foreground">Weekly</div>
                      <div className="text-sm text-foreground/80">
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
                      <div className="font-medium text-foreground">Daily</div>
                      <div className="text-sm text-foreground/80">
                        Appointment summaries sent each day
                      </div>
                    </div>
                  </label>
                </div>

                {/* Time Selection for Daily */}
                {settings.summaryFrequency === 'daily' && (
                  <div className="mt-4 pl-7">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Send at
                    </label>
                    <input
                      type="time"
                      value={settings.summaryTime}
                      onChange={(e) => updateSetting('summaryTime', e.target.value)}
                      className="block w-full max-w-xs px-3 py-2 border border-input rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
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
