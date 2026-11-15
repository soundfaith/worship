import type { Slide } from "./types";

// Applies a regenerated slide list to the slides the user already has.
// Existing slides keep their order, edits and design. Generated text is refreshed unless the user changed it.
// Generated slides whose source was removed are dropped. Hand-added slides stay put.
export function mergeSlides(prev: Slide[] | null, next: Slide[]): Slide[] {
  if (!prev) return next;

  const nextBySource = new Map(next.flatMap((s) => (s.source ? [[s.source.id, s] as const] : [])));
  const prevIds = new Map<string, string>(); // source id -> id of the kept slide
  const out: Slide[] = [];

  for (const old of prev) {
    if (!old.source) {
      out.push(old);
      continue;
    }
    const fresh = nextBySource.get(old.source.id);
    if (!fresh) continue;
    const edited = old.title !== old.source.title || old.body !== old.source.body;
    out.push({
      ...old,
      title: edited ? old.title : fresh.title,
      body: edited ? old.body : fresh.body,
      groupId: old.groupId ?? fresh.groupId,
      source: fresh.source,
    });
    prevIds.set(old.source.id, old.id);
  }

  // New generated slides go after the slide that precedes them in the regenerated list.
  let anchor: string | null = null;
  for (const fresh of next) {
    const source = fresh.source?.id;
    if (source && prevIds.has(source)) {
      anchor = prevIds.get(source) ?? anchor;
      continue;
    }
    const at = anchor ? out.findIndex((s) => s.id === anchor) + 1 : 0;
    out.splice(at, 0, fresh);
    anchor = fresh.id;
  }
  return out;
}
