"use client";

import {
  ArrowUpDown,
  Eye,
  EyeOff,
  GitCompare,
  Download,
  Keyboard,
  CheckSquare,
  Square,
  Pin,
  Ban,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHeadshotStore } from "@/store/headshot-store";
import { Button } from "@/components/ui/button";

type SortKey =
  | "score"
  | "name"
  | "recent"
  | "eye_focus"
  | "background"
  | "expression"
  | "believability";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score", label: "Overall score" },
  { value: "eye_focus", label: "Eye focus" },
  { value: "background", label: "Background" },
  { value: "expression", label: "Expression fit" },
  { value: "believability", label: "Believability" },
  { value: "recent", label: "Recent" },
  { value: "name", label: "Name" },
];

interface GridToolbarProps {
  sortKey: SortKey;
  onSortChange: (k: SortKey) => void;
  showRejected: boolean;
  onToggleRejected: () => void;
  total: number;
  shown: number;
}

export function GridToolbar({
  sortKey,
  onSortChange,
  showRejected,
  onToggleRejected,
  total,
  shown,
}: GridToolbarProps) {
  const selectMode = useHeadshotStore((s) => s.selectMode);
  const setSelectMode = useHeadshotStore((s) => s.setSelectMode);
  const selectedIds = useHeadshotStore((s) => s.selectedIds);
  const selectAll = useHeadshotStore((s) => s.selectAll);
  const clearSelection = useHeadshotStore((s) => s.clearSelection);
  const bulkPin = useHeadshotStore((s) => s.bulkPin);
  const bulkReject = useHeadshotStore((s) => s.bulkReject);
  const bulkRemove = useHeadshotStore((s) => s.bulkRemove);
  const compareIds = useHeadshotStore((s) => s.compareIds);
  const setCompareOpen = useHeadshotStore((s) => s.setCompareOpen);
  const setHelpOpen = useHeadshotStore((s) => s.setHelpOpen);
  const portraits = useHeadshotStore((s) => s.portraits);
  const market = useHeadshotStore((s) => s.market);
  const selectPortrait = useHeadshotStore((s) => s.selectPortrait);

  const selectedCount = selectedIds.size;

  const handleExport = async () => {
    const { computeShortlist, humanizeType: _ht } = await import("@/lib/scoring");
    const ids = computeShortlist(portraits, 8);
    const items = ids
      .map((id, i) => {
        const p = portraits.find((x) => x.id === id);
        if (!p || !p.evaluation) return null;
        return {
          name: p.name,
          dataUrl: p.dataUrl,
          evaluation: p.evaluation,
          rank: i + 1,
          pinned: p.pinned,
          overrideScore: p.overrideScore,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (items.length === 0) return;

    const res = await fetch("/api/export-shortlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        market,
        sessionName: `Shortlist ${new Date().toLocaleDateString()}`,
      }),
    });
    const html = await res.text();
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Sort</span>
          <select
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="h-8 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {shown} of {total}
          </span>
          <button
            type="button"
            onClick={onToggleRejected}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              showRejected
                ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {showRejected ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            Rejected
          </button>
          <button
            type="button"
            onClick={() => setSelectMode(!selectMode)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              selectMode
                ? "border-spotlight bg-spotlight/10 text-spotlight"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {selectMode ? (
              <CheckSquare className="h-3.5 w-3.5" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            Select
          </button>
        </div>
      </div>

      {/* Bulk action bar (visible in select mode with items selected) */}
      {selectMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-spotlight/30 bg-spotlight/5 p-2">
          <span className="text-xs font-medium text-spotlight">
            {selectedCount} selected
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAll}>
              All
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearSelection}>
              None
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={bulkPin}
              disabled={selectedCount === 0}
            >
              <Pin className="mr-1 h-3 w-3" />
              Pin
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={bulkReject}
              disabled={selectedCount === 0}
            >
              <Ban className="mr-1 h-3 w-3" />
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-rose-500 hover:text-rose-600"
              onClick={bulkRemove}
              disabled={selectedCount === 0}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Remove
            </Button>
          </div>
        </div>
      )}

      {/* Secondary action row */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => setCompareOpen(true)}
          disabled={compareIds.length === 0}
        >
          <GitCompare className="mr-1.5 h-3.5 w-3.5" />
          Compare
          {compareIds.length > 0 && (
            <span className="ml-1 rounded-full bg-violet-500/15 px-1.5 text-[10px] font-bold text-violet-500">
              {compareIds.length}
            </span>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={handleExport}
          disabled={portraits.filter((p) => p.evaluation).length === 0}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export PDF
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-8 text-xs text-muted-foreground"
          onClick={() => setHelpOpen(true)}
        >
          <Keyboard className="mr-1.5 h-3.5 w-3.5" />
          Shortcuts
        </Button>
      </div>
    </div>
  );
}
