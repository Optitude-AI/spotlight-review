"use client";

import { useHeadshotStore } from "@/store/headshot-store";
import { Pause, Play, X, RotateCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Sticky batch progress bar with ETA, pause/resume, cancel, and retry-failed. */
export function BatchProgressBar() {
  const batch = useHeadshotStore((s) => s.batch);
  const isEvaluating = useHeadshotStore((s) => s.isEvaluating);
  const pauseBatch = useHeadshotStore((s) => s.pauseBatch);
  const resumeBatch = useHeadshotStore((s) => s.resumeBatch);
  const cancelBatch = useHeadshotStore((s) => s.cancelBatch);
  const retryAllFailed = useHeadshotStore((s) => s.retryAllFailed);
  const errorCount = useHeadshotStore(
    (s) => s.portraits.filter((p) => p.status === "error").length
  );

  if (!batch.active && batch.processed === 0 && !isEvaluating) {
    // Show retry-all-failed bar if there are errors but no active batch.
    if (errorCount > 0) {
      return (
        <div className="sticky top-16 z-30 mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs shadow-sm">
          <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
          <span className="text-rose-600 dark:text-rose-400">
            {errorCount} failed
          </span>
          <button
            type="button"
            onClick={() => retryAllFailed()}
            className="font-medium text-rose-600 underline-offset-2 hover:underline dark:text-rose-400"
          >
            Retry all
          </button>
        </div>
      );
    }
    return null;
  }

  const pct =
    batch.total > 0 ? Math.round((batch.processed / batch.total) * 100) : 0;
  const eta = batch.etaSeconds;

  return (
    <div className="sticky top-16 z-30 mx-auto mb-3 w-full max-w-2xl rounded-xl border border-border bg-background/95 p-3 shadow-md backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">
              {batch.paused ? "Paused" : "Evaluating"} · {batch.processed}/
              {batch.total}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {pct}%
              {eta != null && !batch.paused && eta > 0 && (
                <span className="ml-2">· ~{formatEta(eta)} left</span>
              )}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                batch.paused ? "bg-amber-500" : "bg-spotlight"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          {batch.failed > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={() => retryAllFailed()}
            >
              <RotateCw className="mr-1 h-3 w-3" />
              {batch.failed} failed
            </Button>
          )}
          {batch.paused ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              onClick={() => resumeBatch()}
              aria-label="Resume"
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              onClick={() => pauseBatch()}
              aria-label="Pause"
            >
              <Pause className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={() => cancelBatch()}
            aria-label="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatEta(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}
