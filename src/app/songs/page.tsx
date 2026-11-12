"use client";
import { Fragment, useState } from "react";
import { uid } from "@/lib/store";
import { chunkLines, DEFAULT_LINES, splitLyrics } from "@/lib/lyrics";
import { DEFAULT_TEMPLATE, getTemplate, TEMPLATES } from "@/lib/templates";
import { usePreferredFont } from "@/lib/assemblies";
import { exportSlides } from "@/lib/export";
import { songLabel, useSongSearch } from "@/lib/useSongs";
import type { Song, SongMetadata } from "@/lib/types";
import { Icon, IconButton } from "@/components/Icon";
import { SongPreview } from "@/components/SongPreview";
import { SongResult } from "@/components/SongResult";
import { SongFilterPanel } from "@/components/SongFilters";
import { ConfirmDialog } from "@/components/Modal";
import Dropdown from "@/components/ui/Dropdown";

const letterOf = (label: string) => {
  const c = label.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
};

export default function SongsPage() {
  const [q, setQ] = useState("");
  const { results, total, setCustom, getSong, loading, searching, searchError, filters, setFilters } = useSongSearch(q);
  const [open, setOpen] = useState<Song | null>(null);
  const [lines, setLines] = useState(DEFAULT_LINES);
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE);
  const [font] = usePreferredFont();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<{ id?: string; title: string; lyrics: string; metadata?: SongMetadata } | null>(null);
  const [deleteSong, setDeleteSong] = useState<{ id: string; title: string } | null>(null);
  const searchingNow = q.trim().length > 0;

  const view = async (id: string) => setOpen(await getSong(id));

  const toDraft = async (id: string, copy: boolean) => {
    const s = await getSong(id);
    if (s) setDraft({
      id: copy ? undefined : s.id,
      title: copy ? `${s.title} (copy)` : s.title,
      lyrics: s.slides.join("\n\n"),
      metadata: { language: s.language, tempo: s.tempo, energy: s.energy, tags: s.tags },
    });
  };

  const save = () => {
    if (!draft || !draft.title.trim()) return;
    const song: Song = {
      ...draft.metadata,
      id: draft.id ?? `custom-${uid()}`,
      title: draft.title.trim(),
      slides: splitLyrics(draft.lyrics),
      custom: true,
    };
    setCustom((l) => (draft.id ? l.map((x) => (x.id === draft.id ? song : x)) : [...l, song]));
    setDraft(null);
    setNotice(!song.language && !filters.showOtherLanguages ? "Song saved. Turn on Show other languages in Filters to see songs without a language." : "");
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 space-y-10">
      <div className="flex flex-col items-start gap-4">
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

      <div className="space-y-2">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-400" />
          <input className="input !py-3 !pl-11" placeholder="Search by title or any line of the lyrics…" aria-label="Search songs" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <SongFilterPanel filters={filters} onChange={setFilters} />
        {notice && <p role="status" className="text-sm text-stone-600">{notice}</p>}
        {searchError && <p role="alert" className="text-sm text-red-600">{searchError}</p>}
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="card min-w-0 max-h-[38rem] overflow-y-auto p-2" tabIndex={0} role="region" aria-label="Songs list">
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
                    <span className="flex shrink-0 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover/row:opacity-100">
                      <IconButton icon="copy" label="Duplicate song" onClick={() => toDraft(s.id, true)} />
                      {s.custom && (
                        <>
                          <IconButton icon="edit" label="Edit song" onClick={() => toDraft(s.id, false)} />
                          <IconButton icon="trash" label="Delete song" danger onClick={() => setDeleteSong({ id: s.id, title: s.title })} />
                        </>
                      )}
                    </span>
                  </li>
                </Fragment>
              );
            })}
            {!loading && !searching && !searchError && results.length === 0 && <li className="p-6 text-center text-sm text-stone-400">No songs found.</li>}
          </ul>
        </div>
        {deleteSong && <ConfirmDialog title="Delete song?" message={`“${deleteSong.title}” will be permanently deleted from this browser's song library.`} confirmLabel="Delete song" onCancel={() => setDeleteSong(null)} onConfirm={() => {
          setCustom((songs) => songs.filter((song) => song.id !== deleteSong.id));
          if (open?.id === deleteSong.id) setOpen(null);
          setDeleteSong(null);
        }} />}

        <div className="card min-w-0 p-4 sm:p-6 lg:sticky lg:top-24">
          {open ? (
            <div className="space-y-5">
              <h2 className="display text-3xl text-stone-900">{open.title}</h2>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-0 flex-1 text-sm text-stone-500">
                  <span className="mb-1 block">Template</span>
                  <Dropdown label="Template" selectedValue={templateId} onSelect={setTemplateId} items={TEMPLATES.map((t) => ({ value: t.id, label: t.name }))} />
                </div>
                <button className="btn btn-primary" disabled={busy} onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await exportSlides({
                      title: open.title,
                      templateId,
                      font,
                      slides: [
                        { id: "song-title", kind: "song", title: open.title, body: "", layout: "title-only" },
                        ...chunkLines(open.slides, lines).map((body, i) => ({ id: `song-${i}`, kind: "song" as const, title: open.title, body })),
                      ],
                    });
                  } catch (e) {
                    setError(`Export failed: ${e instanceof Error ? e.message : "unknown error"}`);
                  } finally { setBusy(false); }
                }}>{busy ? "Exporting…" : "Export PowerPoint"}</button>
              </div>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <SongPreview title={open.title} source={open.slides} lines={lines} onLines={setLines} template={getTemplate(templateId)} font={font} />
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
