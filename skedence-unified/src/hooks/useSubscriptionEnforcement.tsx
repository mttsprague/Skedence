'use client';

import { useEffect, useState, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'inactive';
export type SubscriptionPlan = 'starter' | 'studio' | 'academy' | 'enterprise' | 'free';

export interface SubscriptionLimits {
  maxTrainers: number | null; // null = unlimited
  maxClients: number | null;
  maxLocations: number | null;
  canAccessReports: boolean;
  canAccessAnalytics: boolean;
  canSendEmailNotifications: boolean;
}

export interface SubscriptionData {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  isActive: boolean;
  isTrialing: boolean;
  isPastDue: boolean;
  isExpired: boolean;
  daysRemainingInTrial: number | null;
  limits: SubscriptionLimits;
  trialEnd?: { seconds: number };
  currentPeriodEnd?: { seconds: number };
}

const PLAN_LIMITS: Record<SubscriptionPlan, SubscriptionLimits> = {
  free: {
    maxTrainers: 1,
    maxClients: 10,
    maxLocations: 1,
    canAccessReports: false,
    canAccessAnalytics: false,
    canSendEmailNotifications: false,
  },
  starter: {
    maxTrainers: 3,
    maxClients: 50,
    maxLocations: 2,
    canAccessReports: true,
    canAccessAnalytics: false,
    canSendEmailNotifications: true,
  },
  studio: {
    maxTrainers: 10,
    maxClients: 200,
    maxLocations: 5,
    canAccessReports: true,
    canAccessAnalytics: true,
    canSendEmailNotifications: true,
  },
  academy: {
    maxTrainers: 25,
    maxClients: null, // unlimited
    maxLocations: null,
    canAccessReports: true,
    canAccessAnalytics: true,
    canSendEmailNotifications: true,
  },
  enterprise: {
    maxTrainers: null,
    maxClients: null,
    maxLocations: null,
    canAccessReports: true,
    canAccessAnalytics: true,
    canSendEmailNotifications: true,
  },
};

export function useSubscriptionEnforcement(orgId: string | null) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }

    try {
      const functions = getFunctions();
      const getStatus = httpsCallable<{ organizationId: string }, any>(
        functions,
        'getWebSubscriptionStatus'
      );

      const result = await getStatus({ organizationId: orgId });
      const data = result.data;

      const status: SubscriptionStatus = data.status || 'inactive';
      const plan: SubscriptionPlan = data.plan || 'free';
      const isTrialing = status === 'trialing';
      const isPastDue = status === 'past_due';
      const isExpired = status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired';
      const isActive = status === 'active' || status === 'trialing';

      // Calculate days remaining in trial
      let daysRemainingInTrial: number | null = null;
      if (isTrialing && data.trialEnd) {
        const now = Date.now();
        const trialEndDate = new Date(data.trialEnd.seconds * 1000).getTime();
        daysRemainingInTrial = Math.max(0, Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24)));
      }

      setSubscription({
        status,
        plan,
        isActive,
        isTrialing,
        isPastDue,
        isExpired,
        daysRemainingInTrial,
        limits: PLAN_LIMITS[plan],
        trialEnd: data.trialEnd,
        currentPeriodEnd: data.currentPeriodEnd,
      });
      setError(null);
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  /**
   * Check if a feature is available based on subscription status and limits
   */
  const canAccessFeature = useCallback((feature: keyof SubscriptionLimits): boolean => {
    if (!subscription) return false;
    if (!subscription.isActive) return false;
    
    const limit = subscription.limits[feature];
    return limit === true || limit === null; // true or null (unlimited) means access granted
  }, [subscription]);

  /**
   * Check if adding more of a resource would exceed limits
   */
  const canAddResource = useCallback((resource: 'trainers' | 'clients' | 'locations', currentCount: number): boolean => {
    if (!subscription) return false;
    if (!subscription.isActive) return false;

    const limitKey = `max${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof SubscriptionLimits;
    const limit = subscription.limits[limitKey];
    
    if (limit === null) return true; // unlimited
    if (typeof limit === 'number') return currentCount < limit;
    
    return false;
  }, [subscription]);

  /**
   * Get the reason why a feature is blocked
   */
  const getBlockReason = useCallback((feature: keyof SubscriptionLimits): string | null => {
    if (!subscription) return 'Subscription information not available';
    
    if (!subscription.isActive) {
      if (subscription.isExpired) {
        return 'Your subscription has expired. Please renew to continue.';
      }
      if (subscription.isPastDue) {
        return 'Your payment is past due. Please update your payment method.';
      }
      return 'Your subscription is not active.';
    }

    const limit = subscription.limits[feature];
    if (limit === false) {
      return `This feature is not available on the ${subscription.plan} plan. Upgrade to access it.`;
    }

    return null;
  }, [subscription]);

  return {
    subscription,
    isLoading,
    error,
    canAccessFeature,
    canAddResource,
    getBlockReason,
    reload: loadSubscription,
  };
}
