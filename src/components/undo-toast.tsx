"use client";

import { useHeadshotStore } from "@/store/headshot-store";
import { Undo, X } from "lucide-react";

/** Undo toast — appears after destructive actions with a 6s window. */
export function UndoToast() {
  const undoToast = useHeadshotStore((s) => s.undoToast);
  const performUndo = useHeadshotStore((s) => s.performUndo);
  const dismissUndoToast = useHeadshotStore((s) => s.dismissUndoToast);

  if (!undoToast) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 shadow-lg">
      <span className="text-xs text-muted-foreground">{undoToast.label}</span>
      <button
        type="button"
        onClick={() => performUndo()}
        className="inline-flex items-center gap-1 text-xs font-medium text-spotlight hover:underline"
      >
        <Undo className="h-3.5 w-3.5" />
        Undo
      </button>
      <button
        type="button"
        onClick={() => dismissUndoToast()}
        className="ml-1 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
