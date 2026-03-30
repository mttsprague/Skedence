'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect } from 'react';

// Type for Crisp chat widget
interface CrispWindow extends Window {
  $crisp?: Array<[string, string] | [string, string, string]> & {
    push: (command: [string, string]) => void;
  };
}

declare global {
  interface Window {
    $crisp?: CrispWindow['$crisp'];
  }
}

/**
 * Crisp Chat Widget - Conditionally loaded based on current route
 * Only appears on marketing pages, support pages, and sport pages
 * Excluded from: Admin portal, auth pages, blog admin, checkout
 */
export default function CrispChat() {
  const pathname = usePathname();

  // Don't load Crisp on these paths (admin portal, auth, blog admin)
  const excludedPaths = [
    // Admin portal pages
    '/dashboard',
    '/clients',
    '/trainers',
    '/bookings',
    '/scheduling',
    '/passes',
    '/pricing',
    '/classes',
    '/analytics',
    '/reports',
    '/settings',
    '/activity',
    '/availability',
    '/locations',
    '/subscription',
    '/waiver',
    '/blog-management',
    '/getting-started',
    // Auth pages
    '/login',
    '/register',
    '/setup-password',
    // Blog admin
    '/blog-admin',
    // Checkout
    '/checkout',
  ];

  // Check if current path starts with any excluded path
  const isExcluded = excludedPaths.some(path => pathname?.startsWith(path));
  
  // Hide/show Crisp widget based on current path
  useEffect(() => {
    // Wait for Crisp to be available
    const checkCrisp = setInterval(() => {
      if (typeof window !== 'undefined' && window.$crisp) {
        clearInterval(checkCrisp);
        
        if (isExcluded) {
          // Hide chat on excluded pages
          window.$crisp.push(['do', 'chat:hide']);
        } else {
          // Show chat on marketing pages
          window.$crisp.push(['do', 'chat:show']);
        }
      }
    }, 100);

    // Cleanup
    return () => clearInterval(checkCrisp);
  }, [pathname, isExcluded]);
  
  // Only load the script once on marketing pages
  if (isExcluded) {
    return null;
  }

  return (
    <Script
      id="crisp-chat"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          window.$crisp=[];
          window.CRISP_WEBSITE_ID="61108fde-6e52-4e72-b95d-8e259698df87";
          (function(){
            d=document;
            s=d.createElement("script");
            s.src="https://client.crisp.chat/l.js";
            s.async=1;
            d.getElementsByTagName("head")[0].appendChild(s);
          })();
        `,
      }}
    />
  );
}
