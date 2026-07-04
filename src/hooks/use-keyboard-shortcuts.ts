"use client";

import * as React from "react";

/**
 * Keyboard shortcuts for power-user culling. Returns the last action
 * triggered (for toast feedback) or null.
 *
 * Shortcuts (ignored when typing in an input/textarea, or when a dialog
 * is open — except Escape which is handled by the dialog itself):
 *   j / ArrowDown  — select next portrait
 *   k / ArrowUp    — select previous portrait
 *   Enter          — open detail for selected
 *   f              — toggle flag (pin) on selected
 *   x              — toggle reject on selected
 *   r              — retry evaluation on selected (if errored)
 *   a              — select all / clear selection (in select mode)
 *   ?              — toggle shortcut help
 */
export interface ShortcutHandlers {
  onNext: () => void;
  onPrev: () => void;
  onOpenDetail: () => void;
  onTogglePin: () => void;
  onToggleReject: () => void;
  onRetry: () => void;
  onToggleHelp: () => void;
}

export function useKeyboardShortcuts(
  handlers: ShortcutHandlers,
  enabled: boolean
) {
  const ref = React.useRef(handlers);
  React.useEffect(() => {
    ref.current = handlers;
  });
  React.useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      // Don't intercept when a dialog/modal is open — let it handle Escape.
      if (document.querySelector('[role="dialog"]')) return;

      const h = ref.current;
      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          h.onNext();
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          h.onPrev();
          break;
        case "Enter":
          e.preventDefault();
          h.onOpenDetail();
          break;
        case "f":
        case "F":
          e.preventDefault();
          h.onTogglePin();
          break;
        case "x":
        case "X":
          e.preventDefault();
          h.onToggleReject();
          break;
        case "r":
        case "R":
          e.preventDefault();
          h.onRetry();
          break;
        case "?":
          e.preventDefault();
          h.onToggleHelp();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
