'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Circle, 
  CreditCard, 
  Users, 
  DollarSign, 
  Settings, 
  Calendar,
  UserPlus,
  X,
  Rocket
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc, setDoc, getFirestore, collection, query, where, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { OnboardingCelebration } from './onboarding-celebration';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  link: string;
  completed: boolean;
}

interface OnboardingProgress {
  stripeConnected: boolean;
  hasTrainers: boolean;
  hasPricing: boolean;
  hasSettings: boolean;
  hasAvailability: boolean;
  dismissed: boolean;
  celebrationDismissed?: boolean;
}

export function OnboardingChecklist() {
  const { user, orgId } = useAuth();
  const [progress, setProgress] = useState<OnboardingProgress>({
    stripeConnected: false,
    hasTrainers: false,
    hasPricing: false,
    hasSettings: false,
    hasAvailability: false,
    dismissed: false,
    celebrationDismissed: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    const db = getFirestore();
    
    // Set up real-time listener for onboarding progress
    const onboardingRef = doc(db, 'organizations', orgId, 'settings', 'onboarding');
    
    const unsubscribe = onSnapshot(
      onboardingRef,
      (snapshot) => {
        console.log('📊 Onboarding Checklist: Received snapshot update');
        if (snapshot.exists()) {
          const data = snapshot.data() as OnboardingProgress;
          console.log('📊 Onboarding progress data:', data);
          setProgress(data);
          setIsVisible(!data.dismissed);
          setIsLoading(false);
        } else {
          console.log('📊 No onboarding doc exists, checking actual progress');
          // Check actual progress from other collections
          checkActualProgress();
        }
      },
      (error) => {
        console.error('❌ Error loading onboarding progress:', error);
        setIsLoading(false);
      }
    );
    
    // Clean up listener on unmount
    return () => unsubscribe();
  }, [orgId]);

  async function checkActualProgress() {
    if (!orgId) return;

    const db = getFirestore();
    const newProgress: OnboardingProgress = {
      stripeConnected: false,
      hasTrainers: false,
      hasPricing: false,
      hasSettings: false,
      hasAvailability: false,
      dismissed: false,
      celebrationDismissed: false
    };

    try {
      // Check Stripe and organization settings
      const orgDoc = await getDoc(doc(db, 'organizations', orgId));
      if (orgDoc.exists()) {
        const orgData = orgDoc.data();
        // Check for Stripe API keys (publishableKey and secretKey)
        newProgress.stripeConnected = !!orgData.stripe?.publishableKey && !!orgData.stripe?.secretKey;
        newProgress.hasPricing = !!orgData.pricingStructure?.tiers && orgData.pricingStructure.tiers.length > 0;
        newProgress.hasSettings = !!orgData.name && !!orgData.adminEmail;
      }

      // Check for trainers
      const trainersQuery = query(
        collection(db, 'trainers'),
        where('orgId', '==', orgId),
        limit(1)
      );
      const trainersSnapshot = await getDocs(trainersQuery);
      newProgress.hasTrainers = !trainersSnapshot.empty;

      // Check for any schedules (availability)
      const schedulesCount = await checkForSchedules();
      newProgress.hasAvailability = schedulesCount > 0;

      setProgress(newProgress);
      
      // Save initial progress
      const onboardingRef = doc(db, 'organizations', orgId, 'settings', 'onboarding');
      await setDoc(onboardingRef, newProgress);
    } catch (error) {
      console.error('Error checking progress:', error);
    }
  }

  async function checkForSchedules() {
    if (!orgId) return 0;
    
    try {
      const db = getFirestore();
      
      // Get all trainers for this org
      const trainersQuery = query(
        collection(db, 'trainers'),
        where('orgId', '==', orgId)
      );
      const trainersSnapshot = await getDocs(trainersQuery);
      
      // Check if any trainer has schedules
      for (const trainerDoc of trainersSnapshot.docs) {
        const schedulesQuery = query(
          collection(db, 'trainers', trainerDoc.id, 'schedules'),
          limit(1)
        );
        const schedulesSnapshot = await getDocs(schedulesQuery);
        if (!schedulesSnapshot.empty) {
          return 1;
        }
      }
      
      return 0;
    } catch (error) {
      console.error('Error checking schedules:', error);
      return 0;
    }
  }

  async function handleDismiss() {
    if (!orgId) return;

    try {
      const db = getFirestore();
      const onboardingRef = doc(db, 'organizations', orgId, 'settings', 'onboarding');
      await setDoc(onboardingRef, { ...progress, dismissed: true });
      setIsVisible(false);
    } catch (error) {
      console.error('Error dismissing onboarding:', error);
    }
  }

  async function markStepComplete(stepId: keyof OnboardingProgress) {
    if (!orgId) return;

    const newProgress = { ...progress, [stepId]: true };
    setProgress(newProgress);

    try {
      const db = getFirestore();
      const onboardingRef = doc(db, 'organizations', orgId, 'settings', 'onboarding');
      await setDoc(onboardingRef, newProgress);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }

  const steps: OnboardingStep[] = [
    {
      id: 'stripeConnected',
      title: 'Connect Stripe Account',
      description: 'Set up payment processing to accept bookings',
      icon: CreditCard,
      link: '/settings/stripe',
      completed: progress.stripeConnected
    },
    {
      id: 'hasTrainers',
      title: 'Add Your First Trainer',
      description: 'Add trainers who will provide services',
      icon: Users,
      link: '/trainers',
      completed: progress.hasTrainers
    },
    {
      id: 'hasPricing',
      title: 'Set Up Pricing',
      description: 'Configure your pricing structure and packages',
      icon: DollarSign,
      link: '/pricing',
      completed: progress.hasPricing
    },
    {
      id: 'hasSettings',
      title: 'Configure Business Settings',
      description: 'Set up locations, hours, and preferences',
      icon: Settings,
      link: '/settings',
      completed: progress.hasSettings
    },
    {
      id: 'hasAvailability',
      title: 'Create Trainer Availability',
      description: 'Set when trainers are available for bookings',
      icon: Calendar,
      link: '/scheduling',
      completed: progress.hasAvailability
    }
  ];

  const completedCount = steps.filter(step => step.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;
  const isComplete = completedCount === steps.length;

  if (isLoading) {
    return null;
  }

  // Show celebration when complete (unless dismissed)
  if (isComplete && !progress.celebrationDismissed) {
    return <OnboardingCelebration />;
  }

  // Hide checklist if dismissed and not complete
  if (!isVisible && !isComplete) {
    return null;
  }

  // If complete and celebration was dismissed, hide everything
  if (isComplete && progress.celebrationDismissed) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Get Started with Skedence</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Complete these steps to start accepting bookings
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{completedCount} of {steps.length} completed</span>
            <span className="text-muted-foreground">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.id}
              href={step.link}
              className="block"
            >
              <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-md hover:border-primary/30 ${
                step.completed ? 'bg-green-50 border-green-200' : 'hover:bg-accent'
              }`}>
                <div className="flex-shrink-0 mt-0.5">
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${step.completed ? 'text-green-600' : 'text-primary'}`} />
                    <span className={`font-medium ${step.completed ? 'text-green-900 line-through' : ''}`}>
                      {step.title}
                    </span>
                  </div>
                  <p className={`text-sm ${step.completed ? 'text-green-700' : 'text-muted-foreground'}`}>
                    {step.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
        
        <div className="pt-3 border-t">
          <p className="text-xs text-center text-muted-foreground">
            Need help? Check out our{' '}
            <a href="mailto:support@skedence.com" className="text-primary hover:underline">
              support documentation
            </a>
            {' '}or{' '}
            <a href="mailto:support@skedence.com" className="text-primary hover:underline">
              contact us
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
