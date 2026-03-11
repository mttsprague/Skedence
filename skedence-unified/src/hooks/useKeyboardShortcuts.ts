'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'dialogs' | 'forms';
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts?: KeyboardShortcut[];
}

/**
 * Global keyboard shortcuts hook
 * Provides a centralized way to register and handle keyboard shortcuts
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, shortcuts = [] } = options;
  const router = useRouter();
  const pathname = usePathname();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs (except for specific cases)
    const target = event.target as HTMLElement;
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    const isContentEditable = target.isContentEditable;

    // Check custom shortcuts first
    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;
      
      if (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        ctrlMatch &&
        altMatch &&
        shiftMatch
      ) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }

    // Global navigation shortcuts (Alt+Number)
    if (event.altKey && !event.ctrlKey && !event.shiftKey) {
      switch (event.key) {
        case '1':
          event.preventDefault();
          router.push('/reports/appointments');
          break;
        case '2':
          event.preventDefault();
          router.push('/activity');
          break;
        case '3':
          event.preventDefault();
          router.push('/clients');
          break;
        case '4':
          event.preventDefault();
          router.push('/trainers');
          break;
        case '5':
          event.preventDefault();
          router.push('/scheduling');
          break;
        case '6':
          event.preventDefault();
          router.push('/passes');
          break;
        case '7':
          event.preventDefault();
          router.push('/pricing');
          break;
        case '8':
          event.preventDefault();
          router.push('/settings');
          break;
      }
      return;
    }

    // Ctrl+/ or ? - Show shortcuts help
    if ((event.ctrlKey || event.metaKey) && event.key === '/') {
      event.preventDefault();
      // Dispatch custom event for shortcuts help dialog
      window.dispatchEvent(new CustomEvent('show-shortcuts-help'));
      return;
    }

    // ? key (Shift+/) - Show shortcuts help (when not typing)
    if (event.key === '?' && !isTyping && !isContentEditable) {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent('show-shortcuts-help'));
      return;
    }

    // Ctrl+N - Context-aware "New" action
    if ((event.ctrlKey || event.metaKey) && event.key === 'n' && !isTyping) {
      event.preventDefault();
      
      // Context-aware new action based on current page
      if (pathname.includes('/clients')) {
        window.dispatchEvent(new CustomEvent('trigger-new-client'));
      } else if (pathname.includes('/trainers')) {
        window.dispatchEvent(new CustomEvent('trigger-new-trainer'));
      } else if (pathname.includes('/scheduling')) {
        window.dispatchEvent(new CustomEvent('trigger-new-schedule'));
      } else if (pathname.includes('/passes')) {
        window.dispatchEvent(new CustomEvent('trigger-new-pass'));
      }
      return;
    }

    // Ctrl+E - Export data (on reports/list pages)
    if ((event.ctrlKey || event.metaKey) && event.key === 'e' && !isTyping) {
      if (pathname.includes('/reports/') || pathname.includes('/clients') || pathname.includes('/trainers')) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('trigger-export'));
      }
      return;
    }

    // Ctrl+F - Focus search (if search input exists)
    if ((event.ctrlKey || event.metaKey) && event.key === 'f' && !isTyping) {
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search" i]') as HTMLInputElement;
      if (searchInput) {
        event.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
      return;
    }

  }, [enabled, shortcuts, router, pathname]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Get all available shortcuts for the help dialog
 */
export function getGlobalShortcuts(): Record<string, KeyboardShortcut[]> {
  return {
    navigation: [
      { key: 'K', ctrl: true, description: 'Open command palette', action: () => {}, category: 'navigation' },
      { key: '/', ctrl: true, description: 'Show keyboard shortcuts', action: () => {}, category: 'navigation' },
      { key: '?', description: 'Show keyboard shortcuts', action: () => {}, category: 'navigation' },
      { key: '1', alt: true, description: 'Go to Reports', action: () => {}, category: 'navigation' },
      { key: '2', alt: true, description: 'Go to Activity', action: () => {}, category: 'navigation' },
      { key: '3', alt: true, description: 'Go to Clients', action: () => {}, category: 'navigation' },
      { key: '4', alt: true, description: 'Go to Trainers', action: () => {}, category: 'navigation' },
      { key: '5', alt: true, description: 'Go to Schedule', action: () => {}, category: 'navigation' },
      { key: '6', alt: true, description: 'Go to Passes', action: () => {}, category: 'navigation' },
      { key: '7', alt: true, description: 'Go to Pricing', action: () => {}, category: 'navigation' },
      { key: '8', alt: true, description: 'Go to Settings', action: () => {}, category: 'navigation' },
      { key: 'F', ctrl: true, description: 'Focus search box', action: () => {}, category: 'navigation' },
    ],
    actions: [
      { key: 'N', ctrl: true, description: 'New item (context-aware)', action: () => {}, category: 'actions' },
      { key: 'E', ctrl: true, description: 'Export data', action: () => {}, category: 'actions' },
      { key: 'S', ctrl: true, description: 'Save changes', action: () => {}, category: 'actions' },
    ],
    dialogs: [
      { key: 'Escape', description: 'Close dialog/modal', action: () => {}, category: 'dialogs' },
      { key: 'Enter', ctrl: true, description: 'Submit form', action: () => {}, category: 'dialogs' },
    ],
  };
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
  
  if (shortcut.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (shortcut.meta) parts.push('⌘');
  
  // Capitalize single letter keys
  const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
  parts.push(key);
  
  return parts.join(isMac ? '' : '+');
}
