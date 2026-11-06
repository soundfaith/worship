"use client";
import { Fragment, useState } from "react";
import { uid } from "@/lib/store";
import { DEFAULT_LINES, splitLyrics } from "@/lib/lyrics";
import { getTemplate } from "@/lib/templates";
import { songLabel, useSongSearch } from "@/lib/useSongs";
import type { Song } from "@/lib/types";
import { Icon, IconButton } from "@/components/Icon";
import { SongPreview } from "@/components/SongPreview";
import { SongResult } from "@/components/SongResult";

const letterOf = (label: string) => {
  const c = label.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
};

export default function SongsPage() {
  const [q, setQ] = useState("");
  const { results, total, custom, setCustom, getSong, loading, searching } = useSongSearch(q);
  const [open, setOpen] = useState<Song | null>(null);
  const [lines, setLines] = useState(DEFAULT_LINES);
  const [draft, setDraft] = useState<{ id?: string; title: string; lyrics: string } | null>(null);
  const searchingNow = q.trim().length > 0;

  const view = async (id: string) => setOpen(await getSong(id));

  const toDraft = async (id: string, copy: boolean) => {
    const s = await getSong(id);
    if (s) setDraft({ id: copy ? undefined : s.id, title: copy ? `${s.title} (copy)` : s.title, lyrics: s.slides.join("\n\n") });
  };

  const save = () => {
    if (!draft || !draft.title.trim()) return;
    const song: Song = {
      id: draft.id ?? `custom-${uid()}`,
      title: draft.title.trim(),
      slides: splitLyrics(draft.lyrics),
      custom: true,
    };
    setCustom((l) => (draft.id ? l.map((x) => (x.id === draft.id ? song : x)) : [...l, song]));
    setDraft(null);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Library</p>
          <h1 className="display text-stone-900">Songs</h1>
          <p className="mt-2 text-stone-500">
            {loading ? "Loading…" : searchingNow ? `${results.length} found${searching ? "…" : ""} · title matches first, then lyrics` : `${total} songs`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setDraft({ title: "", lyrics: "" })}>
          <Icon name="plus" className="h-4 w-4" /> Import song
        </button>
      </div>

      {draft && (
        <div className="card space-y-4 p-6">
          <h2 className="display text-2xl text-stone-900">{draft.id ? "Edit song" : "Import song"}</h2>
          <input className="input" placeholder="Title" aria-label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <textarea
            className="input h-64 font-mono text-sm"
            aria-label="Lyrics"
            placeholder={"Paste lyrics. Leave a blank line between verses, chorus, bridge.\nSlides are created automatically (4 lines each by default)."}
            value={draft.lyrics}
            onChange={(e) => setDraft({ ...draft, lyrics: e.target.value })}
          />
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={save}>Save</button>
            <button className="btn" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-400" />
        <input className="input !py-3 !pl-11" placeholder="Search by title or any line of the lyrics…" aria-label="Search songs" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="card max-h-[38rem] overflow-y-auto p-2">
          <ul className="space-y-0.5">
            {results.map((s, i) => {
              const letter = letterOf(songLabel(s));
              const header = !searchingNow && (i === 0 || letter !== letterOf(songLabel(results[i - 1])));
              return (
                <Fragment key={s.id}>
                  {header && (
                    <li className="sticky top-0 z-10 bg-surface/95 px-3 pb-1 pt-3 text-xs font-medium tracking-widest text-accent backdrop-blur">{letter}</li>
                  )}
                  <li className="group/row flex items-center gap-1 pr-1">
                    <div className="min-w-0 flex-1">
                      <SongResult s={s} active={open?.id === s.id} onClick={() => view(s.id)} />
                    </div>
                    <span className="flex opacity-0 transition-opacity focus-within:opacity-100 group-hover/row:opacity-100">
                      <IconButton icon="copy" label="Duplicate song" onClick={() => toDraft(s.id, true)} />
                      {s.custom && (
                        <>
                          <IconButton icon="edit" label="Edit song" onClick={() => toDraft(s.id, false)} />
                          <IconButton icon="trash" label="Delete song" danger onClick={() => confirm("Delete song?") && setCustom(custom.filter((x) => x.id !== s.id))} />
                        </>
                      )}
                    </span>
                  </li>
                </Fragment>
              );
            })}
            {!loading && !searching && results.length === 0 && <li className="p-6 text-center text-sm text-stone-400">No songs found.</li>}
          </ul>
        </div>

        <div className="card p-6 lg:sticky lg:top-24">
          {open ? (
            <div className="space-y-5">
              <h2 className="display text-3xl text-stone-900">{open.title}</h2>
              <SongPreview title={open.title} source={open.slides} lines={lines} onLines={setLines} template={getTemplate("")} />
            </div>
          ) : (
            <div className="grid place-items-center gap-3 py-16 text-center text-stone-400">
              <Icon name="music" className="h-8 w-8" />
              <p className="text-sm">Select a song to preview its slides.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
