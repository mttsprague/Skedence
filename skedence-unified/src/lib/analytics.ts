/**
 * Google Tag Manager & Analytics Tracking Utility
 * 
 * Usage:
 * import { trackEvent, trackPageView } from '@/lib/analytics';
 * 
 * trackEvent('subscription_started', { plan: 'Studio', trial: true });
 * trackPageView('/dashboard');
 */

// Type definitions for analytics events
type EventParams = Record<string, string | number | boolean | undefined>;
type DataLayerObject = Record<string, string | number | boolean | undefined | EventParams | object>;

// Extend Window interface for dataLayer
declare global {
  interface Window {
    dataLayer: DataLayerObject[];
  }
}

/**
 * Track Custom Events
 * Sends events to Google Tag Manager dataLayer
 */
export const trackEvent = (
  eventName: string,
  eventParams?: EventParams
) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...eventParams,
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', eventName, eventParams);
    }
  }
};

/**
 * Track Page Views
 */
export const trackPageView = (path: string, title?: string) => {
  trackEvent('page_view', {
    page_path: path,
    page_title: title || document.title,
  });
};

/**
 * Track User Authentication Events
 */
export const trackAuth = {
  signUp: (method: string, orgId?: string) => {
    trackEvent('sign_up', {
      method,
      org_id: orgId,
    });
  },
  
  login: (method: string) => {
    trackEvent('login', {
      method,
    });
  },
  
  logout: () => {
    trackEvent('logout');
  },
};

/**
 * Track Subscription Events
 */
export const trackSubscription = {
  started: (plan: string, isTrial: boolean, price: number) => {
    trackEvent('subscription_started', {
      plan_name: plan,
      is_trial: isTrial,
      price,
      currency: 'USD',
    });
  },
  
  upgraded: (fromPlan: string, toPlan: string, price: number) => {
    trackEvent('subscription_upgraded', {
      from_plan: fromPlan,
      to_plan: toPlan,
      price,
      currency: 'USD',
    });
  },
  
  cancelled: (plan: string, reason?: string) => {
    trackEvent('subscription_cancelled', {
      plan_name: plan,
      cancellation_reason: reason,
    });
  },
  
  trialEnded: (plan: string, converted: boolean) => {
    trackEvent('trial_ended', {
      plan_name: plan,
      converted_to_paid: converted,
    });
  },
};

/**
 * Track Business Actions
 */
export const trackBusiness = {
  clientAdded: (orgId: string) => {
    trackEvent('client_added', {
      org_id: orgId,
    });
  },
  
  trainerAdded: (orgId: string) => {
    trackEvent('trainer_added', {
      org_id: orgId,
    });
  },
  
  packageCreated: (packageType: string, price: number) => {
    trackEvent('package_created', {
      package_type: packageType,
      price,
      currency: 'USD',
    });
  },
  
  bookingCreated: (orgId: string) => {
    trackEvent('booking_created', {
      org_id: orgId,
    });
  },
  
  stripeConnected: (orgId: string) => {
    trackEvent('stripe_connected', {
      org_id: orgId,
    });
  },
};

/**
 * Track Feature Usage
 */
export const trackFeature = {
  used: (featureName: string, details?: EventParams) => {
    trackEvent('feature_used', {
      feature_name: featureName,
      ...details,
    });
  },
  
  search: (searchTerm: string, resultCount: number) => {
    trackEvent('search', {
      search_term: searchTerm,
      result_count: resultCount,
    });
  },
  
  export: (exportType: string, itemCount: number) => {
    trackEvent('data_exported', {
      export_type: exportType,
      item_count: itemCount,
    });
  },
};

/**
 * Track Errors
 */
export const trackError = (
  errorType: string,
  errorMessage: string,
  context?: EventParams
) => {
  trackEvent('error_occurred', {
    error_type: errorType,
    error_message: errorMessage,
    ...context,
  });
};

/**
 * Track Button Clicks
 */
export const trackClick = (
  buttonName: string,
  location: string,
  details?: EventParams
) => {
  trackEvent('button_clicked', {
    button_name: buttonName,
    location,
    ...details,
  });
};

/**
 * Set User Properties
 * Use this to identify users and their properties
 */
export const setUserProperties = (properties: {
  userId?: string;
  orgId?: string;
  role?: string;
  subscriptionTier?: string;
  [key: string]: string | number | boolean | undefined;
}) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'user_properties_set',
      user_properties: properties,
    });
  }
};
