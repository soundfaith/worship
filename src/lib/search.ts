export interface SongHit {
  rank: number; // 0-2 title matches, 3-4 lyrics matches
  match: "title" | "lyrics";
  snippet?: string;
}

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Title matches rank above lyrics matches.
export function matchSong(title: string, slides: string[], query: string): SongHit | null {
  const nq = normalize(query);
  if (!nq) return null;
  const words = nq.split(" ");
  const nt = normalize(title);

  if (nt.startsWith(nq)) return { rank: 0, match: "title" };
  if (nt.includes(nq)) return { rank: 1, match: "title" };
  if (words.every((w) => nt.includes(w))) return { rank: 2, match: "title" };

  const lines = slides.flatMap((s) => s.split("\n")).filter((l) => l.trim());
  const nl = lines.map(normalize);
  const phrase = nl.findIndex((l) => l.includes(nq));
  if (phrase >= 0) return { rank: 3, match: "lyrics", snippet: lines[phrase].trim() };

  const whole = normalize(lines.join(" "));
  if (words.every((w) => whole.includes(w))) {
    const i = nl.findIndex((l) => l.includes(words[0]));
    return { rank: 4, match: "lyrics", snippet: i >= 0 ? lines[i].trim() : undefined };
  }
  return null;
}
