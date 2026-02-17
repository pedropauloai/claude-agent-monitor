import { useEffect } from 'react';

interface ShortcutHandler {
  /** The key to listen for (e.g., ',', 'Escape', 'k') */
  key: string;
  /** Require Ctrl (or Cmd on macOS) */
  ctrl?: boolean;
  /** Require Alt */
  alt?: boolean;
  /** Require Shift */
  shift?: boolean;
  /** Callback fired when the shortcut is triggered */
  handler: () => void;
  /** Human-readable description of the shortcut (for help/tooltips) */
  description: string;
}

/**
 * useKeyboardShortcuts - Hook para atalhos de teclado globais.
 *
 * Registers global keydown listeners for the provided shortcuts.
 * Automatically ignores events from input, textarea, and contentEditable elements
 * to avoid interfering with text editing.
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: ',', ctrl: true, handler: openSettings, description: 'Open settings' },
 *   { key: 'Escape', handler: closeModal, description: 'Close modal' },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const altMatch = shortcut.alt ? e.altKey : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : true;

        if (e.key === shortcut.key && ctrlMatch && altMatch && shiftMatch) {
          // Do not fire shortcuts inside text input elements
          const target = e.target as HTMLElement;
          if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
          ) {
            return;
          }

          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
