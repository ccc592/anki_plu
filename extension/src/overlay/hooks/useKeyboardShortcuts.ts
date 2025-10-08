import { useEffect } from 'react';

export interface KeyboardShortcutHandlers {
  onSubmit?: () => void;
  onSelectNext?: () => void;
  onSelectPrevious?: () => void;
  onToggleCurrent?: () => void;
  onSelectAll?: () => void;
  onClose?: () => void;
}

export const useKeyboardShortcuts = (handlers: KeyboardShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Enter: Submit
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handlers.onSubmit?.();
        return;
      }

      // Ctrl/Cmd + A: Select all
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        handlers.onSelectAll?.();
        return;
      }

      // ESC: Close
      if (event.key === 'Escape') {
        event.preventDefault();
        handlers.onClose?.();
        return;
      }

      // Don't handle navigation shortcuts if user is typing in input
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Arrow Up: Previous card
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        handlers.onSelectPrevious?.();
        return;
      }

      // Arrow Down: Next card
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        handlers.onSelectNext?.();
        return;
      }

      // Space: Toggle current card selection
      if (event.key === ' ') {
        event.preventDefault();
        handlers.onToggleCurrent?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};
