import type { TextBox } from "./types";

const SLIDE_W_PT = 720; // 10in
const SLIDE_H_PT = 405; // 5.625in

export const GOSPEL_MIN_SIZE = 22;
export const GOSPEL_BODY: TextBox = { x: 0.06, y: 0.29, w: 0.88, h: 0.61, size: 30, align: "left", color: "FFFFFF" };

// Conservative width estimate shared by pagination and rendering, in points.
export function readingFits(box: TextBox, text: string, size: number): boolean {
  const capacity = (box.w * SLIDE_W_PT) / (size * 0.65);
  let rows = 1;
  let width = 0;
  for (const token of text.trim().split(/(\s+)/)) {
    if (!token) continue;
    if (/\s/.test(token)) {
      const newlines = token.match(/\n/g)?.length ?? 0;
      if (newlines) {
        rows += newlines;
        width = 0;
      } else if (width) {
        width += token.replace(/\t/g, "    ").length;
      }
      continue;
    }
    const length = Array.from(token).reduce((sum, character) =>
      sum + (/[MW@%]/.test(character) || character.codePointAt(0)! >= 0x2e80 ? 1.55 : /[mw]/.test(character) ? 1.35 : 1), 0);
    if (width && width + length > capacity) {
      rows++;
      width = 0;
    }
    if (length > capacity) {
      rows += Math.ceil(length / capacity) - 1;
      width = length % capacity || capacity;
    } else {
      width += length;
    }
  }
  return rows * size * 1.3 <= box.h * SLIDE_H_PT;
}

export function readingFontSize(box: TextBox, text: string): number {
  for (let size = box.size; size >= GOSPEL_MIN_SIZE; size--) {
    if (readingFits(box, text, size)) return size;
  }
  return GOSPEL_MIN_SIZE;
}

// Largest font size (pt) at which `text` fits the box; estimates wrapping from average glyph width.
export function fitSize(box: TextBox, text: string, min = 12): number {
  const lines = text.split("\n");
  for (let size = box.size; size > min; size -= 1) {
    const perLine = Math.max(1, Math.floor((box.w * SLIDE_W_PT) / (size * 0.52)));
    const rows = lines.reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
    if (rows * size * 1.3 <= box.h * SLIDE_H_PT) return size;
  }
  return min;
}
