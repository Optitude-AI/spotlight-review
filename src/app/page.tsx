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
import { useHeadshotStore } from "@/store/headshot-store";

type SortKey = "score" | "name" | "recent";

export default function Home() {
  const [sortKey, setSortKey] = React.useState<SortKey>("score");
  const [showRejected, setShowRejected] = React.useState(false);

  const portraits = useHeadshotStore((s) => s.portraits);
  const total = portraits.length;
  const shown = showRejected
    ? total
    : portraits.filter((p) => !p.rejected).length;

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

            {/* Grid + shortlist */}
            {total > 0 && (
              <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
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
                <div className="lg:sticky lg:top-20 lg:h-fit">
                  <ShortlistPanel />
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <EthicsFooter />
      <PortraitDetail />
    </div>
  );
}
