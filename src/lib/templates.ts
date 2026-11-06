import packs from "./templates.generated.json";
import type { LayoutName, Slide, SlideKind, Template } from "./types";

// Template packs live in public/templates/<id>/ and are indexed by scripts/templates.mjs.
export const TEMPLATES: Template[] = [
  ...(packs as Template[]),
  { id: "dawn", name: "Dawn", bg: "F7F3EC", fg: "2B2A28", accent: "9A7B4F", fontTitle: "Georgia", fontBody: "Georgia" },
  { id: "night", name: "Night Vigil", bg: "14181F", fg: "F1EEE7", accent: "C9A86A", fontTitle: "Georgia", fontBody: "Calibri" },
  { id: "grace", name: "Grace", bg: "FFFFFF", fg: "1F3A4D", accent: "5B8BA6", fontTitle: "Georgia", fontBody: "Calibri" },
  { id: "pentecost", name: "Pentecost", bg: "7A1F1F", fg: "FFF8EE", accent: "F2C57C", fontTitle: "Georgia", fontBody: "Calibri" },
];

export const DEFAULT_TEMPLATE = TEMPLATES[0].id;

export function getTemplate(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function layoutNameFor(slide: Pick<Slide, "kind" | "image" | "layout">): LayoutName {
  if (slide.layout) return slide.layout;
  if (slide.image) return "image";
  const byKind: Partial<Record<SlideKind, LayoutName>> = { welcome: "cover", closing: "cover", song: "song" };
  return byKind[slide.kind] ?? "content";
}

// The slide's layout, falling back to "content" when the template lacks that page.
export function layoutFor(t: Template, slide: Pick<Slide, "kind" | "image" | "layout">) {
  const name = layoutNameFor(slide);
  const layout = t.layouts?.[name] ?? t.layouts?.content;
  return layout ? { name: t.layouts?.[name] ? name : "content", layout } : null;
}
