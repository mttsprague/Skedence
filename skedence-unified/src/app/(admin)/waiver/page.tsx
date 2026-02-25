'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FileText, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WaiverSettings {
  requireWaiver: boolean;
  waiverText: string;
}

export default function WaiverPage() {
  const { orgId } = useAuth();
  const [settings, setSettings] = useState<WaiverSettings>({
    requireWaiver: false,
    waiverText: '',
  });
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (!orgId) return;

    async function loadSettings() {
      try {
        const orgDoc = await getDoc(doc(db, 'organizations', orgId!));
        if (orgDoc.exists()) {
          const data = orgDoc.data();
          setSettings({
            requireWaiver: data.requireWaiver === true,
            waiverText: data.waiverText || '',
          });
        }
      } catch (error) {
        console.error('Error loading waiver settings:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [orgId]);

  // Auto-save function
  const saveSettings = useCallback(async (newSettings: WaiverSettings) => {
    if (!orgId) return;

    try {
      await setDoc(doc(db, 'organizations', orgId), newSettings, { merge: true });
      setLastSaved(new Date());
      console.log('Waiver settings auto-saved to Firebase');
    } catch (error) {
      console.error('Error saving waiver settings:', error);
    }
  }, [orgId]);

  // Update settings and save immediately
  const updateSetting = (updates: Partial<WaiverSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-48" />
            </div>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Waiver Settings</h1>
          <p className="text-foreground/80 mt-2">Configure liability waiver requirements for your clients</p>
        </div>
        {lastSaved && (
          <div className="text-sm text-muted-foreground">
            Last saved: {lastSaved.toLocaleTimeString()}
          </div>
        )}
      </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Waiver Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable Waiver Toggle */}
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
                Clients must agree to the waiver after their first booking
              </p>
            </div>

            {/* Waiver Text Area */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Waiver Text
              </label>
              <textarea
                value={settings.waiverText}
                onChange={(e) => updateSetting({ waiverText: e.target.value })}
                placeholder="Enter your liability waiver text here. This will be shown to clients after they book their first session if the waiver requirement is enabled."
                rows={20}
                className="w-full px-4 py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {settings.waiverText.length} characters
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>When enabled, clients will see this waiver after booking their first session</li>
                  <li>They must check an "I Agree" checkbox to continue</li>
                  <li>Their agreement is stored and visible in the Admin app's Documents tab</li>
                  <li>Once agreed, they won't see the waiver again for future bookings</li>
                </ul>
              </div>
            </div>

            {/* Sample Waiver Text */}
            {!settings.waiverText && (
              <div className="bg-background border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-foreground mb-2">Sample Waiver Text:</p>
                <button
                  onClick={() => updateSetting({
                    waiverText: `RELEASE OF LIABILITY AND WAIVER

I acknowledge that I am voluntarily participating in training sessions, lessons, camps, or related activities. I understand that participation involves inherent risks, including but not limited to physical contact, falls, collisions, equipment impacts, overuse injuries, property damage, and serious injury or death.

I knowingly and voluntarily assume all such risks, whether known or unknown, associated with my participation.

I hereby release, waive, and discharge this organization and its owners, coaches, instructors, employees, agents, and representatives from any and all claims, demands, actions, or causes of action arising out of or related to my participation, including claims arising from ordinary negligence.

This release does not apply to acts of gross negligence, recklessness, or intentional misconduct.

I acknowledge that reasonable steps have been taken to provide a safe training environment; however, I understand that accidents and injuries may still occur. I agree to follow all rules, safety instructions, and guidelines provided by staff, and I acknowledge that failure to do so may increase the risk of injury.

MINOR PARTICIPANTS: If the participant is under eighteen (18) years of age, I represent and warrant that I am the parent or legal guardian of the minor participant. I consent to the minor's participation and execute this agreement on behalf of both myself and the minor.

By checking "I Agree," I acknowledge that I have read and understand this Release of Liability and Waiver Agreement, and that I am voluntarily giving up certain legal rights, including the right to sue for claims arising from ordinary negligence.`
                  })}
                  className="text-sm text-primary hover:text-[#2A4A8C] font-medium"
                >
                  Use Sample Text
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
