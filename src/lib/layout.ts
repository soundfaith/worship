import type { TextBox } from "./types";

const SLIDE_W_PT = 720; // 10in
const SLIDE_H_PT = 405; // 5.625in

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
