'use client';

import { AlertTriangle, Crown, Lock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SubscriptionPaywallProps {
  feature: string;
  reason?: string;
  currentPlan?: string;
  suggestedPlan?: 'starter' | 'studio' | 'academy' | 'enterprise';
}

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['Up to 3 trainers', 'Up to 50 clients', 'Basic reports', 'Email notifications'],
  studio: ['Up to 10 trainers', 'Up to 200 clients', 'Advanced reports', 'Analytics dashboard', 'Priority support'],
  academy: ['Up to 25 trainers', 'Unlimited clients', 'Full analytics', 'Custom branding', 'White-label options'],
  enterprise: ['Unlimited trainers', 'Unlimited clients', 'Custom integrations', 'Dedicated support', 'SLA guarantees'],
};

export function SubscriptionPaywall({
  feature,
  reason,
  currentPlan,
  suggestedPlan = 'studio',
}: SubscriptionPaywallProps) {
  const isExpired = reason?.includes('expired') || reason?.includes('past due');
  const needsUpgrade = reason?.includes('not available') || reason?.includes('Upgrade');

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-2xl w-full">
        <CardContent className="pt-8">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              {isExpired ? (
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {isExpired ? 'Subscription Required' : `Unlock ${feature}`}
              </h2>
              <p className="text-muted-foreground">
                {reason || `This feature requires an active subscription.`}
              </p>
            </div>

            {/* Current Plan Info */}
            {currentPlan && needsUpgrade && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  You're currently on the <span className="font-semibold capitalize">{currentPlan}</span> plan
                </p>
              </div>
            )}

            {/* Suggested Plan Features */}
            {needsUpgrade && PLAN_FEATURES[suggestedPlan] && (
              <div className="text-left bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-foreground capitalize">
                    {suggestedPlan} Plan Includes:
                  </h3>
                </div>
                <ul className="space-y-2">
                  {PLAN_FEATURES[suggestedPlan].map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <svg
                        className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                <Link href="/subscription">
                  {isExpired ? 'Renew Subscription' : needsUpgrade ? 'Upgrade Now' : 'View Plans'}
                </Link>
              </Button>
              {!isExpired && (
                <Button asChild variant="outline" size="lg">
                  <Link href="/dashboard">
                    Back to Dashboard
                  </Link>
                </Button>
              )}
            </div>

            {/* Additional Help */}
            <p className="text-sm text-muted-foreground">
              Questions? <a href="mailto:Matt.Sprague@skedence.com" className="text-primary hover:underline">Contact Support</a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
