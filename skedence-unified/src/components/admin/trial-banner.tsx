'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { AlertCircle, Clock, Crown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubscriptionStatus {
  hasSubscription: boolean;
  plan: string;
  status: string;
  currentPeriodEnd?: { seconds?: number; _seconds?: number };
  cancelAtPeriodEnd?: boolean;
  trialEnd?: { seconds?: number; _seconds?: number } | null;
}

interface TrialBannerProps {
  orgId: string | null;
}

export function TrialBanner({ orgId }: TrialBannerProps) {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // Memoize Functions instance to prevent recreation
  const functions = useMemo(() => getFunctions(), []);

  const loadSubscriptionStatus = useCallback(async () => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }

    try {
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
  }, [orgId, functions]);

  useEffect(() => {
    loadSubscriptionStatus();
  }, [loadSubscriptionStatus]);

  // Calculate days remaining in trial
  useEffect(() => {
    if (!subscriptionStatus?.trialEnd || subscriptionStatus.status !== 'trialing') {
      return;
    }

    const calculateDays = () => {
      const now = new Date().getTime();
      // Handle both formats: { seconds } or { _seconds }
      const timestampSeconds = subscriptionStatus.trialEnd!.seconds || subscriptionStatus.trialEnd!._seconds || 0;
      const trialEndDate = new Date(timestampSeconds * 1000).getTime();
      const days = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
      setDaysRemaining(Math.max(0, days));
    };

    calculateDays();
    const interval = setInterval(calculateDays, 1000 * 60 * 60); // Update every hour

    return () => clearInterval(interval);
  }, [subscriptionStatus]);

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // Don't show banner if:
  // - Loading
  // - Dismissed
  // - No orgId
  // - Has active paid subscription
  if (isLoading || isDismissed || !orgId) {
    return null;
  }

  // Hide banner if they have an active paid subscription (not trialing)
  if (subscriptionStatus?.hasSubscription && subscriptionStatus?.status === 'active') {
    return null;
  }

  // SCENARIO 1: No subscription yet - encourage them to start trial
  if (!subscriptionStatus?.hasSubscription || subscriptionStatus?.status === 'inactive') {
    return (
      <div className="relative rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200">
        <div className="flex items-start gap-3">
          <Crown className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
          
          <div className="flex-1">
            <h3 className="font-semibold text-purple-900">
              🎉 Start Your Free Trial Today!
            </h3>
            <p className="text-sm mt-1 text-purple-700">
              Get <strong>14 days free</strong> when you subscribe. Full access to all features, cancel anytime.
            </p>
            <Link href="/subscription">
              <Button 
                size="sm" 
                className="mt-3 bg-purple-600 hover:bg-purple-700"
              >
                Start 14-Day Free Trial →
              </Button>
            </Link>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>
    );
  }

  // SCENARIO 2: Active trial - show countdown
  // Always use calm, reassuring messaging regardless of days remaining
  if (subscriptionStatus?.status === 'trialing' && daysRemaining !== null) {
    return (
      <div className="relative rounded-lg p-4 bg-blue-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <Crown className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900">
              {daysRemaining === 0 ? (
                '🎉 Your free trial ends today - You\'re all set!'
              ) : daysRemaining === 1 ? (
                '🎉 1 day left in your free trial'
              ) : (
                `🎉 ${daysRemaining} days left in your free trial`
              )}
            </h3>
            <p className="text-sm mt-1 text-blue-700">
              {daysRemaining <= 3 ? (
                <>Your subscription is active and will automatically continue after your trial. No action needed!</>
              ) : (
                <>You're subscribed! After your trial, billing will begin automatically. You can manage your subscription anytime.</>
              )}
            </p>
            <Link href="/subscription">
              <Button 
                size="sm" 
                variant="outline"
                className="mt-3 border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Manage Subscription
              </Button>
            </Link>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>
    );
  }

  // No banner needed - all other states handled above
  return null;
}
