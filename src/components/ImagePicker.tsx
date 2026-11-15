"use client";

import { useState, type DragEvent } from "react";
import type { SlidePicture } from "@/lib/types";

export function ImagePicker({ picture, busy, error, onFile, onRemove }: {
  picture?: SlidePicture;
  busy: boolean;
  error?: string;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const [dragging, setDragging] = useState(false);

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div className="space-y-4">
      {picture && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-stone-50 p-3 text-sm dark:bg-stone-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={picture.data} alt="" className="h-14 w-24 rounded object-contain" />
          <p className="min-w-0 flex-1 text-stone-600">Drag the image on the slide to move it, or drag its corner to resize.</p>
          <label className="btn cursor-pointer">
            Replace image
            <input type="file" accept="image/*" aria-label="Replace image file" className="sr-only" disabled={busy} onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.target.value = "";
            }} />
          </label>
          <button type="button" className="btn btn-ghost" onClick={onRemove} disabled={busy}>Remove image</button>
        </div>
      )}
      {!picture && (
        <div
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center text-sm ${dragging ? "border-accent bg-accent/5" : "border-stone-300"}`}
        >
          <p className="text-stone-600">{busy ? "Saving image…" : "Drag and drop an image here"}</p>
          <label className="btn cursor-pointer">
            Browse image files
            <input type="file" accept="image/*" aria-label="Upload image file" className="sr-only" disabled={busy} onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.target.value = "";
            }} />
          </label>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
