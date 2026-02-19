'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  Crown, 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface SubscriptionStatus {
  hasSubscription: boolean;
  plan: string;
  status: string;
  currentPeriodEnd?: { seconds: number };
  cancelAtPeriodEnd?: boolean;
  trialEnd?: { seconds: number } | null;
}

interface SubscriptionStatusCardProps {
  orgId: string | null;
}

export function SubscriptionStatusCard({ orgId }: SubscriptionStatusCardProps) {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isManaging, setIsManaging] = useState(false);
  const [daysUntil, setDaysUntil] = useState<{ trial?: number; renewal?: number }>({});

  const loadSubscriptionStatus = useCallback(async () => {
    if (!orgId) return;

    try {
      const functions = getFunctions();
      const getStatus = httpsCallable<
        { organizationId: string },
        SubscriptionStatus
      >(functions, 'getWebSubscriptionStatus');

      const result = await getStatus({ organizationId: orgId });
      setSubscriptionStatus(result.data);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadSubscriptionStatus();
  }, [loadSubscriptionStatus]);

  // Calculate days until trial end or renewal
  useEffect(() => {
    if (!subscriptionStatus) return;

    const calculateDays = () => {
      const now = new Date().getTime();
      const result: { trial?: number; renewal?: number } = {};

      if (subscriptionStatus.trialEnd && subscriptionStatus.status === 'trialing') {
        const trialEndDate = new Date(subscriptionStatus.trialEnd.seconds * 1000).getTime();
        const days = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
        result.trial = Math.max(0, days);
      }

      if (subscriptionStatus.currentPeriodEnd && subscriptionStatus.status === 'active') {
        const renewalDate = new Date(subscriptionStatus.currentPeriodEnd.seconds * 1000).getTime();
        const days = Math.ceil((renewalDate - now) / (1000 * 60 * 60 * 24));
        result.renewal = Math.max(0, days);
      }

      setDaysUntil(result);
    };

    calculateDays();
    const interval = setInterval(calculateDays, 1000 * 60 * 60); // Update every hour

    return () => clearInterval(interval);
  }, [subscriptionStatus]);

  async function handleManageSubscription() {
    if (!orgId) return;

    setIsManaging(true);

    try {
      const functions = getFunctions();
      const createPortal = httpsCallable<
        { organizationId: string },
        { url: string }
      >(functions, 'createCustomerPortalSession');

      const result = await createPortal({ organizationId: orgId });
      window.location.href = result.data.url;
    } catch (error: unknown) {
      console.error('Error opening portal:', error);
      const message = error instanceof Error ? error.message : 'Failed to open billing portal. Please try again.';
      alert(message);
      setIsManaging(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentPlan = subscriptionStatus?.plan || 'free';
  const isTrialing = subscriptionStatus?.status === 'trialing';
  const isActive = subscriptionStatus?.status === 'active' || isTrialing;
  const isPastDue = subscriptionStatus?.status === 'past_due';
  const isCanceled = subscriptionStatus?.status === 'canceled';

  // Plan pricing for display
  const planPricing: Record<string, string> = {
    starter: '$29/month',
    studio: '$99/month',
    academy: '$249/month',
    enterprise: '$499/month',
  };

  return (
    <Card className={`${
      isTrialing ? 'border-green-500 bg-gradient-to-br from-green-50 to-transparent' :
      isPastDue ? 'border-red-500 bg-gradient-to-br from-red-50 to-transparent' :
      isCanceled ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-transparent' :
      isActive ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-transparent' :
      'bg-gradient-to-br from-purple-50 to-transparent'
    }`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className={`h-5 w-5 ${
              isTrialing ? 'text-green-600' :
              isActive ? 'text-blue-600' :
              'text-purple-600'
            }`} />
            Subscription Status
          </div>
          {!subscriptionStatus?.hasSubscription && (
            <Link href="/settings/subscription">
              <Button size="sm" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Start Free Trial
              </Button>
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!subscriptionStatus?.hasSubscription ? (
          // No subscription - Show trial prompt
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-purple-200">
              <div className="flex-shrink-0">
                <Crown className="h-8 w-8 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg">No Active Subscription</div>
                <div className="text-sm text-muted-foreground">
                  Start your 14-day free trial to unlock all features
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-lg border">
                <div className="text-xs text-muted-foreground mb-1">Starting from</div>
                <div className="font-semibold">$29/month</div>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <div className="text-xs text-muted-foreground mb-1">Free trial</div>
                <div className="font-semibold">14 days</div>
              </div>
            </div>
            <Link href="/settings/subscription">
              <Button className="w-full gap-2">
                View All Plans
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          // Has subscription - Show detailed info
          <div className="space-y-4">
            {/* Plan Badge */}
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Current Plan</div>
                <div className="text-2xl font-bold">
                  {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {planPricing[currentPlan.toLowerCase()] || 'Custom pricing'}
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isTrialing ? 'bg-green-100 text-green-700' :
                isPastDue ? 'bg-red-100 text-red-700' :
                isCanceled ? 'bg-orange-100 text-orange-700' :
                isActive ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {isTrialing ? '🎉 FREE TRIAL' :
                 isPastDue ? '⚠️ PAST DUE' :
                 isCanceled ? '❌ CANCELED' :
                 isActive ? '✓ ACTIVE' :
                 subscriptionStatus.status.toUpperCase()}
              </div>
            </div>

            {/* Trial/Renewal Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trial End Date */}
              {isTrialing && subscriptionStatus.trialEnd && (
                <div className="p-4 bg-white rounded-lg border border-green-200">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">Trial Ends</div>
                      <div className="font-semibold">
                        {new Date(subscriptionStatus.trialEnd.seconds * 1000).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      {daysUntil.trial !== undefined && (
                        <div className="text-sm text-green-600 font-medium mt-1">
                          {daysUntil.trial === 0 ? 'Ending today' :
                           daysUntil.trial === 1 ? '1 day remaining' :
                           `${daysUntil.trial} days remaining`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Next Billing Date */}
              {subscriptionStatus.currentPeriodEnd && (
                <div className={`p-4 bg-white rounded-lg border ${
                  subscriptionStatus.cancelAtPeriodEnd ? 'border-orange-200' : 'border-blue-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <Calendar className={`h-5 w-5 mt-0.5 ${
                      subscriptionStatus.cancelAtPeriodEnd ? 'text-orange-600' : 'text-blue-600'
                    }`} />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">
                        {subscriptionStatus.cancelAtPeriodEnd ? 'Expires On' : 'Next Billing'}
                      </div>
                      <div className="font-semibold">
                        {new Date(subscriptionStatus.currentPeriodEnd.seconds * 1000).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      {!subscriptionStatus.cancelAtPeriodEnd && daysUntil.renewal !== undefined && (
                        <div className="text-sm text-blue-600 font-medium mt-1">
                          {daysUntil.renewal === 0 ? 'Renewing today' :
                           daysUntil.renewal === 1 ? 'In 1 day' :
                           `In ${daysUntil.renewal} days`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Status Messages */}
              {isPastDue && (
                <div className="p-4 bg-white rounded-lg border border-red-200 md:col-span-2">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-red-900">Payment Failed</div>
                      <div className="text-sm text-red-700 mt-1">
                        Your last payment failed. Please update your payment method to avoid service interruption.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {subscriptionStatus.cancelAtPeriodEnd && !isPastDue && (
                <div className="p-4 bg-white rounded-lg border border-orange-200 md:col-span-2">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-orange-900">Subscription Canceling</div>
                      <div className="text-sm text-orange-700 mt-1">
                        Your subscription will end on{' '}
                        {new Date(subscriptionStatus.currentPeriodEnd!.seconds * 1000).toLocaleDateString()}.
                        You can reactivate anytime before then.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isActive && !subscriptionStatus.cancelAtPeriodEnd && !isTrialing && (
                <div className="p-4 bg-white rounded-lg border border-green-200 md:col-span-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-green-900">Subscription Active</div>
                      <div className="text-sm text-green-700 mt-1">
                        Your subscription is active and will automatically renew.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link href="/settings/subscription" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <Crown className="h-4 w-4" />
                  View All Plans
                </Button>
              </Link>
              <Button 
                onClick={handleManageSubscription} 
                disabled={isManaging}
                className="flex-1 gap-2"
              >
                <CreditCard className="h-4 w-4" />
                {isManaging ? 'Loading...' : 'Manage Billing'}
              </Button>
            </div>

            <div className="text-xs text-center text-muted-foreground pt-2">
              Manage your payment methods, view invoices, and update billing information
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
