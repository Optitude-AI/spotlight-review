"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  HeadshotEvaluation,
  MarketContext,
  OutcomeResult,
  Portrait,
} from "@/lib/types";
import { SAMPLE_PORTRAITS } from "@/lib/samples";
import { resizeImageToDataUrl, imageHash } from "@/lib/image-utils";
import { idbSet, idbGet, idbDel, idbClear } from "@/lib/idb";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface BatchProgress {
  processed: number;
  total: number;
  failed: number;
  etaSeconds: number | null;
  paused: boolean;
  active: boolean;
}

export interface UndoEntry {
  id: string;
  label: string;
  action: () => void;
}

interface HeadshotState {
  portraits: Portrait[];
  market: MarketContext;
  selectedId: string | null;
  detailOpen: boolean;

  // batch queue
  _queue: string[];
  _processing: boolean;
  _paused: boolean;
  _batchStartTime: number | null;
  _batchProcessedCount: number;
  _batchTotalCount: number;
  _batchFailedCount: number;
  batch: BatchProgress;

  // multi-select
  selectMode: boolean;
  selectedIds: Set<string>;
  compareIds: string[];
  compareOpen: boolean;

  // consent
  sessionKey: string;
  consentGranted: boolean | null; // null = not yet asked
  consentModalOpen: boolean;

  // undo
  _undoStack: UndoEntry[];
  undoToast: { id: string; label: string } | null;

  // help
  helpOpen: boolean;

  /* actions */
  setMarket: (m: MarketContext) => void;

  addFiles: (files: FileList | File[]) => Promise<void>;
  addSamples: () => Promise<void>;
  removePortrait: (id: string) => void;
  clearAll: () => void;

  evaluatePortrait: (id: string) => void;
  evaluateAll: () => void;
  reevaluateAll: () => void;
  retryAllFailed: () => void;
  pauseBatch: () => void;
  resumeBatch: () => void;
  cancelBatch: () => void;

  togglePin: (id: string) => void;
  toggleReject: (id: string) => void;
  setOverrideScore: (id: string, score: number | undefined) => void;
  setOutcome: (id: string, outcome: OutcomeResult) => void;

  selectPortrait: (id: string | null) => void;
  setDetailOpen: (open: boolean) => void;

  // multi-select
  setSelectMode: (on: boolean) => void;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  bulkPin: () => void;
  bulkReject: () => void;
  bulkRemove: () => void;
  addToCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
  setCompareOpen: (open: boolean) => void;

  // consent
  setConsent: (granted: boolean) => void;
  setConsentModalOpen: (open: boolean) => void;
  checkConsent: () => Promise<void>;

  // undo
  pushUndo: (label: string, action: () => void) => void;
  performUndo: () => void;
  dismissUndoToast: () => void;

  setHelpOpen: (open: boolean) => void;

  // persistence restore
  _hydrateImages: () => Promise<void>;
  _hasHydrated: boolean;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function newSessionKey(): string {
  return `s-${uid()}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Compute a simple ETA from elapsed time + processed count. */
function computeEta(
  startTime: number,
  processed: number,
  total: number
): number | null {
  if (processed === 0) return null;
  const elapsed = (Date.now() - startTime) / 1000;
  const perItem = elapsed / processed;
  const remaining = total - processed;
  return Math.max(0, Math.round(remaining * perItem));
}

function makeBatchProgress(s: HeadshotState): BatchProgress {
  return {
    processed: s._batchProcessedCount,
    total: s._batchTotalCount,
    failed: s._batchFailedCount,
    etaSeconds: s._batchStartTime
      ? computeEta(s._batchStartTime, s._batchProcessedCount, s._batchTotalCount)
      : null,
    paused: s._paused,
    active: s._processing || (s._queue.length > 0 && !s._paused),
  };
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export const useHeadshotStore = create<HeadshotState>()(
  persist(
    (set, get) => ({
      portraits: [],
      market: "us_commercial",
      selectedId: null,
      detailOpen: false,

      _queue: [],
      _processing: false,
      _paused: false,
      _batchStartTime: null,
      _batchProcessedCount: 0,
      _batchTotalCount: 0,
      _batchFailedCount: 0,
      batch: {
        processed: 0,
        total: 0,
        failed: 0,
        etaSeconds: null,
        paused: false,
        active: false,
      },

      selectMode: false,
      selectedIds: new Set<string>(),
      compareIds: [],
      compareOpen: false,

      sessionKey: newSessionKey(),
      consentGranted: null,
      consentModalOpen: false,

      _undoStack: [],
      undoToast: null,

      helpOpen: false,

      _hasHydrated: false,

      /* ---- market ---- */
      setMarket: (m) => {
        set({ market: m });
        // For each portrait, if we have a cached eval for this market, apply
        // it instantly without re-calling the API.
        const portraits = get().portraits;
        let changed = false;
        const updated = portraits.map((p) => {
          if (p.marketCache && p.marketCache[m]) {
            changed = true;
            return {
              ...p,
              evaluation: p.marketCache[m],
              status: "done" as const,
              error: undefined,
            };
          }
          return p;
        });
        if (changed) set({ portraits: updated });
      },

      /* ---- add files ---- */
      addFiles: async (files) => {
        const arr = Array.from(files).filter((f) =>
          f.type.startsWith("image/")
        );
        const newPortraits: Portrait[] = [];
        for (const file of arr) {
          const dataUrl = await resizeImageToDataUrl(file);
          const hash = await imageHash(dataUrl);
          const id = uid();
          newPortraits.push({
            id,
            name: file.name.replace(/\.[^.]+$/, ""),
            dataUrl,
            source: "upload",
            status: "queued",
            pinned: false,
            rejected: false,
            createdAt: Date.now(),
            imageHash: hash,
            marketCache: {},
          });
          // Persist the (resized) image to IndexedDB for refresh survival.
          void idbSet(`img:${id}`, dataUrl);
        }
        if (newPortraits.length === 0) return;
        set((s) => ({ portraits: [...s.portraits, ...newPortraits] }));
        for (const p of newPortraits) get().evaluatePortrait(p.id);
      },

      addSamples: async () => {
        const existing = new Set(get().portraits.map((p) => p.dataUrl));
        const toAdd = SAMPLE_PORTRAITS.filter((s) => !existing.has(s.url));
        const newPortraits: Portrait[] = toAdd.map((s) => ({
          id: uid(),
          name: s.name,
          dataUrl: s.url,
          source: "sample",
          status: "queued",
          pinned: false,
          rejected: false,
          createdAt: Date.now(),
          imageHash: undefined, // samples use URL; hash computed on server
          marketCache: {},
        }));
        if (newPortraits.length === 0) return;
        set((s) => ({ portraits: [...s.portraits, ...newPortraits] }));
        for (const p of newPortraits) get().evaluatePortrait(p.id);
      },

      removePortrait: (id) => {
        const portrait = get().portraits.find((p) => p.id === id);
        // Undo entry
        if (portrait) {
          get().pushUndo(
            `Removed "${portrait.name}"`,
            () => {
              set((s) => ({
                portraits: [
                  ...s.portraits,
                  { ...portrait, pinned: false, rejected: false },
                ],
              }));
              void idbSet(`img:${portrait.id}`, portrait.dataUrl);
            }
          );
        }
        void idbDel(`img:${id}`);
        set((s) => ({
          portraits: s.portraits.filter((p) => p.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
          _queue: s._queue.filter((qid) => qid !== id),
          selectedIds: new Set(
            [...s.selectedIds].filter((sid) => sid !== id)
          ),
          compareIds: s.compareIds.filter((cid) => cid !== id),
        }));
        void logFeedback(get(), id, "remove");
      },

      clearAll: () => {
        const count = get().portraits.length;
        if (count === 0) return;
        const snapshot = [...get().portraits];
        get().pushUndo(`Cleared ${count} portrait${count > 1 ? "s" : ""}`, () => {
          set({ portraits: snapshot });
          for (const p of snapshot) {
            void idbSet(`img:${p.id}`, p.dataUrl);
          }
        });
        void idbClear();
        set({
          portraits: [],
          selectedId: null,
          detailOpen: false,
          _queue: [],
          selectedIds: new Set(),
          compareIds: [],
        });
      },

      /* ---- evaluation ---- */
      evaluatePortrait: (id) => {
        set((s) => ({
          portraits: s.portraits.map((p) =>
            p.id === id
              ? { ...p, status: "queued", error: undefined }
              : p
          ),
          _queue: [...s._queue.filter((qid) => qid !== id), id],
        }));
        void drain(set, get);
      },

      evaluateAll: () => {
        const queued = get()
          .portraits.filter(
            (p) => p.status === "queued" || p.status === "error"
          )
          .map((p) => p.id);
        if (queued.length === 0) return;
        set((s) => ({
          _queue: [...s._queue, ...queued],
          _batchStartTime: Date.now(),
          _batchProcessedCount: 0,
          _batchTotalCount: queued.length,
          _batchFailedCount: 0,
          _paused: false,
        }));
        void drain(set, get);
      },

      reevaluateAll: () => {
        const all = get().portraits.map((p) => p.id);
        if (all.length === 0) return;
        set((s) => ({
          portraits: s.portraits.map((p) => ({
            ...p,
            status: "queued" as const,
            error: undefined,
          })),
          _queue: all,
          _batchStartTime: Date.now(),
          _batchProcessedCount: 0,
          _batchTotalCount: all.length,
          _batchFailedCount: 0,
          _paused: false,
        }));
        void drain(set, get);
      },

      retryAllFailed: () => {
        const failed = get()
          .portraits.filter((p) => p.status === "error")
          .map((p) => p.id);
        if (failed.length === 0) return;
        set((s) => ({
          portraits: s.portraits.map((p) =>
            p.status === "error"
              ? { ...p, status: "queued" as const, error: undefined }
              : p
          ),
          _queue: [...s._queue, ...failed],
        }));
        if (!get()._batchStartTime) {
          set({
            _batchStartTime: Date.now(),
            _batchTotalCount: get()._batchTotalCount + failed.length,
          });
        } else {
          set({ _batchTotalCount: get()._batchTotalCount + failed.length });
        }
        void drain(set, get);
      },

      pauseBatch: () => set({ _paused: true, batch: { ...get().batch, paused: true } }),
      resumeBatch: () => {
        set({ _paused: false, batch: { ...get().batch, paused: false } });
        void drain(set, get);
      },
      cancelBatch: () =>
        set({
          _queue: [],
          _paused: false,
          _processing: false,
          _batchStartTime: null,
          batch: {
            processed: 0,
            total: 0,
            failed: 0,
            etaSeconds: null,
            paused: false,
            active: false,
          },
          portraits: get().portraits.map((p) =>
            p.status === "queued" ? { ...p, status: "error", error: "Cancelled" } : p
          ),
        }),

      /* ---- pin / reject / override / outcome ---- */
      togglePin: (id) => {
        const p = get().portraits.find((x) => x.id === id);
        if (!p) return;
        const willPin = !p.pinned;
        set((s) => ({
          portraits: s.portraits.map((x) =>
            x.id === id
              ? {
                  ...x,
                  pinned: willPin,
                  rejected: willPin ? false : x.rejected,
                }
              : x
          ),
        }));
        void logFeedback(get(), id, willPin ? "pin" : "unpin");
      },

      toggleReject: (id) => {
        const p = get().portraits.find((x) => x.id === id);
        if (!p) return;
        const willReject = !p.rejected;
        set((s) => ({
          portraits: s.portraits.map((x) =>
            x.id === id
              ? {
                  ...x,
                  rejected: willReject,
                  pinned: willReject ? false : x.pinned,
                }
              : x
          ),
        }));
        void logFeedback(get(), id, willReject ? "reject" : "unreject");
      },

      setOverrideScore: (id, score) => {
        set((s) => ({
          portraits: s.portraits.map((p) =>
            p.id === id ? { ...p, overrideScore: score } : p
          ),
        }));
        if (score != null) {
          void logFeedback(get(), id, "override", String(score));
        }
      },

      setOutcome: (id, outcome) => {
        const p = get().portraits.find((x) => x.id === id);
        set((s) => ({
          portraits: s.portraits.map((x) =>
            x.id === id ? { ...x, outcome } : x
          ),
        }));
        if (p?.imageHash) {
          void fetch("/api/outcome", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionKey: get().sessionKey,
              imageHash: p.imageHash,
              market: get().market,
              result: outcome,
            }),
          }).catch(() => {});
        }
      },

      /* ---- detail ---- */
      selectPortrait: (id) => set({ selectedId: id, detailOpen: id !== null }),
      setDetailOpen: (open) => set({ detailOpen: open }),

      /* ---- multi-select ---- */
      setSelectMode: (on) =>
        set({
          selectMode: on,
          selectedIds: on ? get().selectedIds : new Set(),
        }),
      toggleSelected: (id) =>
        set((s) => {
          const next = new Set(s.selectedIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { selectedIds: next };
        }),
      selectAll: () =>
        set({
          selectedIds: new Set(
            get()
              .portraits.filter((p) => !p.rejected)
              .map((p) => p.id)
          ),
        }),
      clearSelection: () => set({ selectedIds: new Set() }),
      bulkPin: () => {
        const ids = [...get().selectedIds];
        set((s) => ({
          portraits: s.portraits.map((p) =>
            ids.includes(p.id) ? { ...p, pinned: true, rejected: false } : p
          ),
        }));
        for (const id of ids) void logFeedback(get(), id, "pin");
        set({ selectMode: false, selectedIds: new Set() });
      },
      bulkReject: () => {
        const ids = [...get().selectedIds];
        set((s) => ({
          portraits: s.portraits.map((p) =>
            ids.includes(p.id) ? { ...p, rejected: true, pinned: false } : p
          ),
        }));
        for (const id of ids) void logFeedback(get(), id, "reject");
        set({ selectMode: false, selectedIds: new Set() });
      },
      bulkRemove: () => {
        const ids = [...get().selectedIds];
        for (const id of ids) void idbDel(`img:${id}`);
        set((s) => ({
          portraits: s.portraits.filter((p) => !ids.includes(p.id)),
          selectedIds: new Set(),
          selectMode: false,
        }));
      },

      /* ---- compare ---- */
      addToCompare: (id) => {
        set((s) => {
          if (s.compareIds.includes(id)) return {};
          if (s.compareIds.length >= 4) return {};
          return { compareIds: [...s.compareIds, id] };
        });
        void logFeedback(get(), id, "compare_add");
      },
      removeFromCompare: (id) => {
        set((s) => ({
          compareIds: s.compareIds.filter((c) => c !== id),
        }));
        void logFeedback(get(), id, "compare_remove");
      },
      setCompareOpen: (open) => set({ compareOpen: open }),

      /* ---- consent ---- */
      setConsent: (granted) => {
        set({ consentGranted: granted, consentModalOpen: false });
        void fetch("/api/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionKey: get().sessionKey,
            granted,
          }),
        }).catch(() => {});
      },
      setConsentModalOpen: (open) => set({ consentModalOpen: open }),
      checkConsent: async () => {
        try {
          const res = await fetch(
            `/api/consent?sessionKey=${get().sessionKey}`
          );
          const data = await res.json();
          if (data.ok) {
            set({ consentGranted: data.granted });
          }
        } catch {
          // non-critical
        }
      },

      /* ---- undo ---- */
      pushUndo: (label, action) => {
        const id = uid();
        set((s) => ({
          _undoStack: [...s._undoStack, { id, label, action }].slice(-10),
          undoToast: { id, label },
        }));
        // auto-dismiss toast after 6s
        setTimeout(() => {
          if (get().undoToast?.id === id) {
            set({ undoToast: null });
          }
        }, 6000);
      },
      performUndo: () => {
        const stack = get()._undoStack;
        if (stack.length === 0) return;
        const entry = stack[stack.length - 1];
        entry.action();
        set((s) => ({
          _undoStack: s._undoStack.filter((e) => e.id !== entry.id),
          undoToast: null,
        }));
      },
      dismissUndoToast: () => set({ undoToast: null }),

      setHelpOpen: (open) => set({ helpOpen: open }),

      /* ---- hydration ---- */
      _hydrateImages: async () => {
        if (get()._hasHydrated) return;
        set({ _hasHydrated: true });
        const portraits = get().portraits;
        const restored = await Promise.all(
          portraits.map(async (p) => {
            if (p.source === "sample") return p; // samples use remote URL
            const stored = await idbGet(`img:${p.id}`);
            if (stored) {
              return { ...p, dataUrl: stored };
            }
            // If the image isn't in IDB (e.g. cleared), mark as needing re-upload.
            return {
              ...p,
              status: "error" as const,
              error: "Image not found after refresh — please re-upload.",
            };
          })
        );
        set({ portraits: restored });
        // Re-evaluate any that are done but missing eval (shouldn't normally happen).
      },
    }),
    {
      name: "spotlight-review-v1",
      storage: createJSONStorage(() => localStorage),
      // Only persist lightweight metadata — NOT the dataUrl of uploaded images
      // (those go to IndexedDB separately to avoid blowing the 5MB quota).
      partialize: (s) => ({
        portraits: s.portraits.map((p) => ({
          ...p,
          // Strip heavy dataUrl for uploaded images; keep for samples (small URLs).
          dataUrl: p.source === "sample" ? p.dataUrl : "",
          // Strip the evaluation from persistence? No — keep it so refresh
          // doesn't lose scores. It's JSON, not an image, so it's small.
        })),
        market: s.market,
        sessionKey: s.sessionKey,
        consentGranted: s.consentGranted,
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration from localStorage, restore images from IndexedDB.
        if (state) {
          void state._hydrateImages();
        }
      },
    }
  )
);

/* ------------------------------------------------------------------ */
/* Feedback logging helper                                             */
/* ------------------------------------------------------------------ */

async function logFeedback(
  get: () => HeadshotState,
  portraitId: string,
  action: string,
  value?: string
) {
  const state = get();
  if (!state.consentGranted) return;
  const p = state.portraits.find((x) => x.id === portraitId);
  if (!p?.imageHash) return;
  try {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionKey: state.sessionKey,
        imageHash: p.imageHash,
        market: state.market,
        action,
        value,
      }),
    });
  } catch {
    // best-effort
  }
}

/* ------------------------------------------------------------------ */
/* Sequential queue drain with pause / cancel / progress               */
/* ------------------------------------------------------------------ */

async function drain(
  set: (fn: (s: HeadshotState) => Partial<HeadshotState>) => void,
  get: () => HeadshotState
) {
  if (get()._processing) return;
  if (get()._paused) return;
  set(() => ({ _processing: true }));
  set((s) => ({ batch: makeBatchProgress(s) }));

  try {
    while (get()._queue.length > 0) {
      if (get()._paused) {
        set(() => ({ _processing: false }));
        set((s) => ({ batch: makeBatchProgress(s) }));
        return;
      }

      const id = get()._queue[0];
      set((s) => ({ _queue: s._queue.slice(1) }));

      const portrait = get().portraits.find((p) => p.id === id);
      if (!portrait) {
        set((s) => ({
          _batchProcessedCount: s._batchProcessedCount + 1,
        }));
        set((s) => ({ batch: makeBatchProgress(s) }));
        continue;
      }

      set((s) => ({
        portraits: s.portraits.map((p) =>
          p.id === id
            ? { ...p, status: "evaluating", error: undefined }
            : p
        ),
      }));

      // Check per-market client cache first (instant market switching).
      const market = get().market;
      if (portrait.marketCache && portrait.marketCache[market]) {
        const cached = portrait.marketCache[market]!;
        set((s) => ({
          portraits: s.portraits.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "done",
                  evaluation: cached,
                  error: undefined,
                }
              : p
          ),
          _batchProcessedCount: s._batchProcessedCount + 1,
        }));
        set((s) => ({ batch: makeBatchProgress(s) }));
        continue;
      }

      try {
        const res = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: portrait.dataUrl,
            market,
            imageHash: portrait.imageHash,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Evaluation failed");
        }
        const evaluation = data.evaluation as HeadshotEvaluation;
        const imageHash = (data.imageHash as string) || portrait.imageHash;

        set((s) => ({
          portraits: s.portraits.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "done",
                  evaluation,
                  error: undefined,
                  imageHash: imageHash || p.imageHash,
                  marketCache: {
                    ...p.marketCache,
                    [market]: evaluation,
                  },
                }
              : p
          ),
          _batchProcessedCount: s._batchProcessedCount + 1,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Evaluation failed";
        set((s) => ({
          portraits: s.portraits.map((p) =>
            p.id === id ? { ...p, status: "error", error: message } : p
          ),
          _batchProcessedCount: s._batchProcessedCount + 1,
          _batchFailedCount: s._batchFailedCount + 1,
        }));
      }

      set((s) => ({ batch: makeBatchProgress(s) }));

      if (get()._queue.length > 0 && !get()._paused) await sleep(1200);
    }
  } finally {
    set(() => ({ _processing: false }));
    // Keep batch progress visible briefly after completion.
    set((s) => ({
      batch: { ...makeBatchProgress(s), active: false },
    }));
    setTimeout(() => {
      if (!get()._processing && get()._queue.length === 0) {
        set({
          _batchStartTime: null,
          _batchProcessedCount: 0,
          _batchTotalCount: 0,
          _batchFailedCount: 0,
          batch: {
            processed: 0,
            total: 0,
            failed: 0,
            etaSeconds: null,
            paused: false,
            active: false,
          },
        });
      }
    }, 3000);
  }
}
