"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import { MAX_VIDEO_BYTES, parseYouTubeId, videoPoster } from "@/lib/video";
import type { SlideVideo } from "@/lib/types";

export function VideoPicker({ video, busy, error, onFile, onLink, onRemove }: {
  video?: SlideVideo;
  busy: boolean;
  error?: string;
  onFile: (file: File) => void;
  onLink: (url: string) => void;
  onRemove: () => void;
}) {
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [dragging, setDragging] = useState(false);
  const poster = video ? videoPoster(video) : undefined;

  const submitLink = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!parseYouTubeId(link)) {
      setLinkError("Enter a YouTube link, for example https://youtu.be/VIDEO_ID.");
      return;
    }
    setLinkError("");
    onLink(link.trim());
    setLink("");
  };

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <section className="space-y-4" aria-label="Videos">
      <div>
        <h3 className="display text-2xl">Video</h3>
        <p className="text-sm text-stone-500">Plays full-slide. Local videos are stored on this device (MP4 recommended, up to {Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB). Video links show a thumbnail in the slide.</p>
      </div>
      {video && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-stone-50 p-3 text-sm dark:bg-stone-900">
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" className="h-14 w-24 rounded object-cover" />
          )}
          <p className="min-w-0 flex-1 truncate text-stone-600">
            {video.kind === "file" ? `Local video: ${video.name}` : `YouTube: ${video.url}`}
          </p>
          <label className="btn cursor-pointer">
            Replace video
            <input type="file" accept="video/*" aria-label="Replace video file" className="sr-only" disabled={busy} onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.target.value = "";
            }} />
          </label>
          <button type="button" className="btn btn-ghost" onClick={onRemove} disabled={busy}>Remove video</button>
        </div>
      )}
      {!video && (
        <div
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center text-sm ${dragging ? "border-accent bg-accent/5" : "border-stone-300"}`}
        >
          <p className="text-stone-600">{busy ? "Saving video…" : "Drag and drop a video here"}</p>
          <label className="btn cursor-pointer">
            Browse video files
            <input type="file" accept="video/*" aria-label="Upload video file" className="sr-only" disabled={busy} onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.target.value = "";
            }} />
          </label>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <form onSubmit={submitLink} className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            className="input min-w-0 flex-1"
            aria-label="YouTube video link"
            placeholder="https://www.youtube.com/watch?v=…"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            disabled={busy}
          />
          <button className="btn" type="submit" disabled={busy || !link.trim()}>Use video link</button>
        </div>
        {linkError && <p role="alert" className="text-sm text-red-600">{linkError}</p>}
      </form>
    </section>
  );
}
