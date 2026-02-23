/**
 * Environment-aware logging utility
 * 
 * In production, logs are suppressed or sent to monitoring services (Sentry).
 * In development, full logging is enabled.
 */

import { Sentry } from './sentry';

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  log(...args: any[]) {
    if (this.isDevelopment) {
      console.log(...args);
    }
  }

  info(...args: any[]) {
    if (this.isDevelopment) {
      console.info(...args);
    }
  }

  warn(...args: any[]) {
    if (this.isDevelopment) {
      console.warn(...args);
    } else {
      // In production, still log warnings but without details
      console.warn('A warning occurred');
      
      // Send to Sentry in production
      if (typeof Sentry !== 'undefined') {
        Sentry.captureMessage(args[0]?.toString() || 'Warning', 'warning');
      }
    }
  }

  error(...args: any[]) {
    // Always log errors, but sanitize in production
    if (this.isDevelopment) {
      console.error(...args);
    } else {
      // Log generic error message, send details to Sentry
      console.error('An error occurred');
      
      // Send to Sentry
      if (typeof Sentry !== 'undefined') {
        const error = args[0];
        if (error instanceof Error) {
          Sentry.captureException(error);
        } else {
          Sentry.captureMessage(String(error), 'error');
        }
      }
    }
  }

  debug(...args: any[]) {
    if (this.isDevelopment) {
      console.debug(...args);
    }
  }

  /**
   * Log with conditional visibility
   * Use this for sensitive operations that should only be visible in dev
   */
  secureLog(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`[SECURE] ${message}`, data);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for advanced use cases
export default logger;
