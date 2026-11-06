"use client";
import { useEffect, useMemo, useState } from "react";
import { matchSong } from "./search";
import type { Song, SongIndexEntry } from "./types";
import { useLocalStore } from "./store";

const NO_SONGS: Song[] = [];

export function useSongs() {
  const [custom, setCustom] = useLocalStore<Song[]>("worship.customSongs", NO_SONGS);
  const [library, setLibrary] = useState<SongIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/songs")
      .then((r) => r.json())
      .then((d) => setLibrary(d))
      .finally(() => setLoading(false));
  }, []);

  const index = useMemo<SongIndexEntry[]>(
    () => [
      ...custom.map((s) => ({ id: s.id, title: s.title, slideCount: s.slides.length, custom: true })),
      ...library,
    ].sort(compareSongs),
    [custom, library],
  );

  const getSong = async (id: string): Promise<Song | null> => {
    const c = custom.find((s) => s.id === id);
    if (c) return c;
    const r = await fetch(`/api/songs?id=${encodeURIComponent(id)}`);
    return r.ok ? r.json() : null;
  };

  return { index, custom, setCustom, getSong, loading };
}

// Title matches first, then lyrics matches. Empty query returns the full index.
export function useSongSearch(q: string) {
  const { index, custom, ...rest } = useSongs();
  const query = q.trim();
  const [remote, setRemote] = useState<{ q: string; hits: SongIndexEntry[] }>({ q: "", hits: [] });

  useEffect(() => {
    if (!query) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/songs?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((hits) => setRemote({ q: query, hits }))
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const results = useMemo<SongIndexEntry[]>(() => {
    if (!query) return index;
    const local = custom
      .map((s) => ({ s, hit: matchSong(s.title, s.slides, query) }))
      .filter((x) => x.hit)
      .map(({ s, hit }) => ({
        id: s.id,
        title: s.title,
        slideCount: s.slides.length,
        custom: true,
        rank: hit!.rank,
        match: hit!.match,
        snippet: hit!.snippet,
      }));
    const lib = remote.q === query ? remote.hits : [];
    return [...local, ...lib].sort((a, b) => (a.rank ?? 9) - (b.rank ?? 9) || compareSongs(a, b));
  }, [query, index, custom, remote]);

  const searching = !!query && remote.q !== query;
  return { results, total: index.length, index, custom, searching, ...rest };
}

export function songLabel(s: SongIndexEntry) {
  return s.versionCount && s.versionCount > 1 ? `${s.title} (v${s.version})` : s.title;
}

function compareSongs(a: SongIndexEntry, b: SongIndexEntry) {
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) || a.id.localeCompare(b.id);
}
