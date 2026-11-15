import type { Slide } from "./types";

// Slides that belong together (a song, the Gospel reading, or a long content item) move as one section.
export function slideGroupKey(slide: Slide): string | null {
  if (slide.songUid) return `song:${slide.songUid}`;
  if (slide.groupId) return `group:${slide.groupId}`;
  if (slide.kind === "gospel") return "gospel";
  return null;
}

export function groupRange(slides: Slide[], index: number): { start: number; end: number } {
  const key = slideGroupKey(slides[index]);
  if (!key) return { start: index, end: index + 1 };
  let start = index;
  let end = index + 1;
  while (start > 0 && slideGroupKey(slides[start - 1]) === key) start--;
  while (end < slides.length && slideGroupKey(slides[end]) === key) end++;
  return { start, end };
}

// Moves slides[start, end) past one neighbor. With wholeNeighbor, the neighbor's whole group is passed at once.
export function moveSlideRange(
  slides: Slide[],
  start: number,
  end: number,
  direction: -1 | 1,
  wholeNeighbor: boolean,
): { slides: Slide[]; index: number } | null {
  const block = slides.slice(start, end);
  if (direction < 0) {
    if (start === 0) return null;
    const from = wholeNeighbor ? groupRange(slides, start - 1).start : start - 1;
    return { slides: [...slides.slice(0, from), ...block, ...slides.slice(from, start), ...slides.slice(end)], index: from };
  }
  if (end >= slides.length) return null;
  const to = wholeNeighbor ? groupRange(slides, end).end : end + 1;
  return {
    slides: [...slides.slice(0, start), ...slides.slice(end, to), ...block, ...slides.slice(to)],
    index: start + (to - end),
  };
}
