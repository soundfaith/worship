"use client";
import { chunkLines, DEFAULT_LINES, MAX_LINES, MIN_LINES } from "@/lib/lyrics";
import { getTemplate } from "@/lib/templates";
import type { Template } from "@/lib/types";
import { SlideView } from "./SlideView";

export function LinesControl({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const step = "grid h-7 w-7 place-items-center rounded-full text-stone-600 transition hover:bg-stone-200 disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-stone-100 p-1 text-sm" role="group" aria-label="Lines per slide">
      <button className={step} aria-label="Fewer lines per slide" disabled={value <= MIN_LINES} onClick={() => onChange(value - 1)}>−</button>
      <span className="w-[4.5rem] text-center tabular-nums text-stone-800">{value} {value === 1 ? "line" : "lines"}</span>
      <button className={step} aria-label="More lines per slide" disabled={value >= MAX_LINES} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

export function SongPreview({
  title,
  source,
  lines,
  onLines,
  template,
  font,
}: {
  title: string;
  source: string[];
  lines: number;
  onLines: (n: number) => void;
  template?: Template;
  font?: string;
}) {
  const tpl = template ?? getTemplate("");
  const pages = chunkLines(source, lines);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LinesControl value={lines} onChange={onLines} />
        <span className="text-xs text-stone-500">
          {pages.length} slides{lines !== DEFAULT_LINES ? ` · default is ${DEFAULT_LINES}` : ""}
        </span>
      </div>
      <div className="grid max-h-[28rem] grid-cols-2 gap-3 overflow-y-auto pr-1">
        {pages.map((body, i) => (
          <div key={i} className="space-y-1">
            <SlideView slide={{ id: `p${i}`, kind: "song", title, body }} template={tpl} font={font} />
            <p className="text-center text-[11px] tabular-nums text-stone-400">{i + 1}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
