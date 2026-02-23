/**
 * Environment-aware logging utility
 * 
 * In production, logs are suppressed or sent to monitoring services.
 * In development, full logging is enabled.
 */

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
    }
  }

  error(...args: any[]) {
    // Always log errors, but sanitize in production
    if (this.isDevelopment) {
      console.error(...args);
    } else {
      // Log generic error message, send details to monitoring service
      console.error('An error occurred');
      // TODO: Send to Sentry, LogRocket, or other error tracking service
      // Example: Sentry.captureException(args[0]);
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
