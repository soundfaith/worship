import type { SongIndexEntry } from "@/lib/types";
import { songLabel } from "@/lib/useSongs";

export function SongResult({
  s,
  onClick,
  active,
  right,
  disabled,
}: {
  s: SongIndexEntry;
  onClick: () => void;
  active?: boolean;
  right?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      className={`group flex min-w-0 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-50 ${
        active ? "bg-accent/12 text-stone-900" : "hover:bg-stone-100"
      }`}
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate">
          {songLabel(s)}
          {s.custom && <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">custom</span>}
          {s.match === "lyrics" && <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500 group-hover:bg-stone-200">in lyrics</span>}
        </span>
        {s.match === "lyrics" && s.snippet && <span className="mt-0.5 block truncate text-xs italic text-stone-500">“{s.snippet}”</span>}
      </span>
      {right}
    </button>
  );
}
