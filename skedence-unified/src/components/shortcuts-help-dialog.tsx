'use client';

import { useEffect, useState } from 'react';
import { X, Keyboard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getGlobalShortcuts, formatShortcut, type KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';

export function ShortcutsHelpDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const shortcuts = getGlobalShortcuts();
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');

  useEffect(() => {
    const handleShowShortcuts = () => setIsOpen(true);
    window.addEventListener('show-shortcuts-help', handleShowShortcuts);
    return () => window.removeEventListener('show-shortcuts-help', handleShowShortcuts);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
        aria-label="Keyboard shortcuts help dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Keyboard className="w-6 h-6" aria-hidden="true" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Navigation Shortcuts */}
          <section>
            <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">
              Navigation
            </h3>
            <div className="space-y-2">
              {shortcuts.navigation.map((shortcut, index) => (
                <ShortcutRow key={index} shortcut={shortcut} isMac={isMac} />
              ))}
            </div>
          </section>

          {/* Action Shortcuts */}
          <section>
            <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">
              Actions
            </h3>
            <div className="space-y-2">
              {shortcuts.actions.map((shortcut, index) => (
                <ShortcutRow key={index} shortcut={shortcut} isMac={isMac} />
              ))}
            </div>
          </section>

          {/* Dialog Shortcuts */}
          <section>
            <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">
              Dialogs & Forms
            </h3>
            <div className="space-y-2">
              {shortcuts.dialogs.map((shortcut, index) => (
                <ShortcutRow key={index} shortcut={shortcut} isMac={isMac} />
              ))}
            </div>
          </section>

          {/* Tips */}
          <section className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-300">
              Pro Tips
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs border border-gray-300 dark:border-gray-600">{isMac ? '⌘' : 'Ctrl'}K</kbd> anywhere to open the command palette for quick actions</li>
              <li>Use <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs border border-gray-300 dark:border-gray-600">Alt</kbd> + number keys for instant navigation between sections</li>
              <li>Most shortcuts work context-aware based on the current page</li>
            </ul>
          </section>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close keyboard shortcuts dialog"
        >
          <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
        </button>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutRow({ shortcut, isMac }: { shortcut: KeyboardShortcut; isMac: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {shortcut.description}
      </span>
      <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 min-w-[80px] text-center">
        {formatShortcut(shortcut)}
      </kbd>
    </div>
  );
}
