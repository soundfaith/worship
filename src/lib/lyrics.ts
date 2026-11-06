export const DEFAULT_LINES = 4;
export const MIN_LINES = 1;
export const MAX_LINES = 12;

// Splits raw lyrics into sections separated by blank lines.
export function splitLyrics(raw: string, maxLines = Infinity): string[] {
  const sections = raw
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((s) => s.replace(/^\n+|\n+$/g, ""))
    .filter((s) => s.trim());
  return sections.flatMap((sec) => chunkLines([sec], maxLines));
}

// Divides each source block into slides of `max` lines, keeping verse/chorus boundaries.
// A lone trailing line is avoided by borrowing one line from the previous slide (e.g. 4+4+1 -> 4+3+2).
export function chunkLines(blocks: string[], max: number = DEFAULT_LINES): string[] {
  const out: string[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    while (lines.length > 1 && !lines[lines.length - 1].trim()) lines.pop();
    const pages: string[][] = [];
    for (let i = 0; i < lines.length; i += max) pages.push(lines.slice(i, i + max));
    const n = pages.length;
    if (n > 1 && max > 2 && pages[n - 1].length === 1) pages[n - 1].unshift(pages[n - 2].pop()!);
    out.push(...pages.map((p) => p.join("\n")));
  }
  return out;
}
