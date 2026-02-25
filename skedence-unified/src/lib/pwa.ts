/**
 * Service Worker Registration
 * Registers service worker for offline support and caching
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });

  // Listen for service worker updates
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('New service worker activated');
    // Optionally show a notification to user about update
  });
}

/**
 * Unregister service worker (for development/debugging)
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    await registration.unregister();
  }
  return true;
}

/**
 * Check if app is running as PWA
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Prompt user to install PWA
 */
export function setupInstallPrompt() {
  if (typeof window === 'undefined') return;

  let deferredPrompt: any;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default install prompt
    e.preventDefault();
    deferredPrompt = e;

    // Show custom install button/banner
    const installBanner = document.getElementById('install-banner');
    if (installBanner) {
      installBanner.style.display = 'block';
    }

    // Store for later use
    (window as any).deferredInstallPrompt = deferredPrompt;
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
  });
}

/**
 * Trigger install prompt programmatically
 */
export async function promptInstall(): Promise<boolean> {
  const deferredPrompt = (window as any).deferredInstallPrompt;

  if (!deferredPrompt) {
    return false;
  }

  // Show prompt
  deferredPrompt.prompt();

  // Wait for user choice
  const { outcome } = await deferredPrompt.userChoice;
  
  console.log(`User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);

  // Clear the deferred prompt
  (window as any).deferredInstallPrompt = null;

  return outcome === 'accepted';
}
