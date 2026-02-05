'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BusinessSettingsSubmenu } from '@/components/admin/business-settings-submenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Clock, Calendar, MapPin } from 'lucide-react';

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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (!orgId) return;

    async function loadSettings() {
      try {
        // Load from organizations/{orgId} document (matches iOS app schema)
        const orgDoc = await getDoc(doc(db, 'organizations', orgId!));
        if (orgDoc.exists()) {
          const data = orgDoc.data();
          // Settings are stored as fields in the organization document
          setSettings({
            minBookingHours: data.minBookingHours || 4,
            minCancellationHours: data.minCancellationHours || 24,
            maxBookingsPerLocation: data.maxBookingsPerLocation || 10,
            defaultSessionLength: data.defaultSessionLength || 60,
            allowSameDayBooking: data.allowSameDayBooking || false,
            requireWaiver: data.requireWaiver !== false,
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [orgId]);

  // Auto-save function with debounce
  const saveSettings = useCallback(async (newSettings: OrgSettings) => {
    if (!orgId) return;

    try {
      // Save to organizations/{orgId} document (matches iOS app schema)
      await setDoc(doc(db, 'organizations', orgId), newSettings, { merge: true });
      setLastSaved(new Date());
      console.log('Settings auto-saved to Firebase');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [orgId]);

  // Update settings and save immediately
  const updateSetting = (updates: Partial<OrgSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  return (
    <BusinessSettingsSubmenu>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Configure your organization preferences</p>
          </div>
          {lastSaved && (
            <div className="text-sm text-gray-500">
              Last saved: {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>

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
                    onChange={(e) => updateSetting({ minBookingHours: parseInt(e.target.value) || 0 })}
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
                    onChange={(e) => updateSetting({ minCancellationHours: parseInt(e.target.value) || 0 })}
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
                      onChange={(e) => updateSetting({ allowSameDayBooking: e.target.checked })}
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
                    onChange={(e) => updateSetting({ defaultSessionLength: parseInt(e.target.value) })}
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
                      onChange={(e) => updateSetting({ requireWaiver: e.target.checked })}
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
                    Max Bookings Per Location (for an individual hour)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.maxBookingsPerLocation}
                    onChange={(e) => updateSetting({ maxBookingsPerLocation: parseInt(e.target.value) || 1 })}
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
    </BusinessSettingsSubmenu>
  );
}
