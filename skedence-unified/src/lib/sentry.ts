import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry in production
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    
    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    
    // Session replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of error sessions
    
    // Filter sensitive data
    beforeSend(event) {
      // Remove PII
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      
      // Filter Firebase API keys from errors
      if (event.exception) {
        const values = event.exception.values || [];
        values.forEach(value => {
          if (value.value) {
            value.value = value.value.replace(/apiKey=[^&amp;]+/g, 'apiKey=REDACTED');
          }
        });
      }
      
      return event;
    },
    
    // Environment and release tracking
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || undefined,
    
    // Integrations
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

export { Sentry };
