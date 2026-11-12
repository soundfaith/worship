import type { SongMetadata } from "./types";

export const SONG_THEMES = [
  "praise", "worship", "adoration", "love", "hope", "faith", "trust", "healing",
  "holy-spirit", "mission", "community", "family", "unity", "salvation", "cross",
  "eucharist", "mary", "christmas", "advent", "resurrection", "joy", "victory",
  "surrender", "service", "discipleship",
] as const;

export type SongTheme = typeof SONG_THEMES[number];
export interface SongFilters {
  showOtherLanguages: boolean;
  tempo: "all" | "fast" | "slow";
  energy: number | null;
  themes: SongTheme[];
}

export const DEFAULT_SONG_FILTERS: SongFilters = {
  showOtherLanguages: false,
  tempo: "all",
  energy: null,
  themes: [],
};

export function matchesSongFilters(song: SongMetadata, filters: SongFilters): boolean {
  return (filters.showOtherLanguages || song.language?.toLowerCase() === "english") &&
    (filters.tempo === "all" || song.tempo === filters.tempo) &&
    (filters.energy === null || song.energy === filters.energy) &&
    (filters.themes.length === 0 || filters.themes.some((theme) => song.tags?.includes(theme)));
}

export function songFilterParams(filters: SongFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (!filters.showOtherLanguages) params.set("language", "english");
  if (filters.tempo !== "all") params.set("tempo", filters.tempo);
  if (filters.energy !== null) params.set("energy", String(filters.energy));
  for (const theme of filters.themes) params.append("theme", theme);
  return params;
}

export function songFiltersFromParams(params: URLSearchParams): SongFilters {
  const tempo = params.get("tempo");
  const energy = params.get("energy");
  const themes = params.getAll("theme");
  if ((params.has("language") && params.get("language") !== "english") ||
      (tempo !== null && tempo !== "slow" && tempo !== "fast") ||
      (energy !== null && !/^[1-5]$/.test(energy)) ||
      themes.some((theme) => !SONG_THEMES.some((allowed) => allowed === theme))) {
    throw new Error("Invalid song filters.");
  }
  return {
    showOtherLanguages: !params.has("language"),
    tempo: tempo === "slow" || tempo === "fast" ? tempo : "all",
    energy: energy === null ? null : Number(energy),
    themes: themes.filter((theme): theme is SongTheme => SONG_THEMES.some((allowed) => allowed === theme)),
  };
}
