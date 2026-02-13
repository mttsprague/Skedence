'use client';

import { useState, useEffect } from 'react';
import { NotificationsSubmenu } from '@/components/admin/notifications-submenu';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, FileText } from 'lucide-react';
import { EmailTemplateEditor } from '@/components/admin/email-template-editor';

interface EmailNotificationSettings {
  // Confirmations
  bookingConfirmation: boolean;
  cancellationConfirmation: boolean;
  rescheduleConfirmation: boolean;
  
  // Other emails
  reminders: boolean;
  reminderTiming: number; // hours before appointment
  followUps: boolean;
  followUpTiming: number; // hours after appointment
  packageReceipt: boolean;
}

const defaultSettings: EmailNotificationSettings = {
  bookingConfirmation: true,
  cancellationConfirmation: true,
  rescheduleConfirmation: true,
  reminders: true,
  reminderTiming: 24, // 24 hours before
  followUps: true,
  followUpTiming: 24, // 24 hours after
  packageReceipt: true,
};

export default function ClientEmailsPage() {
  const { orgId } = useAuth();
  const [settings, setSettings] = useState<EmailNotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{ type: string; name: string } | null>(null);

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

  const updateTimingSetting = async (key: keyof EmailNotificationSettings, value: number) => {
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
      console.error('Error updating timing setting:', error);
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
          <h1 className="text-3xl font-bold text-foreground">Client Emails</h1>
          {saving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
        </div>

        <p className="text-foreground/80 mb-8">
          Control which email notifications are sent to your clients and customize the email templates
        </p>

        {/* Confirmations Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Confirmations</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            <EmailToggleRow
              title="Booking Confirmation"
              description="All appointments, classes"
              enabled={settings.bookingConfirmation}
              onChange={(value) => updateSetting('bookingConfirmation', value)}
              onEditTemplate={() => setEditingTemplate({ type: 'bookingConfirmation', name: 'Booking Confirmation' })}
            />
            <EmailToggleRow
              title="Cancellation Confirmation"
              description="All appointments, classes"
              enabled={settings.cancellationConfirmation}
              onChange={(value) => updateSetting('cancellationConfirmation', value)}
              onEditTemplate={() => setEditingTemplate({ type: 'cancellationConfirmation', name: 'Cancellation Confirmation' })}
            />
            <EmailToggleRow
              title="Reschedule Confirmation"
              description="All appointments, classes"
              enabled={settings.rescheduleConfirmation}
              onChange={(value) => updateSetting('rescheduleConfirmation', value)}
              onEditTemplate={() => setEditingTemplate({ type: 'rescheduleConfirmation', name: 'Reschedule Confirmation' })}
            />
          </div>
        </div>

        {/* Other Client Emails Section */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Other Client Emails</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            <EmailToggleRowWithTiming
              title="Reminders"
              description="Appointment reminders sent before scheduled time"
              enabled={settings.reminders}
              timing={settings.reminderTiming}
              timingLabel="Send"
              timingOptions={[
                { value: 1, label: '1 hour before' },
                { value: 2, label: '2 hours before' },
                { value: 4, label: '4 hours before' },
                { value: 12, label: '12 hours before' },
                { value: 24, label: '24 hours before' },
                { value: 48, label: '48 hours before' },
              ]}
              onToggle={(value) => updateSetting('reminders', value)}
              onTimingChange={(value) => updateTimingSetting('reminderTiming', value)}
              onEditTemplate={() => setEditingTemplate({ type: 'reminders', name: 'Reminder Email' })}
            />
            <EmailToggleRowWithTiming
              title="Follow-ups"
              description="Follow-up emails sent after appointments"
              enabled={settings.followUps}
              timing={settings.followUpTiming}
              timingLabel="Send"
              timingOptions={[
                { value: 1, label: '1 hour after' },
                { value: 2, label: '2 hours after' },
                { value: 4, label: '4 hours after' },
                { value: 12, label: '12 hours after' },
                { value: 24, label: '24 hours after' },
                { value: 48, label: '48 hours after' },
              ]}
              onToggle={(value) => updateSetting('followUps', value)}
              onTimingChange={(value) => updateTimingSetting('followUpTiming', value)}
              onEditTemplate={() => setEditingTemplate({ type: 'followUps', name: 'Follow-up Email' })}
            />
            <EmailToggleRow
              title="Package / Gift Certificate Receipt"
              description="Receipt for package or gift certificate purchases"
              enabled={settings.packageReceipt}
              onChange={(value) => updateSetting('packageReceipt', value)}
              onEditTemplate={() => setEditingTemplate({ type: 'packageReceipt', name: 'Package Receipt' })}
            />
          </div>
        </div>

        {/* Email Template Editor Modal */}
        {editingTemplate && orgId && (
          <EmailTemplateEditor
            orgId={orgId}
            templateType={editingTemplate.type}
            templateName={editingTemplate.name}
            onClose={() => setEditingTemplate(null)}
          />
        )}
      </div>
    </NotificationsSubmenu>
  );
}

interface EmailToggleRowProps {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  onEditTemplate: () => void;
}

function EmailToggleRow({ title, description, enabled, onChange, onEditTemplate }: EmailToggleRowProps) {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-background transition-colors">
      <div className="flex-1">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={onEditTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
        >
          <FileText className="h-3.5 w-3.5" />
          Edit Template
        </button>
        
        <span className={`text-xs font-medium px-2 py-1 rounded ${
          enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-foreground/80'
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

interface EmailToggleRowWithTimingProps {
  title: string;
  description: string;
  enabled: boolean;
  timing: number;
  timingLabel: string;
  timingOptions: { value: number; label: string }[];
  onToggle: (value: boolean) => void;
  onTimingChange: (value: number) => void;
  onEditTemplate: () => void;
}

function EmailToggleRowWithTiming({ 
  title, 
  description, 
  enabled, 
  timing, 
  timingLabel, 
  timingOptions, 
  onToggle, 
  onTimingChange,
  onEditTemplate
}: EmailToggleRowWithTimingProps) {
  return (
    <div className="p-4 hover:bg-background transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onEditTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
          >
            <FileText className="h-3.5 w-3.5" />
            Edit Template
          </button>
          
          <span className={`text-xs font-medium px-2 py-1 rounded ${
            enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-foreground/80'
          }`}>
            {enabled ? 'On' : 'Off'}
          </span>
          
          <button
            onClick={() => onToggle(!enabled)}
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
      
      {enabled && (
        <div className="flex items-center gap-2 pl-0">
          <span className="text-sm text-foreground/80">{timingLabel}:</span>
          <select
            value={timing}
            onChange={(e) => onTimingChange(Number(e.target.value))}
            className="text-sm border border-input rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            {timingOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
