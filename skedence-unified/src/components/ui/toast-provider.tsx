'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster 
      position="top-right" 
      expand={false}
      richColors
      closeButton
      toastOptions={{
        style: {
          background: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          border: '1px solid hsl(var(--border))',
        },
        className: 'toast',
      }}
      aria-live="polite"
      aria-atomic="true"
    />
  );
}
