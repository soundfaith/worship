"use client";
import { useEffect, useMemo, useState } from "react";
import { matchSong } from "./search";
import { DEFAULT_SONG_FILTERS, matchesSongFilters, songFilterParams, type SongFilters } from "./song-filters";
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
      ...custom.map((s) => ({ id: s.id, title: s.title, slideCount: s.slides.length, custom: true, language: s.language, tempo: s.tempo, energy: s.energy, tags: s.tags })),
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
  const [filters, setFilters] = useState<SongFilters>(DEFAULT_SONG_FILTERS);
  const query = q.trim();
  const params = songFilterParams(filters);
  params.set("q", query);
  const requestKey = params.toString();
  const [remote, setRemote] = useState<{ key: string; hits: SongIndexEntry[]; error?: string }>({ key: "", hits: [] });

  useEffect(() => {
    if (!query) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/songs?${requestKey}`, { signal: ctrl.signal })
        .then(async (r) => {
          if (!r.ok) throw new Error(`Song search failed (HTTP ${r.status}).`);
          return r.json() as Promise<SongIndexEntry[]>;
        })
        .then((hits) => setRemote({ key: requestKey, hits }))
        .catch((error: unknown) => {
          if (!ctrl.signal.aborted) setRemote({ key: requestKey, hits: [], error: error instanceof Error ? error.message : "Song search failed." });
        });
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, requestKey]);

  const results = useMemo<SongIndexEntry[]>(() => {
    if (!query) return index.filter((song) => matchesSongFilters(song, filters));
    const local = custom
      .filter((song) => matchesSongFilters(song, filters))
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
        language: s.language,
        tempo: s.tempo,
        energy: s.energy,
        tags: s.tags,
      }));
    const lib = remote.key === requestKey ? remote.hits : [];
    return [...local, ...lib].sort((a, b) => (a.rank ?? 9) - (b.rank ?? 9) || compareSongs(a, b));
  }, [query, index, custom, remote, filters, requestKey]);

  const searching = !!query && remote.key !== requestKey;
  const searchError = query && remote.key === requestKey ? remote.error : undefined;
  const total = index.filter((song) => matchesSongFilters(song, filters)).length;
  return { results, total, index, custom, searching, searchError, filters, setFilters, ...rest };
}

export function songLabel(s: SongIndexEntry) {
  return s.versionCount && s.versionCount > 1 ? `${s.title} (v${s.version})` : s.title;
}

function compareSongs(a: SongIndexEntry, b: SongIndexEntry) {
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) || a.id.localeCompare(b.id);
}
