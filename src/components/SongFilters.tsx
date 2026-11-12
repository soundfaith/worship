"use client";

import { DEFAULT_SONG_FILTERS, SONG_THEMES, type SongFilters } from "@/lib/song-filters";
import { Icon } from "./Icon";

export function SongFilterPanel({ filters, onChange, compact = false }: { filters: SongFilters; onChange: (filters: SongFilters) => void; compact?: boolean }) {
  const count = Number(!filters.showOtherLanguages) + Number(filters.tempo !== "all") +
    Number(filters.energy !== null) + filters.themes.length;
  const buttonClass = (selected: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm transition ${selected ? "border-accent bg-accent/15 text-stone-900" : "border-stone-200 text-stone-600 hover:bg-stone-100"}`;

  return (
    <details className="rounded-xl border border-stone-200 bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-medium text-stone-700 [&::-webkit-details-marker]:hidden">
        <span>Filters <span className="ml-1 font-normal text-stone-500">· {count} {count === 1 ? "filter" : "filters"}</span></span>
        <Icon name="chevron" className="h-4 w-4 shrink-0 text-stone-500" />
      </summary>
      <div className={`${compact ? "max-h-[20dvh] sm:max-h-[35dvh]" : "max-h-[35dvh]"} space-y-4 overflow-y-auto border-t border-stone-200 p-4`}>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={filters.showOtherLanguages} onChange={(event) => onChange({ ...filters, showOtherLanguages: event.target.checked })} />
          Show other languages
        </label>
        <p className="text-xs text-stone-500">Songs without a language, including newly imported songs, appear only when this is on.</p>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-stone-700">Tempo</legend>
          <div className="flex flex-wrap gap-2">
            {(["all", "fast", "slow"] as const).map((tempo) => (
              <button key={tempo} type="button" aria-pressed={filters.tempo === tempo} className={buttonClass(filters.tempo === tempo)} onClick={() => onChange({ ...filters, tempo })}>
                {tempo[0].toUpperCase() + tempo.slice(1)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-stone-700">Energy</legend>
          <div className="flex flex-wrap gap-2">
            {[null, 1, 2, 3, 4, 5].map((energy) => (
              <button key={energy ?? "all"} type="button" aria-pressed={filters.energy === energy} className={buttonClass(filters.energy === energy)} onClick={() => onChange({ ...filters, energy })}>
                {energy ?? "All"}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-stone-700">Themes</legend>
          <p className="mb-2 text-xs text-stone-500">Matches any selected theme.</p>
          <div className="flex flex-wrap gap-2">
            {SONG_THEMES.map((theme) => {
              const selected = filters.themes.includes(theme);
              const label = theme.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
              return (
                <button key={theme} type="button" aria-pressed={selected} className={buttonClass(selected)} onClick={() => onChange({
                  ...filters,
                  themes: selected ? filters.themes.filter((item) => item !== theme) : [...filters.themes, theme],
                })}>{label}</button>
              );
            })}
          </div>
        </fieldset>
        <button type="button" className="btn btn-ghost" onClick={() => onChange(DEFAULT_SONG_FILTERS)}>Reset filters</button>
      </div>
    </details>
  );
}
