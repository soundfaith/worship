"use client";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_LINES } from "@/lib/lyrics";
import { uid } from "@/lib/store";
import { getTemplate } from "@/lib/templates";
import { useSongSearch } from "@/lib/useSongs";
import { Icon, IconButton } from "./Icon";
import { Modal } from "./Modal";
import { Section, type TabProps } from "./ui";
import { SongPreview } from "./SongPreview";
import { SongResult } from "./SongResult";

export function SongsTab({ a, update }: TabProps) {
  const [q, setQ] = useState("");
  const [openUid, setOpenUid] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [adding, setAdding] = useState("");
  const [error, setError] = useState("");
  const handleStart = useRef<number | null>(null);
  const { results, total, searching, getSong, loading } = useSongSearch(q);
  const template = getTemplate(a.sectionTemplates.song ?? a.templateId);

  useEffect(() => {
    const beginSwipe = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-sheet-handle]")) {
        handleStart.current = event.clientY;
      }
    };
    const finishSwipe = (event: PointerEvent) => {
      if (handleStart.current !== null && event.clientY - handleStart.current > 60) setPickerOpen(false);
      handleStart.current = null;
    };
    const cancelSwipe = () => { handleStart.current = null; };
    window.addEventListener("pointerdown", beginSwipe, true);
    window.addEventListener("pointerup", finishSwipe, true);
    window.addEventListener("pointercancel", cancelSwipe);
    return () => {
      window.removeEventListener("pointerdown", beginSwipe, true);
      window.removeEventListener("pointerup", finishSwipe, true);
      window.removeEventListener("pointercancel", cancelSwipe);
    };
  }, []);

  const add = async (id: string) => {
    if (adding || a.songs.some((song) => song.songId === id)) return;
    setAdding(id);
    setError("");
    try {
      const song = await getSong(id);
      if (!song) {
        setError("Could not load this song. Try again.");
        return;
      }
      const selected = { uid: uid(), songId: song.id, title: song.title, slides: song.slides, lines: DEFAULT_LINES };
      update({ songs: [...a.songs, selected], slides: null });
      setOpenUid(selected.uid);
      setPickerOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this song.");
    } finally {
      setAdding("");
    }
  };
  const move = (index: number, direction: number) => {
    const next = [...a.songs];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    update({ songs: next, slides: null });
  };
  const setLines = (songUid: string, lines: number) =>
    update({ songs: a.songs.map((song) => song.uid === songUid ? { ...song, lines } : song), slides: null });

  return (
    <div className="space-y-5">
      <Section title={`Songs${a.songs.length ? ` · ${a.songs.length}` : ""}`}>
        {a.songs.length === 0 ? (
          <div className="py-7 text-center">
            <p className="text-sm text-stone-500">Choose songs for your assembly.</p>
            <button type="button" className="btn btn-primary mt-4" onClick={() => setPickerOpen(true)}>
              <Icon name="plus" className="h-4 w-4" />Add song
            </button>
          </div>
        ) : (
          <>
            <ol className="space-y-3">
              {a.songs.map((song, index) => (
                <li key={song.uid} className="overflow-hidden rounded-xl border border-stone-200 bg-surface">
                  <div className="flex items-center gap-1 px-2 py-2 sm:px-3">
                    <span className="w-7 shrink-0 text-center text-sm tabular-nums text-stone-400">{index + 1}</span>
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate py-2 text-left font-medium text-stone-800 hover:text-accent"
                      aria-expanded={openUid === song.uid}
                      onClick={() => setOpenUid(openUid === song.uid ? null : song.uid)}
                    >
                      {song.title}
                    </button>
                    <IconButton icon="up" label="Move up" onClick={() => move(index, -1)} disabled={index === 0} />
                    <IconButton icon="down" label="Move down" onClick={() => move(index, 1)} disabled={index === a.songs.length - 1} />
                    <IconButton icon="close" label="Remove song" danger onClick={() => update({ songs: a.songs.filter((item) => item.uid !== song.uid), slides: null })} />
                  </div>
                  {openUid === song.uid && (
                    <div className="border-t border-stone-200 p-3 sm:p-4">
                      <SongPreview title={song.title} source={song.slides} lines={song.lines ?? DEFAULT_LINES} onLines={(count) => setLines(song.uid, count)} template={template} font={a.font} songIndex={index} />
                    </div>
                  )}
                </li>
              ))}
            </ol>
            <div className="pt-1">
              <button type="button" className="btn" onClick={() => setPickerOpen(true)}>
                <Icon name="plus" className="h-4 w-4" />Add song
              </button>
            </div>
          </>
        )}
      </Section>
      {error && !pickerOpen && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {pickerOpen && (
        <Modal labelledBy="song-picker-title" onClose={() => setPickerOpen(false)} className="song-picker-modal">
          <div className="song-picker-content flex flex-col">
            <div
              data-sheet-handle
              className="shrink-0 touch-none px-5 pb-3 pt-3 sm:hidden"
            >
              <div aria-hidden="true" className="mx-auto h-1.5 w-12 rounded-full bg-stone-300" />
            </div>
            <header className="shrink-0 border-b border-stone-200 px-5 pb-4 sm:px-6 sm:pt-6">
              <div className="flex items-center justify-between gap-3">
                <h2 id="song-picker-title" className="display text-2xl text-stone-900">Add a song</h2>
                <button type="button" className="icon-btn" aria-label="Close song picker" onClick={() => setPickerOpen(false)}><Icon name="close" /></button>
              </div>
              <div className="relative mt-4">
                <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  className="input !pl-10"
                  placeholder="Search songs…"
                  aria-label="Filter songs"
                  data-initial-focus
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                />
              </div>
              <p className="mt-2 text-xs text-stone-500">{loading ? "Loading songs…" : `${total} songs`}</p>
              {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
            </header>
            <ul className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4" aria-label="Available songs">
              {results.map((song) => {
                const added = a.songs.some((selected) => selected.songId === song.id);
                return (
                  <li key={song.id}>
                    <SongResult
                      s={song}
                      onClick={() => void add(song.id)}
                      disabled={added || !!adding}
                      right={added
                        ? <span className="shrink-0 text-xs font-medium text-accent">Added</span>
                        : adding === song.id
                          ? <span className="shrink-0 text-xs text-stone-400">Adding…</span>
                          : <Icon name="plus" className="h-4 w-4 shrink-0 text-stone-300 group-hover:text-accent" />}
                    />
                  </li>
                );
              })}
              {!loading && !searching && results.length === 0 && <li className="py-8 text-center text-sm text-stone-400">No songs found.</li>}
              {searching && <li className="py-3 text-center text-sm text-stone-400">Searching…</li>}
            </ul>
            <footer className="shrink-0 border-t border-stone-200 px-5 py-3 text-xs text-stone-500 sm:px-6">{a.songs.length} selected</footer>
          </div>
        </Modal>
      )}
    </div>
  );
}
