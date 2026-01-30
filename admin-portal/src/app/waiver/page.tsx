'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Save, FileText, AlertCircle } from 'lucide-react';

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
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (!orgId) return;

    async function loadSettings() {
      try {
        const orgDoc = await getDoc(doc(db, 'organizations', orgId!));
        if (orgDoc.exists()) {
          const data = orgDoc.data();
          setSettings({
            requireWaiver: data.requireWaiver !== false,
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

  const handleSave = async () => {
    if (!orgId) return;

    setSaving(true);
    setSaveMessage('');

    try {
      await setDoc(doc(db, 'organizations', orgId), {
        requireWaiver: settings.requireWaiver,
        waiverText: settings.waiverText,
      }, { merge: true });

      setSaveMessage('Waiver settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving waiver settings:', error);
      setSaveMessage('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Waiver Settings</h1>
            <p className="text-gray-600 mt-2">Configure liability waiver requirements for your clients</p>
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
            saveMessage.includes('Error') 
              ? 'bg-red-50 text-red-800 border border-red-200' 
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}>
            {saveMessage}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#3258A3]" />
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
                  onChange={(e) => setSettings({ ...settings, requireWaiver: e.target.checked })}
                  className="w-5 h-5 text-[#3258A3] border-gray-300 rounded focus:ring-[#3258A3]"
                />
                <span className="text-sm font-medium text-gray-700">Require Waiver Agreement</span>
              </label>
              <p className="text-sm text-gray-500 mt-1 ml-8">
                Clients must agree to the waiver after their first booking
              </p>
            </div>

            {/* Waiver Text Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Waiver Text
              </label>
              <textarea
                value={settings.waiverText}
                onChange={(e) => setSettings({ ...settings, waiverText: e.target.value })}
                placeholder="Enter your liability waiver text here. This will be shown to clients after they book their first session if the waiver requirement is enabled."
                rows={20}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3258A3] focus:border-transparent font-mono text-sm"
              />
              <p className="text-sm text-gray-500 mt-2">
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
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Sample Waiver Text:</p>
                <button
                  onClick={() => setSettings({
                    ...settings,
                    waiverText: `RELEASE OF LIABILITY AND WAIVER

I acknowledge that I am voluntarily participating in training sessions, lessons, camps, or related activities. I understand that participation involves inherent risks, including but not limited to physical contact, falls, collisions, equipment impacts, overuse injuries, property damage, and serious injury or death.

I knowingly and voluntarily assume all such risks, whether known or unknown, associated with my participation.

I hereby release, waive, and discharge this organization and its owners, coaches, instructors, employees, agents, and representatives from any and all claims, demands, actions, or causes of action arising out of or related to my participation, including claims arising from ordinary negligence.

This release does not apply to acts of gross negligence, recklessness, or intentional misconduct.

I acknowledge that reasonable steps have been taken to provide a safe training environment; however, I understand that accidents and injuries may still occur. I agree to follow all rules, safety instructions, and guidelines provided by staff, and I acknowledge that failure to do so may increase the risk of injury.

MINOR PARTICIPANTS: If the participant is under eighteen (18) years of age, I represent and warrant that I am the parent or legal guardian of the minor participant. I consent to the minor's participation and execute this agreement on behalf of both myself and the minor.

By checking "I Agree," I acknowledge that I have read and understand this Release of Liability and Waiver Agreement, and that I am voluntarily giving up certain legal rights, including the right to sue for claims arising from ordinary negligence.`
                  })}
                  className="text-sm text-[#3258A3] hover:text-[#2A4A8C] font-medium"
                >
                  Use Sample Text
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
