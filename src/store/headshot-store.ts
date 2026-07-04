"use client";

import { create } from "zustand";
import type {
  HeadshotEvaluation,
  MarketContext,
  Portrait,
} from "@/lib/types";
import { SAMPLE_PORTRAITS } from "@/lib/samples";

interface HeadshotState {
  portraits: Portrait[];
  market: MarketContext;
  selectedId: string | null;
  detailOpen: boolean;
  isEvaluating: boolean;

  setMarket: (m: MarketContext) => void;
  addFiles: (files: FileList | File[]) => Promise<void>;
  addSamples: () => Promise<void>;
  removePortrait: (id: string) => void;
  clearAll: () => void;

  evaluatePortrait: (id: string) => void;
  evaluateAll: () => void;
  reevaluateAll: () => void;

  togglePin: (id: string) => void;
  toggleReject: (id: string) => void;
  setOverrideScore: (id: string, score: number | undefined) => void;

  selectPortrait: (id: string | null) => void;
  setDetailOpen: (open: boolean) => void;

  // internal queue (not part of public API)
  _queue: string[];
  _processing: boolean;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const useHeadshotStore = create<HeadshotState>((set, get) => ({
  portraits: [],
  market: "us_commercial",
  selectedId: null,
  detailOpen: false,
  isEvaluating: false,
  _queue: [],
  _processing: false,

  setMarket: (m) => set({ market: m }),

  addFiles: async (files) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const newPortraits: Portrait[] = [];
    for (const file of arr) {
      const dataUrl = await readFileAsDataUrl(file);
      newPortraits.push({
        id: uid(),
        name: file.name.replace(/\.[^.]+$/, ""),
        dataUrl,
        source: "upload",
        status: "queued",
        pinned: false,
        rejected: false,
        createdAt: Date.now(),
      });
    }
    if (newPortraits.length === 0) return;
    set((s) => ({ portraits: [...s.portraits, ...newPortraits] }));
    for (const p of newPortraits) get().evaluatePortrait(p.id);
  },

  addSamples: async () => {
    const existing = new Set(get().portraits.map((p) => p.dataUrl));
    const newPortraits: Portrait[] = SAMPLE_PORTRAITS.filter(
      (s) => !existing.has(s.url)
    ).map((s) => ({
      id: uid(),
      name: s.name,
      dataUrl: s.url,
      source: "sample",
      status: "queued",
      pinned: false,
      rejected: false,
      createdAt: Date.now(),
    }));
    if (newPortraits.length === 0) return;
    set((s) => ({ portraits: [...s.portraits, ...newPortraits] }));
    for (const p of newPortraits) get().evaluatePortrait(p.id);
  },

  removePortrait: (id) =>
    set((s) => ({
      portraits: s.portraits.filter((p) => p.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
      _queue: s._queue.filter((qid) => qid !== id),
    })),

  clearAll: () =>
    set({
      portraits: [],
      selectedId: null,
      detailOpen: false,
      _queue: [],
    }),

  evaluatePortrait: (id) => {
    // Reset to queued and enqueue. The drain loop processes one at a time.
    set((s) => ({
      portraits: s.portraits.map((p) =>
        p.id === id ? { ...p, status: "queued", error: undefined } : p
      ),
      _queue: [...s._queue.filter((qid) => qid !== id), id],
    }));
    void drain(set, get);
  },

  evaluateAll: () => {
    const queued = get()
      .portraits.filter((p) => p.status === "queued" || p.status === "error")
      .map((p) => p.id);
    set((s) => ({ _queue: [...s._queue, ...queued], isEvaluating: true }));
    void drain(set, get);
  },

  reevaluateAll: () => {
    const all = get().portraits.map((p) => p.id);
    set((s) => ({
      portraits: s.portraits.map((p) => ({
        ...p,
        status: "queued" as const,
        error: undefined,
      })),
      _queue: all,
      isEvaluating: true,
    }));
    void drain(set, get);
  },

  togglePin: (id) =>
    set((s) => ({
      portraits: s.portraits.map((p) =>
        p.id === id
          ? {
              ...p,
              pinned: !p.pinned,
              rejected: p.pinned ? p.rejected : false,
            }
          : p
      ),
    })),

  toggleReject: (id) =>
    set((s) => ({
      portraits: s.portraits.map((p) =>
        p.id === id
          ? {
              ...p,
              rejected: !p.rejected,
              pinned: p.rejected ? p.pinned : false,
            }
          : p
      ),
    })),

  setOverrideScore: (id, score) =>
    set((s) => ({
      portraits: s.portraits.map((p) =>
        p.id === id ? { ...p, overrideScore: score } : p
      ),
    })),

  selectPortrait: (id) => set({ selectedId: id, detailOpen: id !== null }),

  setDetailOpen: (open) => set({ detailOpen: open }),
}));

/**
 * Sequential queue drain. Processes one evaluation at a time with a small gap
 * to stay well under the vision API rate limit. Guarantees no concurrency.
 */
async function drain(
  set: (fn: (s: HeadshotState) => Partial<HeadshotState>) => void,
  get: () => HeadshotState
) {
  if (get()._processing) return;
  set(() => ({ _processing: true, isEvaluating: true }));

  try {
    while (get()._queue.length > 0) {
      const id = get()._queue[0];
      // Drop from queue immediately so it can't reprocess.
      set((s) => ({ _queue: s._queue.slice(1) }));

      const portrait = get().portraits.find((p) => p.id === id);
      if (!portrait) continue;

      set((s) => ({
        portraits: s.portraits.map((p) =>
          p.id === id
            ? { ...p, status: "evaluating", error: undefined }
            : p
        ),
      }));

      try {
        const res = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: portrait.dataUrl,
            market: get().market,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Evaluation failed");
        }
        const evaluation = data.evaluation as HeadshotEvaluation;
        set((s) => ({
          portraits: s.portraits.map((p) =>
            p.id === id
              ? { ...p, status: "done", evaluation, error: undefined }
              : p
          ),
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Evaluation failed";
        set((s) => ({
          portraits: s.portraits.map((p) =>
            p.id === id ? { ...p, status: "error", error: message } : p
          ),
        }));
      }

      // Small gap between requests to respect rate limits.
      if (get()._queue.length > 0) await sleep(1500);
    }
  } finally {
    set(() => ({ _processing: false, isEvaluating: false }));
  }
}
