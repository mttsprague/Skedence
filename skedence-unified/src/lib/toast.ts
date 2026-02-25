/**
 * Toast Notification Helpers
 * Provides consistent toast notifications across the app
 */

import { toast as sonnerToast } from 'sonner';

export const toast = {
  /**
   * Success notification
   */
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Error notification
   */
  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      duration: 5000,
    });
  },

  /**
   * Info notification
   */
  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Warning notification
   */
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      duration: 4500,
    });
  },

  /**
   * Loading notification with promise
   */
  promise: async <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading,
      success,
      error,
    });
  },

  /**
   * Custom notification
   */
  custom: (message: string, options?: any) => {
    sonnerToast(message, options);
  },

  /**
   * Dismiss specific toast
   */
  dismiss: (id?: string | number) => {
    sonnerToast.dismiss(id);
  },
};

/**
 * Common toast messages
 */
export const toastMessages = {
  // CRUD operations
  created: (item: string) => toast.success(`${item} created successfully`),
  updated: (item: string) => toast.success(`${item} updated successfully`),
  deleted: (item: string) => toast.success(`${item} deleted successfully`),
  
  // Errors
  loadError: (item: string) => toast.error(`Failed to load ${item}`, 'Please try refreshing the page'),
  saveError: (item: string) => toast.error(`Failed to save ${item}`, 'Please try again'),
  deleteError: (item: string) => toast.error(`Failed to delete ${item}`, 'Please try again'),
  
  // Generic
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  copying: (item: string) => toast.success(`${item} copied to clipboard`),
  
  // Auth
  signedOut: () => toast.info('Signed out successfully'),
  unauthorized: () => toast.error('Unauthorized', 'Please sign in to continue'),
  
  // Network
  offline: () => toast.warning('You are offline', 'Changes will sync when connection is restored'),
  online: () => toast.info('Back online', 'Syncing changes...'),
};
