import type { SlideVideo } from "./types";

export const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

const DB_NAME = "worship-media";
const STORE = "videos";

// Local videos are too large for localStorage, so their blobs go to IndexedDB.
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function saveVideoBlob(id: string, blob: Blob): Promise<void> {
  await withStore("readwrite", (store) => store.put(blob, id));
}

const objectUrls = new Map<string, Promise<string | undefined>>();

// Object URLs are cached per video id so a re-render never points at a revoked URL.
export function videoObjectUrl(id: string): Promise<string | undefined> {
  let url = objectUrls.get(id);
  if (!url) {
    url = withStore<Blob | undefined>("readonly", (store) => store.get(id)).then((blob) => (blob ? URL.createObjectURL(blob) : undefined));
    objectUrls.set(id, url);
    url.catch(() => objectUrls.delete(id));
  }
  return url;
}

export async function deleteVideoBlob(id: string): Promise<void> {
  objectUrls.delete(id);
  await withStore("readwrite", (store) => store.delete(id));
}

export async function loadVideoBlob(id: string): Promise<Blob | undefined> {
  return withStore<Blob | undefined>("readonly", (store) => store.get(id));
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Grabs a frame about a second in, scaled down so it stays small in localStorage.
export async function captureVideoPoster(file: Blob): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("This browser cannot play that video. Try an MP4 (H.264) file."));
    });
    if (video.duration > 1) {
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = Math.min(1, video.duration / 2);
      });
    }
    const scale = Math.min(1, 960 / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.75);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function parseYouTubeId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m)\./, "");
  let id: string | null | undefined;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else id = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

export const youtubeThumbnailUrl = (videoId: string) => `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
export const youtubeWatchUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;
export const youtubeEmbedUrl = (videoId: string) => `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`;

export function videoPoster(video: SlideVideo): string | undefined {
  return video.kind === "file" ? video.poster : youtubeThumbnailUrl(video.videoId);
}
