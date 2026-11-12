import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { matchSong } from "@/lib/search";
import { matchesSongFilters, songFiltersFromParams } from "@/lib/song-filters";
import type { Song } from "@/lib/types";

let cache: Song[] | null = null;

async function load(): Promise<Song[]> {
  if (!cache) {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "songs.json"), "utf-8");
    cache = (JSON.parse(raw) as { songs: Song[] }).songs;
  }
  return cache;
}

const entry = (s: Song) => ({
  id: s.id,
  title: s.title,
  slideCount: s.slides.length,
  version: s.version,
  versionCount: s.versionCount,
  language: s.language,
  tempo: s.tempo,
  energy: s.energy,
  tags: s.tags,
});

// ?id=… full song · ?q=… ranked search (title first, then lyrics) · no params: lightweight index.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const id = params.get("id");
  const q = params.get("q");
  const songs = await load();

  if (id) {
    const song = songs.find((s) => s.id === id);
    return song ? NextResponse.json(song) : NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (q) {
    let filters;
    try {
      filters = songFiltersFromParams(params);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid song filters." }, { status: 400 });
    }
    const hits = songs
      .filter((song) => matchesSongFilters(song, filters))
      .map((s) => ({ s, hit: matchSong(s.title, s.slides, q) }))
      .filter((x): x is { s: Song; hit: NonNullable<typeof x.hit> } => x.hit !== null)
      .sort((a, b) => a.hit.rank - b.hit.rank || a.s.title.localeCompare(b.s.title))
      .slice(0, 200)
      .map(({ s, hit }) => ({ ...entry(s), rank: hit.rank, match: hit.match, snippet: hit.snippet }));
    return NextResponse.json(hits);
  }
  return NextResponse.json(songs.map(entry));
}
