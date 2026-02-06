'use client';

import { useState, useEffect } from 'react';
import { NotificationsSubmenu } from '@/components/notifications-submenu';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

interface EmailNotificationSettings {
  // Confirmations
  bookingConfirmation: boolean;
  cancellationConfirmation: boolean;
  rescheduleConfirmation: boolean;
  
  // Other emails
  reminders: boolean;
  followUps: boolean;
  packageReceipt: boolean;
}

const defaultSettings: EmailNotificationSettings = {
  bookingConfirmation: true,
  cancellationConfirmation: true,
  rescheduleConfirmation: true,
  reminders: true,
  followUps: true,
  packageReceipt: true,
};

export default function ClientEmailsPage() {
  const { orgId } = useAuth();
  const [settings, setSettings] = useState<EmailNotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (orgId) {
      loadSettings(orgId);
    }
  }, [orgId]);

  const loadSettings = async (organizationId: string) => {
    try {
      const settingsDoc = await getDoc(doc(db, 'organizations', organizationId, 'settings', 'emailNotifications'));
      
      if (settingsDoc.exists()) {
        setSettings({ ...defaultSettings, ...settingsDoc.data() });
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof EmailNotificationSettings, value: boolean) => {
    if (!orgId) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'organizations', orgId, 'settings', 'emailNotifications'),
        newSettings,
        { merge: true }
      );
    } catch (error) {
      console.error('Error updating email setting:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">Client Emails</h1>
          {saving && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
        </div>

        <p className="text-gray-600 mb-8">
          Control which email notifications are sent to your clients
        </p>

        {/* Confirmations Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Confirmations</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            <EmailToggleRow
              title="Booking Confirmation"
              description="All appointments, classes"
              enabled={settings.bookingConfirmation}
              onChange={(value) => updateSetting('bookingConfirmation', value)}
            />
            <EmailToggleRow
              title="Cancellation Confirmation"
              description="All appointments, classes"
              enabled={settings.cancellationConfirmation}
              onChange={(value) => updateSetting('cancellationConfirmation', value)}
            />
            <EmailToggleRow
              title="Reschedule Confirmation"
              description="All appointments, classes"
              enabled={settings.rescheduleConfirmation}
              onChange={(value) => updateSetting('rescheduleConfirmation', value)}
            />
          </div>
        </div>

        {/* Other Client Emails Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Other Client Emails</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            <EmailToggleRow
              title="Reminders"
              description="Appointment reminders sent before scheduled time"
              enabled={settings.reminders}
              onChange={(value) => updateSetting('reminders', value)}
            />
            <EmailToggleRow
              title="Follow-ups"
              description="Follow-up emails sent after appointments"
              enabled={settings.followUps}
              onChange={(value) => updateSetting('followUps', value)}
            />
            <EmailToggleRow
              title="Package / Gift Certificate Receipt"
              description="Receipt for package or gift certificate purchases"
              enabled={settings.packageReceipt}
              onChange={(value) => updateSetting('packageReceipt', value)}
            />
          </div>
        </div>
      </div>
    </NotificationsSubmenu>
  );
}

interface EmailToggleRowProps {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}

function EmailToggleRow({ title, description, enabled, onChange }: EmailToggleRowProps) {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      
      <div className="flex items-center gap-3">
        <span className={`text-xs font-medium px-2 py-1 rounded ${
          enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}>
          {enabled ? 'On' : 'Off'}
        </span>
        
        <button
          onClick={() => onChange(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            enabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
