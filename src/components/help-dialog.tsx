"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHeadshotStore } from "@/store/headshot-store";
import { Keyboard } from "lucide-react";

const SHORTCUTS = [
  { keys: ["J", "↓"], desc: "Select next portrait" },
  { keys: ["K", "↑"], desc: "Select previous portrait" },
  { keys: ["Enter"], desc: "Open detail for selected" },
  { keys: ["F"], desc: "Toggle pin (flag)" },
  { keys: ["X"], desc: "Toggle reject" },
  { keys: ["R"], desc: "Retry evaluation (if errored)" },
  { keys: ["?"], desc: "Toggle this help" },
  { keys: ["Esc"], desc: "Close dialog / detail" },
];

export function HelpDialog() {
  const open = useHeadshotStore((s) => s.helpOpen);
  const setOpen = useHeadshotStore((s) => s.setHelpOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-spotlight/10">
            <Keyboard className="h-5 w-5 text-spotlight" />
          </div>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          {SHORTCUTS.map((s) => (
            <div
              key={s.desc}
              className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
            >
              <span className="text-sm text-muted-foreground">{s.desc}</span>
              <div className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 text-xs font-medium"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Shortcuts are disabled while typing in an input or when a dialog is
          open.
        </p>
      </DialogContent>
    </Dialog>
  );
}
