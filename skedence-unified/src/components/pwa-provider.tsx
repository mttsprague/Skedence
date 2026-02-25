'use client';

import { useEffect } from 'react';
import { registerServiceWorker, setupInstallPrompt } from '@/lib/pwa';

export function PWAProvider() {
  useEffect(() => {
    // Register service worker
    registerServiceWorker();
    
    // Setup install prompt
    setupInstallPrompt();
  }, []);

  return null; // This is a logic-only component
}
