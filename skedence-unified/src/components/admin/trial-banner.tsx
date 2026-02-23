'use client';

import { useEffect, useState, useCallback } from 'react';
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

  const loadSubscriptionStatus = useCallback(async () => {
    if (!orgId) return;

    try {
      const functions = getFunctions();
      const getStatus = httpsCallable<
        { organizationId: string },
        SubscriptionStatus
      >(functions, 'getWebSubscriptionStatus');

      const result = await getStatus({ organizationId: orgId });
      console.log('🔔 Trial Banner - Subscription Status:', result.data);
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

  // Calculate days remaining in trial
  useEffect(() => {
    if (!subscriptionStatus) return;

    if (subscriptionStatus.trialEnd && subscriptionStatus.status === 'trialing') {
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
    }
  }, [subscriptionStatus]);

  // Don't show banner if:
  // - Loading
  // - Dismissed
  // - Has active paid subscription
  if (isLoading || isDismissed) {
    console.log('🔔 Trial Banner - Not showing because:', {
      isLoading,
      isDismissed,
    });
    return null;
  }

  // Hide banner if they have an active paid subscription (not trialing)
  if (subscriptionStatus?.hasSubscription && subscriptionStatus?.status === 'active') {
    console.log('🔔 Trial Banner - Hidden: Active paid subscription');
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
                Start Free Trial →
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
  if (subscriptionStatus?.status === 'trialing' && daysRemaining !== null) {
    const isUrgent = daysRemaining <= 3;
    const isWarning = daysRemaining <= 7 && daysRemaining > 3;

    return (
      <div className={`relative rounded-lg p-4 ${
        isUrgent ? 'bg-red-50 border-2 border-red-200' :
        isWarning ? 'bg-orange-50 border-2 border-orange-200' :
        'bg-blue-50 border-2 border-blue-200'
      }`}>
        <div className="flex items-start gap-3">
          {isUrgent ? (
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          ) : isWarning ? (
            <Clock className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
          ) : (
            <Crown className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          )}
          
          <div className="flex-1">
            <h3 className={`font-semibold ${
              isUrgent ? 'text-red-900' :
              isWarning ? 'text-orange-900' :
              'text-blue-900'
            }`}>
              {daysRemaining === 0 ? (
                'Your free trial ends today!'
              ) : daysRemaining === 1 ? (
                'Your free trial ends tomorrow'
              ) : (
                `${daysRemaining} days left in your free trial`
              )}
            </h3>
            <p className={`text-sm mt-1 ${
              isUrgent ? 'text-red-700' :
              isWarning ? 'text-orange-700' :
              'text-blue-700'
            }`}>
              {isUrgent ? (
                <>Subscribe now to continue using Skedence without interruption.</>
              ) : (
                <>Choose a plan to keep enjoying all features after your trial ends.</>
              )}
            </p>
            <Link href="/subscription">
              <Button 
                size="sm" 
                className={`mt-3 ${
                  isUrgent ? 'bg-red-600 hover:bg-red-700' :
                  isWarning ? 'bg-orange-600 hover:bg-orange-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                View Plans & Subscribe
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

  // No banner needed
  console.log('🔔 Trial Banner - Not showing (unexpected state):', subscriptionStatus);
  return null;
}
