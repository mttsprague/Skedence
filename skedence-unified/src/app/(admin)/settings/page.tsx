'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BusinessSettingsSubmenu } from '@/components/admin/business-settings-submenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Clock, Calendar, MapPin, Building2 } from 'lucide-react';

interface OrgProfile {
  phone: string;
  contactEmail: string;
  timezone: string;
  currency: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
}

interface OrgSettings {
  minBookingHours: number;
  minCancellationHours: number;
  maxBookingsPerLocation?: number; // Legacy field - kept for backwards compatibility
  locationLimits?: { [locationId: string]: number }; // New per-location limits
  defaultSessionLength: number;
  allowSameDayBooking: boolean;
  requireWaiver: boolean;
}

interface SimpleLocation {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const { orgId } = useAuth();
  const [settings, setSettings] = useState<OrgSettings>({
    minBookingHours: 4,
    minCancellationHours: 24,
    locationLimits: {},
    defaultSessionLength: 60,
    allowSameDayBooking: false,
    requireWaiver: false,
  });
  const [locations, setLocations] = useState<SimpleLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [profile, setProfile] = useState<OrgProfile>({
    phone: '',
    contactEmail: '',
    timezone: 'America/New_York',
    currency: 'USD',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
  });

  // Fields map to Firestore: contactPhone, settings.timezone, settings.currency, addressLine1/2, city, state, zipCode, contactEmail

  useEffect(() => {
    if (!orgId) return;

    async function loadSettings() {
      try {
        // Load from organizations/{orgId} document (matches iOS app schema)
        const orgDoc = await getDoc(doc(db, 'organizations', orgId!));
        if (orgDoc.exists()) {
          const data = orgDoc.data();
          
          // Migrate old format to new format if needed
          let locationLimits = data.locationLimits || {};
          if (data.maxBookingsPerLocation && !data.locationLimits) {
            // Migration: if old format exists, apply it to all locations
            const locationsQuery = query(
              collection(db, 'locations'),
              where('orgId', '==', orgId),
              where('isActive', '==', true)
            );
            const locationsSnap = await getDocs(locationsQuery);
            locationLimits = {};
            locationsSnap.forEach(doc => {
              locationLimits[doc.id] = data.maxBookingsPerLocation;
            });
          }
          
          // Settings are stored as fields in the organization document
          setSettings({
            minBookingHours: data.minBookingHours || 4,
            minCancellationHours: data.minCancellationHours || 24,
            locationLimits: locationLimits,
            defaultSessionLength: data.defaultSessionLength || 60,
            allowSameDayBooking: data.allowSameDayBooking || false,
            requireWaiver: data.requireWaiver === true,
          });

          setProfile({
            phone: data.contactPhone || '',
            contactEmail: data.contactEmail || '',
            timezone: data.settings?.timezone || 'America/New_York',
            currency: data.settings?.currency || 'USD',
            addressLine1: data.addressLine1 || '',
            addressLine2: data.addressLine2 || '',
            city: data.city || '',
            state: data.state || '',
            zipCode: data.zipCode || '',
          });
        }
        
        // Load locations
        const locationsQuery = query(
          collection(db, 'locations'),
          where('orgId', '==', orgId),
          where('isActive', '==', true)
        );
        const locationsSnap = await getDocs(locationsQuery);
        const locsData = locationsSnap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name as string
        }));
        setLocations(locsData);
        if (locsData.length > 0 && !selectedLocationId) {
          setSelectedLocationId(locsData[0].id);
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

  const saveProfile = async () => {
    if (!orgId) return;
    setProfileSaving(true);
    try {
      // Save using exact Firestore field names matching the Cloud Function schema:
      // contactPhone (top-level), settings.timezone, settings.currency (nested)
      await setDoc(doc(db, 'organizations', orgId), {
        contactPhone: profile.phone,
        contactEmail: profile.contactEmail,
        settings: {
          timezone: profile.timezone,
          currency: profile.currency,
        },
        addressLine1: profile.addressLine1,
        addressLine2: profile.addressLine2,
        city: profile.city,
        state: profile.state,
        zipCode: profile.zipCode,
      }, { merge: true });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <BusinessSettingsSubmenu>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-foreground/80 mt-2">Configure your organization preferences</p>
          </div>
          {lastSaved && (
            <div className="text-sm text-muted-foreground">
              Last saved: {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Organization Profile */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Organization Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Business Phone
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={profile.contactEmail}
                      onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                      placeholder="contact@yourbusiness.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Timezone
                    </label>
                    <select
                      value={profile.timezone}
                      onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                      className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    >
                      <option value="America/New_York">Eastern (ET)</option>
                      <option value="America/Chicago">Central (CT)</option>
                      <option value="America/Denver">Mountain (MT)</option>
                      <option value="America/Los_Angeles">Pacific (PT)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Currency
                    </label>
                    <select
                      value={profile.currency}
                      onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
                      className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={profile.addressLine1}
                    onChange={(e) => setProfile({ ...profile, addressLine1: e.target.value })}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Address Line 2 <span className="text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={profile.addressLine2}
                    onChange={(e) => setProfile({ ...profile, addressLine2: e.target.value })}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    placeholder="Suite 100"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">City</label>
                    <input
                      type="text"
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">State</label>
                    <input
                      type="text"
                      value={profile.state}
                      onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                      placeholder="NY"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">ZIP Code</label>
                    <input
                      type="text"
                      value={profile.zipCode}
                      onChange={(e) => setProfile({ ...profile, zipCode: e.target.value })}
                      className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                      placeholder="10001"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={saveProfile}
                    disabled={profileSaving}
                    className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {profileSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                  {profileSaved && (
                    <span className="text-sm text-green-600 font-medium">✓ Saved</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Booking Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Booking Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Minimum Booking Notice (hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.minBookingHours}
                    onChange={(e) => updateSetting({ minBookingHours: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Clients must book at least this many hours in advance (0 = allow immediate booking)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Minimum Cancellation Notice (hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.minCancellationHours}
                    onChange={(e) => updateSetting({ minCancellationHours: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Clients must cancel at least this many hours before the session
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allowSameDayBooking}
                      onChange={(e) => updateSetting({ allowSameDayBooking: e.target.checked })}
                      className="w-5 h-5 text-primary border-input rounded focus:ring-ring"
                    />
                    <span className="text-sm font-medium text-foreground">Allow Same-Day Booking</span>
                  </label>
                  <p className="text-sm text-muted-foreground mt-1 ml-8">
                    Override minimum booking notice for urgent bookings
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Session Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Session Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Default Session Length (minutes)
                  </label>
                  <select
                    value={settings.defaultSessionLength}
                    onChange={(e) => updateSetting({ defaultSessionLength: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>120 minutes</option>
                  </select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Default duration for new training sessions
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.requireWaiver}
                      onChange={(e) => updateSetting({ requireWaiver: e.target.checked })}
                      className="w-5 h-5 text-primary border-input rounded focus:ring-ring"
                    />
                    <span className="text-sm font-medium text-foreground">Require Waiver Agreement</span>
                  </label>
                  <p className="text-sm text-muted-foreground mt-1 ml-8">
                    When enabled, clients must agree to waiver after their first booking
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Location Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Location Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {locations.length === 0 ? (
                  <div className="text-center py-6">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No locations configured. Add locations in the Locations page to set booking limits.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Select Location
                      </label>
                      <select
                        value={selectedLocationId}
                        onChange={(e) => setSelectedLocationId(e.target.value)}
                        className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                      >
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {selectedLocationId && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Max Bookings Per Hour at {locations.find(l => l.id === selectedLocationId)?.name}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={settings.locationLimits?.[selectedLocationId] || 10}
                          onChange={(e) => {
                            const newLimits = { ...settings.locationLimits, [selectedLocationId]: parseInt(e.target.value) || 1 };
                            updateSetting({ locationLimits: newLimits });
                          }}
                          className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Maximum simultaneous bookings at this location during the same hour
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </BusinessSettingsSubmenu>
  );
}
