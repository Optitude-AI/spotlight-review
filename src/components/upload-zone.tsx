"use client";

import * as React from "react";
import { UploadCloud, Images, Trash2, Loader2 } from "lucide-react";
import { useHeadshotStore } from "@/store/headshot-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Drag-and-drop upload zone + sample loader + clear control.
 */
export function UploadZone() {
  const addFiles = useHeadshotStore((s) => s.addFiles);
  const addSamples = useHeadshotStore((s) => s.addSamples);
  const clearAll = useHeadshotStore((s) => s.clearAll);
  const portraits = useHeadshotStore((s) => s.portraits);
  const isEvaluating = useHeadshotStore((s) => s.isEvaluating);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    void addFiles(files);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-xl border-2 border-dashed bg-card p-6 transition-colors sm:p-8",
        dragging
          ? "border-spotlight bg-spotlight/5"
          : "border-border hover:border-spotlight/40"
      )}
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-spotlight/10">
          <UploadCloud className="h-6 w-6 text-spotlight" />
        </div>
        <h3 className="mt-3 text-sm font-semibold">
          Drop headshots here, or browse
        </h3>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Upload a batch of portraits (JPG, PNG, WebP). We score, tag and
          shortlist — you stay in charge.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Images className="mr-1.5 h-4 w-4" />
            Browse files
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void addSamples()}
          >
            Try sample headshots
          </Button>
          {portraits.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => clearAll()}
              disabled={isEvaluating}
              className="text-muted-foreground hover:text-rose-500"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Clear all
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
