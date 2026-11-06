"use client";
import { useState } from "react";
import { DEFAULT_LINES } from "@/lib/lyrics";
import { uid } from "@/lib/store";
import { getTemplate } from "@/lib/templates";
import { useSongSearch } from "@/lib/useSongs";
import { Icon, IconButton } from "./Icon";
import { Section, type TabProps } from "./ui";
import { SongPreview } from "./SongPreview";
import { SongResult } from "./SongResult";

export function SongsTab({ a, update }: TabProps) {
  const [q, setQ] = useState("");
  const [openUid, setOpenUid] = useState<string | null>(null);
  const { results, total, searching, getSong, loading } = useSongSearch(q);
  const template = getTemplate(a.sectionTemplates.song ?? a.templateId);

  const add = async (id: string) => {
    const s = await getSong(id);
    if (!s) return;
    const song = { uid: uid(), songId: s.id, title: s.title, slides: s.slides, lines: DEFAULT_LINES };
    update({ songs: [...a.songs, song], slides: null });
    setOpenUid(song.uid);
  };
  const move = (i: number, d: number) => {
    const next = [...a.songs];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    update({ songs: next, slides: null });
  };
  const setLines = (u: string, lines: number) =>
    update({ songs: a.songs.map((s) => (s.uid === u ? { ...s, lines } : s)), slides: null });

  const hint = loading
    ? "Loading…"
    : q.trim()
      ? `${results.length} found${searching ? "…" : ""} — title matches first, then lyrics`
      : `${total} songs · search by title or any line of the lyrics`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Library" hint={hint}>
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input className="input !pl-10" placeholder="Search title or lyrics…" aria-label="Search songs" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ul className="-mx-2 max-h-[30rem] space-y-0.5 overflow-y-auto px-2">
          {results.map((s) => (
            <li key={s.id}>
              <SongResult s={s} onClick={() => add(s.id)} right={<Icon name="plus" className="h-4 w-4 shrink-0 text-stone-300 group-hover:text-accent" />} />
            </li>
          ))}
          {!loading && !searching && results.length === 0 && <li className="py-3 text-sm text-stone-400">No songs found.</li>}
        </ul>
      </Section>

      <Section title="Selected songs" hint="Pick how many lines go on each slide. You can still edit slides in Review.">
        {a.songs.length === 0 && <p className="py-6 text-center text-sm text-stone-400">No songs yet. Pick from the library.</p>}
        <ol className="space-y-2.5">
          {a.songs.map((s, i) => (
            <li key={s.uid} className="rounded-xl border border-stone-200 bg-stone-50/60 text-sm">
              <div className="flex items-center gap-1 py-1 pl-4 pr-1.5">
                <span className="w-6 text-stone-400 tabular-nums">{i + 1}</span>
                <button className="flex-1 truncate py-1.5 text-left hover:text-accent" aria-expanded={openUid === s.uid} onClick={() => setOpenUid(openUid === s.uid ? null : s.uid)}>
                  {s.title}
                </button>
                <IconButton icon="up" label="Move up" onClick={() => move(i, -1)} disabled={i === 0} />
                <IconButton icon="down" label="Move down" onClick={() => move(i, 1)} disabled={i === a.songs.length - 1} />
                <IconButton icon="close" label="Remove" danger onClick={() => update({ songs: a.songs.filter((x) => x.uid !== s.uid), slides: null })} />
              </div>
              {openUid === s.uid && (
                <div className="border-t border-stone-200 p-4">
                  <SongPreview title={s.title} source={s.slides} lines={s.lines ?? DEFAULT_LINES} onLines={(n) => setLines(s.uid, n)} template={template} font={a.font} />
                </div>
              )}
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
