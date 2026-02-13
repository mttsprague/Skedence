'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BusinessSettingsSubmenu } from '@/components/admin/business-settings-submenu';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Megaphone, Info, Save, Check, AlertCircle } from 'lucide-react';

interface BillboardSettings {
  enabled: boolean;
  message: string;
}

export default function BillboardPage() {
  const { orgId } = useAuth();
  const [settings, setSettings] = useState<BillboardSettings>({
    enabled: false,
    message: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!orgId) return;

    async function loadSettings() {
      try {
        const orgDoc = await getDoc(doc(db, 'organizations', orgId!));
        if (orgDoc.exists()) {
          const data = orgDoc.data();
          setSettings({
            enabled: data.billboardEnabled || false,
            message: data.billboardMessage || '',
          });
        }
      } catch (error) {
        console.error('Error loading billboard settings:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [orgId]);

  const handleSave = async () => {
    if (!orgId) return;

    setSaving(true);
    setSaveStatus('idle');

    try {
      await setDoc(
        doc(db, 'organizations', orgId),
        {
          billboardEnabled: settings.enabled,
          billboardMessage: settings.message,
        },
        { merge: true }
      );
      setSaveStatus('success');
      setHasChanges(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving billboard settings:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (updates: Partial<BillboardSettings>) => {
    setSettings({ ...settings, ...updates });
    setHasChanges(true);
    setSaveStatus('idle');
  };

  return (
    <BusinessSettingsSubmenu>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Megaphone className="h-8 w-8 text-primary" />
              Billboard
            </h1>
            <p className="text-foreground/80 mt-2">Display announcements on the client app home screen</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900">
            The Billboard appears between the Getting Started section and Upcoming Classes on your clients' home screen. 
            Use it to share important updates, announcements, or promotional messages.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Billboard Settings</CardTitle>
              <CardDescription>
                Control what your clients see on their home screen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Toggle */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => updateSetting({ enabled: e.target.checked })}
                    className="w-5 h-5 text-primary border-input rounded focus:ring-ring"
                  />
                  <span className="text-sm font-medium text-foreground">Display Billboard to Clients</span>
                </label>
                <p className="text-sm text-muted-foreground mt-2 ml-8">
                  When enabled, your message will appear prominently on the home screen
                </p>
              </div>

              {/* Message Input */}
              <div>
                <label htmlFor="billboard-message" className="block text-sm font-medium text-foreground mb-2">
                  Billboard Message
                </label>
                <textarea
                  id="billboard-message"
                  value={settings.message}
                  onChange={(e) => updateSetting({ message: e.target.value })}
                  placeholder="Enter your announcement here... (e.g., 'Holiday Hours: Closed Dec 24-26. Happy Holidays!')"
                  rows={6}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-muted-foreground">
                    Keep it concise and actionable for best engagement
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {settings.message.length} / 500
                  </p>
                </div>
              </div>

              {/* Preview */}
              {settings.enabled && settings.message && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Preview
                  </label>
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-l-4 border-primary rounded-lg p-4">
                    <div className="flex gap-3">
                      <Megaphone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-sm mb-1">Announcement</h3>
                        <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                          {settings.message}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This is how your message will appear to clients
                  </p>
                </div>
              )}

              {/* Save Button */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors ${
                    hasChanges && !saving
                      ? 'bg-primary text-white hover:bg-primary/90'
                      : 'bg-gray-200 text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : saveStatus === 'success' ? (
                    <>
                      <Check className="h-4 w-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>

                {saveStatus === 'success' && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <Check className="h-4 w-4" />
                    <span>Billboard updated successfully</span>
                  </div>
                )}

                {saveStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>Failed to save. Please try again.</span>
                  </div>
                )}

                {hasChanges && saveStatus === 'idle' && (
                  <span className="text-sm text-muted-foreground">You have unsaved changes</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </BusinessSettingsSubmenu>
  );
}
