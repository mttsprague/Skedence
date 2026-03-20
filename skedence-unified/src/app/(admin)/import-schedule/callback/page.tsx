'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orgId } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Connecting your Google Calendar...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get authorization code from URL
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state');

        if (error) {
          setStatus('error');
          setMessage(`Authorization failed: ${error}`);
          setTimeout(() => router.push('/import-schedule'), 3000);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received');
          setTimeout(() => router.push('/import-schedule'), 3000);
          return;
        }

        // Parse state to get orgId
        let stateOrgId = orgId;
        if (state) {
          try {
            const stateData = JSON.parse(state);
            stateOrgId = stateData.orgId || orgId;
          } catch (e) {
            console.error('Failed to parse state:', e);
          }
        }

        if (!stateOrgId) {
          setStatus('error');
          setMessage('Organization ID not found');
          setTimeout(() => router.push('/import-schedule'), 3000);
          return;
        }

        // Call Cloud Function to exchange code for tokens
        const completeAuth = httpsCallable(functions, 'completeGoogleCalendarAuth');
        const result = await completeAuth({
          orgId: stateOrgId,
          code: code,
        }) as { data: { success: boolean; calendarId: string; calendarName: string } };

        if (result.data.success) {
          setStatus('success');
          setMessage(`Successfully connected ${result.data.calendarName}!`);
          setTimeout(() => router.push('/import-schedule'), 2000);
        } else {
          throw new Error('Failed to complete authorization');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to connect calendar');
        setTimeout(() => router.push('/import-schedule'), 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, orgId, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Connecting Calendar</h2>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Success!</h2>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground mt-2">Redirecting...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Connection Failed</h2>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground mt-2">Redirecting...</p>
          </>
        )}
      </div>
    </div>
  );
}
