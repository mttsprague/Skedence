'use client';

import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Functions, httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { CreditCard, CheckCircle2, AlertCircle, Crown, Zap, Building2, Rocket, Check } from 'lucide-react';

interface SubscriptionStatus {
  hasSubscription: boolean;
  plan: string;
  status: string;
  currentPeriodEnd?: { seconds: number };
  cancelAtPeriodEnd?: boolean;
  trialEnd?: { seconds: number } | null;
}

// Separate component for handling search params
function SearchParamsHandler({ onMessage, onReload }: { 
  onMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
  onReload: () => void;
}) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      onMessage({ type: 'success', text: 'Subscription activated successfully! Welcome to Skedence.' });
      onReload();
    } else if (canceled === 'true') {
      onMessage({ type: 'error', text: 'Subscription checkout was canceled.' });
    }
  }, [searchParams, onMessage, onReload]);
  
  return null;
}

function SubscriptionContent() {
  const { orgId, user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!orgId) return;
    loadSubscriptionStatus();
  }, [orgId]);

  async function loadSubscriptionStatus() {
    if (!orgId) return;
    
    setIsLoading(true);
    setMessage(null);
    
    try {
      const functions = getFunctions();
      const getStatus = httpsCallable<{ organizationId: string }, SubscriptionStatus>(
        functions,
        'getWebSubscriptionStatus'
      );
      
      const result = await getStatus({ organizationId: orgId });
      setSubscriptionStatus(result.data);
    } catch (error) {
      console.error('Error loading subscription:', error);
      setMessage({ type: 'error', text: 'Failed to load subscription status' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSelectPlan(planName: string, priceId: string) {
    if (!orgId) return;
    
    setSelectedPlan(planName);
    setIsPurchasing(true);
    setMessage(null);
    
    try {
      const functions = getFunctions();
      const createCheckout = httpsCallable<
        { organizationId: string; priceId: string },
        { url: string; sessionId: string }
      >(functions, 'createWebCheckoutSession');
      
      const result = await createCheckout({
        organizationId: orgId,
        priceId: priceId,
      });
      
      // Redirect to Stripe Checkout
      window.location.href = result.data.url;
    } catch (error: any) {
      console.error('Error starting checkout:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to start checkout. Please try again.' 
      });
      setIsPurchasing(false);
      setSelectedPlan(null);
    }
  }

  async function handleManageSubscription() {
    if (!orgId) return;
    
    setIsPurchasing(true);
    setMessage(null);
    
    try {
      const functions = getFunctions();
      const createPortal = httpsCallable<
        { organizationId: string },
        { url: string }
      >(functions, 'createCustomerPortalSession');
      
      const result = await createPortal({ organizationId: orgId });
      
      // Redirect to Stripe Customer Portal
      window.location.href = result.data.url;
    } catch (error: any) {
      console.error('Error opening portal:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to open billing portal. Please try again.' 
      });
      setIsPurchasing(false);
    }
  }

  const plans = [
    {
      name: 'Starter',
      price: '$29',
      priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || 'price_1SpKItFIh2MhEffNfsBy4HyT',
      icon: Zap,
      color: 'blue',
      features: [
        'Up to 3 trainers',
        'Up to 200 bookings/month',
        'Basic scheduling',
        'Client packages',
        'Payment processing (Stripe Connect)',
        'Email support',
      ],
    },
    {
      name: 'Studio',
      price: '$99',
      priceId: process.env.NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID || 'price_1SpKMkFIh2MhEffNgGdbgMr5',
      icon: Building2,
      color: 'purple',
      popular: true,
      features: [
        'Up to 10 trainers',
        'Unlimited bookings',
        'Advanced scheduling',
        'Multi-trainer management',
        'Cancellation policies',
        'Email notifications',
        'Priority support',
      ],
    },
    {
      name: 'Academy',
      price: '$249',
      priceId: process.env.NEXT_PUBLIC_STRIPE_ACADEMY_PRICE_ID || 'price_1SpKNrFIh2MhEffNqZf64sPA',
      icon: Crown,
      color: 'yellow',
      features: [
        'Up to 30 trainers',
        'Unlimited everything',
        'Multiple locations',
        'Roles & permissions',
        'Advanced analytics',
        'Revenue tracking',
        'Custom branding',
        'Dedicated account manager',
      ],
    },
    {
      name: 'Enterprise',
      price: '$499',
      priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || 'price_1SpKOrFIh2MhEffNjU5v5X4P',
      icon: Rocket,
      color: 'red',
      features: [
        'Unlimited trainers',
        'Unlimited everything',
        'White-label branding',
        'Custom domain',
        'API access',
        'Custom integrations',
        'SLA guarantee',
        'Dedicated support team',
      ],
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading subscription...</div>
      </div>
    );
  }

  const currentPlan = subscriptionStatus?.plan || 'free';
  const isTrialing = subscriptionStatus?.status === 'trialing';
  const isActive = subscriptionStatus?.status === 'active' || isTrialing;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Subscription</h1>
        <p className="text-foreground/70 mt-1">Choose the plan that fits your business</p>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Current Subscription Status */}
      {subscriptionStatus?.hasSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {isTrialing && subscriptionStatus.trialEnd && (
                    <span className="text-green-600 font-medium">
                      Free trial until {new Date(subscriptionStatus.trialEnd.seconds * 1000).toLocaleDateString()}
                    </span>
                  )}
                  {isActive && !isTrialing && subscriptionStatus.currentPeriodEnd && (
                    <span>
                      {subscriptionStatus.cancelAtPeriodEnd ? 'Expires' : 'Renews'} on{' '}
                      {new Date(subscriptionStatus.currentPeriodEnd.seconds * 1000).toLocaleDateString()}
                    </span>
                  )}
                  {!isActive && (
                    <span className="text-orange-600">Subscription inactive</span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleManageSubscription} disabled={isPurchasing}>
                  {isPurchasing ? 'Loading...' : 'Manage Subscription'}
                </Button>
              </div>
            </div>

            {subscriptionStatus.cancelAtPeriodEnd && (
              <div className="p-3 bg-orange-50 text-orange-800 rounded-lg text-sm">
                Your subscription will cancel at the end of the current period. Reactivate in the billing portal.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Free Trial Banner */}
      {!subscriptionStatus?.hasSubscription && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400 rounded-full mb-2">
                <Crown className="h-8 w-8 text-yellow-900" />
              </div>
              <h2 className="text-2xl font-bold">Start Your 14-Day Free Trial</h2>
              <p className="text-foreground/70">
                Try any plan free for 14 days. No credit card required until trial ends.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan.toLowerCase() === plan.name.toLowerCase();
          
          return (
            <Card 
              key={plan.name}
              className={`relative ${
                plan.popular ? 'border-blue-500 border-2 shadow-lg' : ''
              } ${isCurrent ? 'bg-green-50' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}
              
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    CURRENT PLAN
                  </span>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${plan.color}-100`}>
                    <Icon className={`h-6 w-6 text-${plan.color}-600`} />
                  </div>
                  <CardTitle>{plan.name}</CardTitle>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold">{plan.price}</div>
                  <div className="text-sm text-muted-foreground">/month</div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(plan.name, plan.priceId)}
                  disabled={isCurrent || isPurchasing}
                  variant={plan.popular ? 'default' : 'outline'}
                  className="w-full"
                >
                  {isCurrent ? 'Current Plan' : isPurchasing && selectedPlan === plan.name ? 'Loading...' : 'Select Plan'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2 text-sm text-muted-foreground">
            <p>All plans include a 14-day free trial. Cancel anytime.</p>
            <p>Need help choosing? <a href="mailto:support@skedence.com" className="text-blue-600 hover:underline">Contact us</a></p>
            <p className="text-xs">Prices shown are in USD. By subscribing, you agree to our Terms of Service.</p>
          </div>
        </CardContent>
      </Card>

      {/* Search Params Handler (in Suspense boundary) */}
      <Suspense fallback={null}>
        <SearchParamsHandler 
          onMessage={setMessage} 
          onReload={loadSubscriptionStatus} 
        />
      </Suspense>

      {/* Loading Overlay */}
      {isPurchasing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-lg font-medium">Redirecting to secure checkout...</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Main page component with Suspense boundary
export default function SubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <SubscriptionContent />
    </Suspense>
  );
}
