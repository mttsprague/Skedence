'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Star, ExternalLink, HelpCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationsSubmenu } from '@/components/admin/notifications-submenu';

interface ReviewSettings {
  googleReviewUrl?: string;
  yelpReviewUrl?: string;
  facebookReviewUrl?: string;
  customReviewUrl?: string;
  customReviewPlatform?: string;
  promptMessage?: string;
  enabled: boolean;
}

const defaultSettings: ReviewSettings = {
  googleReviewUrl: '',
  yelpReviewUrl: '',
  facebookReviewUrl: '',
  customReviewUrl: '',
  customReviewPlatform: '',
  promptMessage: 'Your feedback helps us improve and helps others find us!',
  enabled: true,
};

export default function ReviewsPage() {
  const { orgId } = useAuth();
  const [settings, setSettings] = useState<ReviewSettings>(defaultSettings);
  const [orgName, setOrgName] = useState<string>('Your Organization');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (orgId) {
      loadSettings(orgId);
    }
  }, [orgId]);

  const loadSettings = async (organizationId: string) => {
    try {
      // Load review settings
      const settingsDoc = await getDoc(doc(db, 'organizations', organizationId, 'settings', 'reviews'));
      
      if (settingsDoc.exists()) {
        setSettings({ ...defaultSettings, ...settingsDoc.data() });
      }

      // Load organization name for preview
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId));
      if (orgDoc.exists()) {
        setOrgName(orgDoc.data()?.name || 'Your Organization');
      }
    } catch (error) {
      console.error('Error loading review settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!orgId) return;

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'organizations', orgId, 'settings', 'reviews'),
        settings,
        { merge: true }
      );
      alert('Review settings saved successfully!');
    } catch (error) {
      console.error('Error saving review settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ReviewSettings, value: string | boolean) => {
    setSettings({ ...settings, [field]: value });
  };

  if (loading) {
    return (
      <NotificationsSubmenu>
        <div className="max-w-4xl mx-auto p-6">
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96 mb-8" />
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </NotificationsSubmenu>
    );
  }

  return (
    <NotificationsSubmenu>
      <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Review Collection</h1>
          <p className="text-foreground/80 mt-2">
            Add your review platform URLs to automatically request reviews in follow-up emails
          </p>
        </div>
        {saving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving...</span>
          </div>
        )}
      </div>

      {/* Enable/Disable Toggle */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Request Reviews in Follow-up Emails
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              When enabled, review buttons will appear in follow-up emails sent after appointments
            </p>
          </div>
          <button
            onClick={() => updateField('enabled', !settings.enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Custom Prompt Message */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-foreground mb-2">
          Review Request Message
        </label>
        <p className="text-sm text-muted-foreground mb-3">
          This message appears above the review buttons in follow-up emails
        </p>
        <input
          type="text"
          value={settings.promptMessage}
          onChange={(e) => updateField('promptMessage', e.target.value)}
          placeholder="Your feedback helps us improve and helps others find us!"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Google Reviews */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <label className="block text-sm font-medium text-foreground">Google Review URL</label>
            <p className="text-sm text-muted-foreground mt-1">
              Most important for local SEO and discovery
            </p>
          </div>
          <a
            href="https://support.google.com/business/answer/7035772"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            How to find
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <input
          type="url"
          value={settings.googleReviewUrl}
          onChange={(e) => updateField('googleReviewUrl', e.target.value)}
          placeholder="https://g.page/r/..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {settings.googleReviewUrl && (
          <a
            href={settings.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
          >
            Test link <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Yelp Reviews */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <label className="block text-sm font-medium text-foreground">Yelp Review URL</label>
            <p className="text-sm text-muted-foreground mt-1">
              Popular for service-based businesses
            </p>
          </div>
          <a
            href="https://www.yelp.com/writeareview"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Find on Yelp
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <input
          type="url"
          value={settings.yelpReviewUrl}
          onChange={(e) => updateField('yelpReviewUrl', e.target.value)}
          placeholder="https://www.yelp.com/biz/..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {settings.yelpReviewUrl && (
          <a
            href={settings.yelpReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
          >
            Test link <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Facebook Reviews */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <label className="block text-sm font-medium text-foreground">Facebook Review URL</label>
            <p className="text-sm text-muted-foreground mt-1">
              Good for building social proof
            </p>
          </div>
        </div>
        <input
          type="url"
          value={settings.facebookReviewUrl}
          onChange={(e) => updateField('facebookReviewUrl', e.target.value)}
          placeholder="https://www.facebook.com/..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {settings.facebookReviewUrl && (
          <a
            href={settings.facebookReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
          >
            Test link <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Custom Platform */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-foreground mb-3">Custom Review Platform</label>
        <p className="text-sm text-muted-foreground mb-3">
          Add any other review platform (e.g., Trustpilot, BBB, industry-specific sites)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Platform Name</label>
            <input
              type="text"
              value={settings.customReviewPlatform}
              onChange={(e) => updateField('customReviewPlatform', e.target.value)}
              placeholder="Trustpilot"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Review URL</label>
            <input
              type="url"
              value={settings.customReviewUrl}
              onChange={(e) => updateField('customReviewUrl', e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {settings.customReviewUrl && (
          <a
            href={settings.customReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
          >
            Test link <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Preview */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Email Preview</h3>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
        </div>
        {showPreview && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold mb-4">Thanks for Training With Us!</h2>
            <p className="mb-2">Hi John Doe,</p>
            <p className="mb-4">We hope you had a great session with Coach Sarah!</p>
            
            {settings.enabled && (settings.googleReviewUrl || settings.yelpReviewUrl || settings.facebookReviewUrl || settings.customReviewUrl) && (
              <>
                <h3 className="text-lg font-semibold mb-2">⭐ Share Your Experience</h3>
                <p className="mb-4">{settings.promptMessage || 'Your feedback helps us improve and helps others find us!'}</p>
                <div style={{ margin: '20px 0', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {settings.googleReviewUrl && (
                    <a
                      href={settings.googleReviewUrl}
                      style={{
                        background: '#4285F4',
                        color: 'white',
                        padding: '12px 24px',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        display: 'inline-block',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      Review on Google
                    </a>
                  )}
                  {settings.yelpReviewUrl && (
                    <a
                      href={settings.yelpReviewUrl}
                      style={{
                        background: '#D32323',
                        color: 'white',
                        padding: '12px 24px',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        display: 'inline-block',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      Review on Yelp
                    </a>
                  )}
                  {settings.facebookReviewUrl && (
                    <a
                      href={settings.facebookReviewUrl}
                      style={{
                        background: '#1877F2',
                        color: 'white',
                        padding: '12px 24px',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        display: 'inline-block',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      Review on Facebook
                    </a>
                  )}
                  {settings.customReviewUrl && settings.customReviewPlatform && (
                    <a
                      href={settings.customReviewUrl}
                      style={{
                        background: '#6B7280',
                        color: 'white',
                        padding: '12px 24px',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        display: 'inline-block',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      Review on {settings.customReviewPlatform}
                    </a>
                  )}
                </div>
              </>
            )}
            
            <h3 className="text-lg font-semibold mt-6 mb-2">Ready to Book Your Next Session?</h3>
            <p className="mb-4">Visit our app to schedule your next training session.</p>
            <p className="text-sm text-gray-600">Thanks for being part of our community!<br />The {orgName} Team</p>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          Tips for Getting More Reviews
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• <strong>Timing matters:</strong> Follow-up emails are sent 24 hours after appointments (configurable in Client Emails settings)</li>
          <li>• <strong>Google is key:</strong> Google reviews improve your local SEO and appear in search results</li>
          <li>• <strong>Make it easy:</strong> Direct review links have 3x higher completion rates than asking people to search</li>
          <li>• <strong>Customize your message:</strong> Edit the follow-up email template in Client Emails settings to match your brand voice</li>
          <li>• <strong>Ask after positive experiences:</strong> Great sessions lead to great reviews!</li>
        </ul>
      </div>
    </div>
    </NotificationsSubmenu>
  );
}
