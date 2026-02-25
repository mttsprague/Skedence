/**
 * Focus Management Utilities
 * Provides helpers for managing focus states, keyboard navigation, and accessibility
 */

/**
 * Creates a focus trap for modals/dialogs
 * Keeps focus within the specified element
 */
export function createFocusTrap(element: HTMLElement) {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  function trapFocus(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  }

  element.addEventListener('keydown', trapFocus);

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', trapFocus);
  };
}

/**
 * Saves current focus and returns a function to restore it
 * Useful for modals/sheets that should return focus on close
 */
export function saveFocus() {
  const previouslyFocused = document.activeElement as HTMLElement;
  
  return () => {
    previouslyFocused?.focus();
  };
}

/**
 * Hook for keyboard shortcuts
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  } = {}
) {
  if (typeof window === 'undefined') return;

  const handleKeyDown = (e: KeyboardEvent) => {
    const matchesKey = e.key.toLowerCase() === key.toLowerCase();
    const matchesCtrl = options.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
    const matchesShift = options.shift ? e.shiftKey : !e.shiftKey;
    const matchesAlt = options.alt ? e.altKey : !e.altKey;

    if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
      e.preventDefault();
      callback();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }
}

/**
 * Announces message to screen readers
 * Uses ARIA live region for dynamic content
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Checks if element is visible on screen
 * Useful for skip links and focus management
 */
export function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Focuses first error in a form
 * Useful for form validation
 */
export function focusFirstError(formElement: HTMLElement) {
  const firstError = formElement.querySelector<HTMLElement>(
    '[aria-invalid="true"], .error input, .error select, .error textarea'
  );
  
  if (firstError) {
    firstError.focus();
    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Gets readable color contrast ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  // Simplified contrast calculation
  // For production, use a library like chroma-js or color-contrast-checker
  const getLuminance = (color: string) => {
    // Basic luminance calculation
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if color contrast meets WCAG AA standards
 */
export function meetsWCAGAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}
