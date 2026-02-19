'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BusinessSettingsSubmenu } from '@/components/admin/business-settings-submenu';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

interface StripeStatus {
  hasAccount: boolean;
  accountId?: string;
  onboardingComplete?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  publishableKey?: string;
}

export default function StripeSettingsPage() {
  const { orgId, user, userData } = useAuth();
  const [stripeStatus, setStripeStatus] = useState<StripeStatus>({ hasAccount: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isOwner = userData?.role === 'owner';

  useEffect(() => {
    loadStripeStatus();
  }, [orgId, isOwner]);

  const loadStripeStatus = async () => {
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
        
        setStripeStatus({
          hasAccount: !!stripe.connectAccountId,
          accountId: stripe.connectAccountId,
          onboardingComplete: stripe.onboardingComplete || false,
          chargesEnabled: stripe.chargesEnabled || false,
          payoutsEnabled: stripe.payoutsEnabled || false,
          publishableKey: stripe.publishableKey
        });
      }
    } catch (error) {
      console.error('Error loading Stripe status:', error);
      setMessage({ type: 'error', text: 'Failed to load Stripe status' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    if (!orgId) return;

    setIsConnecting(true);
    setMessage(null);

    try {
      const functions = getFunctions();
      
      // First, create Connect account if needed
      if (!stripeStatus.hasAccount) {
        const createAccount = httpsCallable<
          { orgId: string; email: string; businessName: string },
          { success: boolean; accountId: string }
        >(functions, 'createConnectAccount');

        const orgDoc = await getDoc(doc(db, 'organizations', orgId));
        const orgData = orgDoc.data();

        await createAccount({
          orgId,
          email: orgData?.adminEmail || user?.email || '',
          businessName: orgData?.name || 'My Business'
        });
      }

      // Generate onboarding link
      const createLink = httpsCallable<
        { orgId: string },
        { url: string }
      >(functions, 'createConnectAccountLink');

      const result = await createLink({ orgId });

      // Redirect to Stripe onboarding
      window.location.href = result.data.url;
    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to connect Stripe. Please try again.' 
      });
      setIsConnecting(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!orgId) return;

    setIsRefreshing(true);
    setMessage(null);

    try {
      const functions = getFunctions();
      const refreshStatus = httpsCallable<
        { orgId: string },
        { success: boolean }
      >(functions, 'refreshConnectAccountStatus');

      await refreshStatus({ orgId });
      await loadStripeStatus();

      setMessage({ type: 'success', text: 'Stripe status refreshed!' });
    } catch (error: any) {
      console.error('Error refreshing status:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to refresh status' 
      });
    } finally {
      setIsRefreshing(false);
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
          <p className="text-foreground/80 mt-1">Connect your Stripe account to accept payments</p>
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

        {/* Status Card */}
        {stripeStatus.hasAccount && stripeStatus.onboardingComplete && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900">Stripe Connected</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Payments are enabled for your organization. Your mobile apps will use this account for all transactions.
                  </p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      {stripeStatus.chargesEnabled ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                      )}
                      <span className={stripeStatus.chargesEnabled ? 'text-green-800' : 'text-orange-800'}>
                        Accepting payments: {stripeStatus.chargesEnabled ? 'Enabled' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {stripeStatus.payoutsEnabled ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                      )}
                      <span className={stripeStatus.payoutsEnabled ? 'text-green-800' : 'text-orange-800'}>
                        Payouts to bank: {stripeStatus.payoutsEnabled ? 'Enabled' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <Button
                      onClick={handleRefreshStatus}
                      disabled={isRefreshing}
                      variant="outline"
                      size="sm"
                      className="text-green-900 border-green-300 hover:bg-green-100"
                    >
                      {isRefreshing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Refresh Status
                    </Button>
                    <a 
                      href="https://dashboard.stripe.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-green-800 hover:text-green-900 hover:underline"
                    >
                      Manage in Stripe
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Incomplete Onboarding Status */}
        {stripeStatus.hasAccount && !stripeStatus.onboardingComplete && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900">Setup Incomplete</h3>
                  <p className="text-sm text-orange-700 mt-1">
                    Your Stripe account is created but setup isn't complete. Continue setup to start accepting payments.
                  </p>
                  <div className="mt-4">
                    <Button
                      onClick={handleConnectStripe}
                      disabled={isConnecting}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {isConnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Continue Stripe Setup
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              How Stripe Connect Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm text-foreground">
              <p>
                Stripe Connect allows your business to accept payments directly into your own Stripe account. 
                Payments go straight to your bank account.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-blue-900">What happens when you connect:</p>
                <ol className="space-y-2 ml-4 list-decimal text-blue-800">
                  <li>You'll be redirected to Stripe's secure portal</li>
                  <li>Sign in to your existing Stripe account or create a new one</li>
                  <li>Connect your bank account for payouts</li>
                  <li>Complete identity verification (required by Stripe/law)</li>
                  <li>Return to Skedence - you're ready to accept payments!</li>
                </ol>
              </div>

              <p className="font-semibold mt-4">Your mobile apps will automatically use this connection:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li><strong>Client App:</strong> Clients can purchase lesson packages</li>
                <li><strong>Admin App Wallet:</strong> You can charge clients for services</li>
              </ul>

              <p className="text-xs text-muted-foreground mt-4">
                🔒 Your Stripe account credentials are never stored by Skedence. All payment processing 
                is handled securely by Stripe.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Connect Button */}
        {!stripeStatus.hasAccount && (
          <Card>
            <CardHeader>
              <CardTitle>Connect Your Stripe Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground/80">
                Connect your Stripe account to start accepting payments from clients. If you don't have 
                a Stripe account yet, you can create one during the connection process.
              </p>

              <Button
                onClick={handleConnectStripe}
                disabled={isConnecting}
                size="lg"
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Connecting to Stripe...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Connect Stripe Account
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By connecting, you agree to Stripe's{' '}
                <a 
                  href="https://stripe.com/connect-account/legal" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Connected Account Agreement
                </a>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Need Help */}
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-6">
            <div className="text-sm space-y-2">
              <p className="font-semibold">Need Help?</p>
              <p>
                Contact us at{' '}
                <a href="mailto:support@skedence.com" className="text-primary hover:underline">
                  support@skedence.com
                </a>
                {' '}if you have questions about connecting your Stripe account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </BusinessSettingsSubmenu>
  );
}
