"use client";

import * as React from "react";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { MarketSelector } from "@/components/market-selector";
import { UploadZone } from "@/components/upload-zone";
import { PortraitGrid } from "@/components/portrait-grid";
import { ShortlistPanel } from "@/components/shortlist-panel";
import { GridToolbar } from "@/components/grid-toolbar";
import { PortraitDetail } from "@/components/portrait-detail";
import { EthicsFooter } from "@/components/ethics-footer";
import { BatchProgressBar } from "@/components/batch-progress-bar";
import { ConsentModal } from "@/components/consent-modal";
import { CompareView } from "@/components/compare-view";
import { UndoToast } from "@/components/undo-toast";
import { HelpDialog } from "@/components/help-dialog";
import { MobileShortlistSheet } from "@/components/mobile-shortlist-sheet";
import { useHeadshotStore } from "@/store/headshot-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

type SortKey =
  | "score"
  | "name"
  | "recent"
  | "eye_focus"
  | "background"
  | "expression"
  | "believability";

export default function Home() {
  const [sortKey, setSortKey] = React.useState<SortKey>("score");
  const [showRejected, setShowRejected] = React.useState(false);

  const portraits = useHeadshotStore((s) => s.portraits);
  const selectPortrait = useHeadshotStore((s) => s.selectPortrait);
  const togglePin = useHeadshotStore((s) => s.togglePin);
  const toggleReject = useHeadshotStore((s) => s.toggleReject);
  const evaluatePortrait = useHeadshotStore((s) => s.evaluatePortrait);
  const setHelpOpen = useHeadshotStore((s) => s.setHelpOpen);
  const checkConsent = useHeadshotStore((s) => s.checkConsent);

  const total = portraits.length;
  const shown = showRejected
    ? total
    : portraits.filter((p) => !p.rejected).length;

  // Check consent status on mount ONLY if we have a persisted decision
  // (returning session). First-time visitors (consentGranted === null) see
  // the consent modal instead.
  React.useEffect(() => {
    const current = useHeadshotStore.getState().consentGranted;
    if (current !== null) {
      void checkConsent();
    }
  }, [checkConsent]);

  // Keyboard navigation — select next/prev among non-rejected portraits.
  const selectNext = React.useCallback(
    (dir: 1 | -1) => {
      const eligible = portraits.filter((p) => !p.rejected);
      if (eligible.length === 0) return;
      const currentId = useHeadshotStore.getState().selectedId;
      const idx = eligible.findIndex((p) => p.id === currentId);
      const nextIdx =
        idx === -1
          ? 0
          : (idx + dir + eligible.length) % eligible.length;
      selectPortrait(eligible[nextIdx].id);
    },
    [portraits, selectPortrait]
  );

  const selectedPortrait = portraits.find(
    (p) => p.id === useHeadshotStore.getState().selectedId
  );

  useKeyboardShortcuts(
    {
      onNext: () => selectNext(1),
      onPrev: () => selectNext(-1),
      onOpenDetail: () => {
        const id = useHeadshotStore.getState().selectedId;
        if (id) selectPortrait(id);
      },
      onTogglePin: () => {
        const id = useHeadshotStore.getState().selectedId;
        if (id) togglePin(id);
      },
      onToggleReject: () => {
        const id = useHeadshotStore.getState().selectedId;
        if (id) toggleReject(id);
      },
      onRetry: () => {
        const id = useHeadshotStore.getState().selectedId;
        if (id) evaluatePortrait(id);
      },
      onToggleHelp: () => setHelpOpen(!useHeadshotStore.getState().helpOpen),
    },
    true
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <HowItWorks />

        {/* Evaluator */}
        <section id="evaluate" className="scroll-mt-16">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <div className="mb-6 flex flex-col gap-2">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Evaluate your headshots
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Set the market lens, drop in a batch, and we&apos;ll score,
                tag and shortlist. Pin, override or reject anything — your
                edits teach the tool.
              </p>
            </div>

            {/* Top controls */}
            <div className="grid gap-4 lg:grid-cols-2">
              <MarketSelector />
              <UploadZone />
            </div>

            {/* Batch progress bar */}
            {total > 0 && (
              <div className="mt-5">
                <BatchProgressBar />
              </div>
            )}

            {/* Grid + shortlist */}
            {total > 0 && (
              <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
                <div className="min-w-0">
                  <div className="mb-3">
                    <GridToolbar
                      sortKey={sortKey}
                      onSortChange={setSortKey}
                      showRejected={showRejected}
                      onToggleRejected={() => setShowRejected((v) => !v)}
                      total={total}
                      shown={shown}
                    />
                  </div>
                  <PortraitGrid
                    sortKey={sortKey}
                    showRejected={showRejected}
                  />
                </div>
                {/* Shortlist sidebar — desktop only. Mobile uses the floating sheet. */}
                <div className="hidden lg:sticky lg:top-20 lg:block lg:h-fit">
                  <ShortlistPanel />
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <EthicsFooter />

      {/* Overlays & modals */}
      <PortraitDetail />
      <ConsentModal />
      <CompareView />
      <HelpDialog />
      <UndoToast />
      <MobileShortlistSheet />
    </div>
  );
}
