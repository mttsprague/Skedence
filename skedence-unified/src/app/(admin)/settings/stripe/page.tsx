'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BusinessSettingsSubmenu } from '@/components/admin/business-settings-submenu';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

interface StripeKeys {
  publishableKey?: string;
  secretKey?: string;
}

export default function StripeSettingsPage() {
  const { orgId, user, userData } = useAuth();
  const [stripeKeys, setStripeKeys] = useState<StripeKeys>({});
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isOwner = userData?.role === 'owner';

  useEffect(() => {
    loadStripeKeys();
  }, [orgId, isOwner]);

  const loadStripeKeys = async () => {
    if (!orgId || !isOwner) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const orgDoc = await getDoc(doc(db, 'organizations', orgId));
      
      if (orgDoc.exists()) {
        const data = orgDoc.data();
        const stripe = data.stripe || {};
        
        setStripeKeys({
          publishableKey: stripe.publishableKey,
          secretKey: stripe.secretKey
        });
        
        if (stripe.publishableKey) {
          setPublishableKey(stripe.publishableKey);
        }
        if (stripe.secretKey) {
          setSecretKey(stripe.secretKey);
        }
      }
    } catch (error) {
      console.error('Error loading Stripe keys:', error);
      setMessage({ type: 'error', text: 'Failed to load Stripe keys' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveKeys = async () => {
    if (!orgId) return;

    // Validation
    if (!publishableKey.trim()) {
      setMessage({ type: 'error', text: 'Publishable key is required' });
      return;
    }
    if (!secretKey.trim()) {
      setMessage({ type: 'error', text: 'Secret key is required' });
      return;
    }

    // Validate key formats
    if (!publishableKey.startsWith('pk_')) {
      setMessage({ type: 'error', text: 'Publishable key must start with pk_test_ or pk_live_' });
      return;
    }
    if (!secretKey.startsWith('sk_')) {
      setMessage({ type: 'error', text: 'Secret key must start with sk_test_ or sk_live_' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      // Save keys to organization document
      await setDoc(
        doc(db, 'organizations', orgId),
        {
          stripe: {
            publishableKey: publishableKey.trim(),
            secretKey: secretKey.trim(),
            updatedAt: new Date().toISOString()
          }
        },
        { merge: true }
      );

      // Mark onboarding step as complete
      try {
        const onboardingRef = doc(db, 'organizations', orgId, 'settings', 'onboarding');
        const onboardingDoc = await getDoc(onboardingRef);
        const currentProgress = onboardingDoc.exists() ? onboardingDoc.data() : {};
        await setDoc(onboardingRef, { ...currentProgress, stripeConnected: true }, { merge: true });
      } catch (error) {
        console.error('Error marking onboarding step complete:', error);
      }

      setStripeKeys({
        publishableKey: publishableKey.trim(),
        secretKey: secretKey.trim()
      });

      setMessage({ type: 'success', text: 'Stripe keys saved successfully! Your apps can now process payments.' });
    } catch (error) {
      console.error('Error saving Stripe keys:', error);
      setMessage({ type: 'error', text: 'Failed to save Stripe keys' });
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

  if (isLoading) {
    return (
      <BusinessSettingsSubmenu>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <p className="text-foreground/80 mt-1">Enter your Stripe API keys to enable payment processing</p>
        </div>

        {/* Messages */}
        {message && (
          <div className={`p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-900 border-green-200' 
              : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Instructions Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-blue-900">Where to find your API keys:</p>
              <ol className="space-y-2 ml-4 list-decimal text-blue-800">
                <li>
                  Log in to your{' '}
                  <a 
                    href="https://dashboard.stripe.com/apikeys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Stripe Dashboard
                  </a>
                </li>
                <li>Go to Developers → API keys</li>
                <li>Copy your Publishable key (starts with pk_)</li>
                <li>Reveal and copy your Secret key (starts with sk_)</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* API Keys Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              API Keys
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Publishable Key */}
            <div className="space-y-2">
              <Label htmlFor="publishableKey">
                Publishable Key
                <span className="text-muted-foreground ml-2 text-xs">(pk_test_... or pk_live_...)</span>
              </Label>
              <Input
                id="publishableKey"
                type="text"
                placeholder="pk_test_51..."
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Used by your mobile apps to create payment methods. Safe to share publicly.
              </p>
            </div>

            {/* Secret Key */}
            <div className="space-y-2">
              <Label htmlFor="secretKey">
                Secret Key
                <span className="text-muted-foreground ml-2 text-xs">(sk_test_... or sk_live_...)</span>
              </Label>
              <div className="relative">
                <Input
                  id="secretKey"
                  type={showSecretKey ? 'text' : 'password'}
                  placeholder="sk_test_51..."
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  disabled={isSaving}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep this private! Used by your backend to process payments.
              </p>
            </div>

            {/* Current Keys Status */}
            {(stripeKeys.publishableKey || stripeKeys.secretKey) && (
              <div className="p-4 border rounded-lg bg-muted space-y-2">
                <p className="text-sm font-medium">Current Keys Saved:</p>
                {stripeKeys.publishableKey && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">Publishable Key</span>
                  </div>
                )}
                {stripeKeys.secretKey && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">Secret Key</span>
                  </div>
                )}
              </div>
            )}

            {/* Save Button */}
            <Button 
              onClick={handleSaveKeys}
              disabled={isSaving}
              size="lg"
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Save Stripe Keys
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm text-foreground">
              <p>
                Your Stripe API keys allow your mobile apps to process payments directly to your Stripe account. 
                All payments go straight to your account.
              </p>
              
              <p className="font-semibold mt-4">Your mobile apps will use these keys:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li><strong>Client App:</strong> Clients can purchase lesson packages</li>
                <li><strong>Admin App Wallet:</strong> You can charge clients for services</li>
              </ul>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                <p className="font-semibold text-amber-900">Test vs Live Keys</p>
                <p className="text-amber-800 mt-1">
                  Use test keys (pk_test_ and sk_test_) for development. Switch to live keys 
                  (pk_live_ and sk_live_) when ready for real payments.
                </p>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                🔒 Your keys are stored securely in Firebase and only accessible to your organization.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-6">
            <div className="text-sm space-y-2">
              <p className="font-semibold">Common Questions</p>
              <ul className="space-y-2 text-muted-foreground">
                <li><strong>Is my data secure?</strong> Yes, your keys are stored securely in Firebase and only accessible to your organization.</li>
                <li><strong>What are the fees?</strong> Stripe charges 2.9% + $0.30 per transaction. There are no monthly fees.</li>
                <li><strong>Can I change my keys later?</strong> Yes, you can update your keys at any time.</li>
              </ul>
              <p className="mt-4">
                For help, visit the{' '}
                <a 
                  href="https://support.stripe.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Stripe Support Center
                </a>
                {' '}or contact us at{' '}
                <a href="mailto:support@skedence.com" className="text-primary hover:underline">
                  support@skedence.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </BusinessSettingsSubmenu>
  );
}
