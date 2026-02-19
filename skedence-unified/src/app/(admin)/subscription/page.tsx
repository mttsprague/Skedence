'use client';

import { useAuth } from '@/hooks/useAuth';
import { SubscriptionStatusCard } from '@/components/admin/subscription-status-card';

export default function SubscriptionPage() {
  const { orgId } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Subscription</h1>
        <p className="mt-2 text-foreground/80">
          Manage your billing, subscription plan, and payment methods
        </p>
      </div>

      <SubscriptionStatusCard orgId={orgId} />
    </div>
  );
}
