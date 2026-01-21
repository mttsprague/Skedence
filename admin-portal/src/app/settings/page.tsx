'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Save, Settings as SettingsIcon, Clock, Calendar, MapPin, Users } from 'lucide-react';

interface OrgSettings {
  minBookingHours: number;
  minCancellationHours: number;
  maxBookingsPerLocation: number;
  defaultSessionLength: number;
  allowSameDayBooking: boolean;
  requireWaiver: boolean;
}

export default function SettingsPage() {
  const { orgId } = useAuth();
  const [settings, setSettings] = useState<OrgSettings>({
    minBookingHours: 4,
    minCancellationHours: 24,
    maxBookingsPerLocation: 10,
    defaultSessionLength: 60,
    allowSameDayBooking: false,
    requireWaiver: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (!orgId) return;

    async function loadSettings() {
      try {
        const settingsDoc = await getDoc(doc(db, 'organizations', orgId!, 'settings', orgId!));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as OrgSettings);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [orgId]);

  const handleSave = async () => {
    if (!orgId) return;

    setSaving(true);
    setSaveMessage('');

    try {
      await setDoc(doc(db, 'organizations', orgId, 'settings', orgId), settings, { merge: true });
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Configure your organization preferences</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[#3258A3] text-white rounded-lg hover:bg-[#2A4A8C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Changes
              </>
            )}
          </button>
        </div>

        {saveMessage && (
          <div className={`p-4 rounded-lg ${
            saveMessage.includes('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
          }`}>
            {saveMessage}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#3258A3]" />
                  Booking Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Booking Notice (hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.minBookingHours}
                    onChange={(e) => setSettings({ ...settings, minBookingHours: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Clients must book at least this many hours in advance (0 = allow immediate booking)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Cancellation Notice (hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.minCancellationHours}
                    onChange={(e) => setSettings({ ...settings, minCancellationHours: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Clients must cancel at least this many hours before the session
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allowSameDayBooking}
                      onChange={(e) => setSettings({ ...settings, allowSameDayBooking: e.target.checked })}
                      className="w-5 h-5 text-[#3258A3] border-gray-300 rounded focus:ring-[#3258A3]"
                    />
                    <span className="text-sm font-medium text-gray-700">Allow Same-Day Booking</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1 ml-8">
                    Override minimum booking notice for urgent bookings
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Session Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#3258A3]" />
                  Session Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Session Length (minutes)
                  </label>
                  <select
                    value={settings.defaultSessionLength}
                    onChange={(e) => setSettings({ ...settings, defaultSessionLength: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>120 minutes</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Default duration for new training sessions
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.requireWaiver}
                      onChange={(e) => setSettings({ ...settings, requireWaiver: e.target.checked })}
                      className="w-5 h-5 text-[#3258A3] border-gray-300 rounded focus:ring-[#3258A3]"
                    />
                    <span className="text-sm font-medium text-gray-700">Require Waiver Agreement</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1 ml-8">
                    Clients must agree to waiver before first booking
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Location Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#3258A3]" />
                  Location Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Bookings Per Location (per time slot)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.maxBookingsPerLocation}
                    onChange={(e) => setSettings({ ...settings, maxBookingsPerLocation: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3] focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Maximum simultaneous bookings at the same location
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
