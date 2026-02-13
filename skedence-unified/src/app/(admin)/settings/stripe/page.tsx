'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BusinessSettingsSubmenu } from '@/components/admin/business-settings-submenu';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CreditCard, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

export default function StripeSettingsPage() {
  const { orgId, user, userData } = useAuth();
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [hasExistingKeys, setHasExistingKeys] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isOwner = userData?.role === 'owner';

  useEffect(() => {
    if (!orgId || !isOwner) return;

    async function loadKeys() {
      if (!orgId) return;
      
      setIsLoading(true);
      try {
        const stripeDoc = await getDoc(doc(db, 'organizations', orgId, 'stripe', 'config'));
        
        if (stripeDoc.exists()) {
          const data = stripeDoc.data();
          if (data.publishableKey) {
            setPublishableKey(data.publishableKey);
            setHasExistingKeys(true);
          }
          // Don't show the full secret key for security
          if (data.secretKey) {
            setSecretKey('');
          }
        }
      } catch (error) {
        console.error('Error loading Stripe keys:', error);
        setMessage({ type: 'error', text: 'Failed to load Stripe configuration' });
      } finally {
        setIsLoading(false);
      }
    }

    loadKeys();
  }, [orgId, isOwner]);

  const handleSave = async () => {
    if (!orgId || !isOwner) return;

    // Validate keys
    if (!publishableKey.startsWith('pk_live_')) {
      setMessage({ type: 'error', text: 'Publishable key must start with pk_live_' });
      return;
    }

    if (!secretKey.startsWith('sk_live_')) {
      setMessage({ type: 'error', text: 'Secret key must start with sk_live_' });
      return;
    }

    if (publishableKey.length < 40) {
      setMessage({ type: 'error', text: 'Publishable key seems too short' });
      return;
    }

    if (secretKey.length < 50) {
      setMessage({ type: 'error', text: 'Secret key seems too short' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      // Save to organizations/{orgId}/stripe/config
      await setDoc(doc(db, 'organizations', orgId, 'stripe', 'config'), {
        publishableKey: publishableKey,
        secretKey: secretKey,
        mode: 'live',
        updatedAt: Timestamp.now(),
        updatedBy: user?.uid || ''
      }, { merge: true });

      setMessage({ type: 'success', text: 'Stripe keys saved successfully! Your iOS apps will use these keys for payments.' });
      setHasExistingKeys(true);
      setSecretKey(''); // Clear secret key field for security
    } catch (error) {
      console.error('Error saving Stripe keys:', error);
      setMessage({ type: 'error', text: 'Failed to save Stripe keys. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOwner) {
    return (
      <BusinessSettingsSubmenu>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-foreground/80">Only organization owners can manage Stripe settings.</p>
          </div>
        </div>
      </BusinessSettingsSubmenu>
    );
  }

  return (
    <BusinessSettingsSubmenu>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stripe Settings</h1>
          <p className="text-foreground/80 mt-1">Manage your Stripe API keys to accept payments</p>
        </div>

        {/* Status Card */}
        {hasExistingKeys && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900">Stripe Connected</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Payments are enabled for your organization. Your iOS apps and web portal will use these keys.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              How to Get Your Stripe Keys
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3 text-sm text-foreground">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">1</span>
                <span>Open <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">dashboard.stripe.com <ExternalLink className="h-3 w-3" /></a> in a new tab</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">2</span>
                <span>Sign in to your Stripe account</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">3</span>
                <span>Toggle OFF "Test mode" in the top right corner</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">4</span>
                <span>Click "Developers" in the left sidebar</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">5</span>
                <span>Click "API keys" from the menu</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">6</span>
                <span>Copy your "Publishable key" (starts with pk_live_...)</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">7</span>
                <span>Reveal and copy your "Secret key" (starts with sk_live_...)</span>
              </li>
            </ol>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-900">
                <strong>💡 Tip:</strong> Keep the Stripe dashboard open in another tab to easily copy both keys
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Warning */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900">Use LIVE Mode Keys</h3>
                <p className="text-sm text-orange-700 mt-1">
                  Make sure your keys start with <code className="bg-orange-100 px-1 py-0.5 rounded">pk_live_</code> and <code className="bg-orange-100 px-1 py-0.5 rounded">sk_live_</code>. 
                  Test keys will not process real payments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Enter Your Stripe Keys</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success' ? 'bg-green-50 text-green-900 border border-green-200' : 'bg-red-50 text-red-900 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="publishableKey">Publishable Key</Label>
              <input
                id="publishableKey"
                type="text"
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                placeholder="pk_live_..."
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent font-mono text-sm"
                disabled={isSaving || isLoading}
              />
              <p className="text-xs text-muted-foreground">Starts with pk_live_</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secretKey">Secret Key</Label>
              <input
                id="secretKey"
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder={hasExistingKeys ? "sk_****...(configured)" : "sk_live_..."}
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent font-mono text-sm"
                disabled={isSaving || isLoading}
              />
              <p className="text-xs text-muted-foreground">Starts with sk_live_ (kept secure, never shown)</p>
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving || isLoading || !publishableKey || !secretKey}
              className="w-full"
            >
              {isSaving ? 'Saving...' : hasExistingKeys ? 'Update Keys' : 'Save Keys'}
            </Button>
          </CardContent>
        </Card>

        {/* Security Note */}
        <Card className="border-gray-200 bg-background">
          <CardContent className="pt-6">
            <div className="text-sm text-foreground space-y-2">
              <p className="font-semibold">🔒 Security</p>
              <p>
                Your secret key is encrypted and stored securely in Firebase. It's only used server-side 
                for processing payments and is never exposed to clients.
              </p>
              <p className="mt-2">
                Both your iOS apps (client and admin) will automatically use these keys for all payment processing.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </BusinessSettingsSubmenu>
  );
}
