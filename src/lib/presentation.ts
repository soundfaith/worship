export function presentationIndexForSwipe(index: number, slideCount: number, dx: number, dy: number): number {
  if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return index;
  return Math.max(0, Math.min(slideCount - 1, index + (dx < 0 ? 1 : -1)));
}
