"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { useHeadshotStore } from "@/store/headshot-store";

/** Consent modal — shown before any feedback/outcome data is logged. */
export function ConsentModal() {
  const open = useHeadshotStore((s) => s.consentModalOpen);
  const consentGranted = useHeadshotStore((s) => s.consentGranted);
  const setConsent = useHeadshotStore((s) => s.setConsent);
  const setConsentModalOpen = useHeadshotStore((s) => s.setConsentModalOpen);

  // Show if explicitly opened, or if consent hasn't been decided yet.
  const shouldShow = open || consentGranted === null;

  return (
    <Dialog open={shouldShow} onOpenChange={(o) => !o && setConsentModalOpen(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-spotlight/10">
            <ShieldCheck className="h-5 w-5 text-spotlight" />
          </div>
          <DialogTitle>Help improve Spotlight Review</DialogTitle>
          <DialogDescription className="text-left">
            We&apos;d like to log your edits (pin, reject, override, outcomes)
            as anonymous training signal to make the evaluator better over
            time. This is optional — the tool works either way.
          </DialogDescription>
        </DialogHeader>
        <ul className="my-3 space-y-2 text-xs text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-spotlight">•</span>
            Only your <strong className="text-foreground">edits</strong> and
            the <strong className="text-foreground">image hash</strong> are
            logged — never the image itself, never your identity.
          </li>
          <li className="flex gap-2">
            <span className="text-spotlight">•</span>
            Data is used solely to improve the evaluator and is reviewed by
            humans before any model retraining.
          </li>
          <li className="flex gap-2">
            <span className="text-spotlight">•</span>
            You can revoke consent at any time from the settings.
          </li>
        </ul>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full"
            onClick={() => setConsent(true)}
          >
            Yes, help improve the tool
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setConsent(false)}
          >
            No, keep my edits private
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
