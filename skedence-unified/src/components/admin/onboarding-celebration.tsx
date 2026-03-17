'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { doc, setDoc, getDoc, getFirestore } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { 
  PartyPopper, 
  Sparkles, 
  Users, 
  Download,
  X,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export function OnboardingCelebration() {
  const { orgId } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkDismissStatus() {
      if (!orgId) {
        setIsLoading(false);
        return;
      }

      try {
        const db = getFirestore();
        const onboardingRef = doc(db, 'organizations', orgId, 'settings', 'onboarding');
        const onboardingDoc = await getDoc(onboardingRef);
        
        if (onboardingDoc.exists() && onboardingDoc.data()?.celebrationDismissed === true) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
      } catch (error) {
        console.error('Error checking celebration dismiss status:', error);
        setIsVisible(true); // Show by default if there's an error
      } finally {
        setIsLoading(false);
      }
    }

    checkDismissStatus();
  }, [orgId]);

  async function handleDismiss() {
    if (!orgId) return;

    try {
      const db = getFirestore();
      const onboardingRef = doc(db, 'organizations', orgId, 'settings', 'onboarding');
      await setDoc(onboardingRef, { celebrationDismissed: true }, { merge: true });
      setIsVisible(false);
    } catch (error) {
      console.error('Error dismissing celebration:', error);
    }
  }

  if (isLoading || !isVisible) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden border-2 shadow-xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950 dark:via-emerald-950 dark:to-teal-950">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-green-500/10 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
      
      <CardContent className="relative p-8 lg:p-10">
        {/* Dismiss Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-white/50"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
          {/* Left: Icon & Celebration */}
          <div className="flex-shrink-0 text-center lg:text-left">
            <div className="inline-flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg mb-4">
              <PartyPopper className="h-10 w-10 lg:h-12 lg:h-12 text-white" />
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <Sparkles className="h-4 w-4 text-amber-400" />
              <Sparkles className="h-3 w-3 text-amber-300" />
            </div>
          </div>

          {/* Center: Content */}
          <div className="flex-1 text-center lg:text-left space-y-3">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                🎉 Congratulations!
              </h2>
              <p className="text-lg text-foreground/90">
                Your business setup is complete and you're ready to go!
              </p>
            </div>

            <p className="text-base text-foreground/70">
              Now it's time to invite your first clients. They can download the Skedence app 
              and book sessions directly with you.
            </p>

            {/* Feature Highlights */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Download className="h-4 w-4 text-primary" />
                <span>Mobile app ready</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Users className="h-4 w-4 text-primary" />
                <span>Accept bookings 24/7</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Automated payments</span>
              </div>
            </div>
          </div>

          {/* Right: CTA */}
          <div className="flex-shrink-0 w-full lg:w-auto">
            <Link href="/clients">
              <Button 
                size="lg" 
                className="w-full lg:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all group"
              >
                <Users className="mr-2 h-5 w-5" />
                Invite Your First Client
                <ChevronRight className="ml-1 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
