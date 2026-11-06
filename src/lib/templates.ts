import packs from "./templates.generated.json";
import { GOSPEL_BODY } from "./layout";
import type { Layout, LayoutName, Slide, SlideKind, Template } from "./types";

export const TEMPLATES: Template[] = packs as Template[];
export const DEFAULT_TEMPLATE = TEMPLATES[0]?.id ?? "";
export const FONTS = ["Inter", "Arial", "Calibri", "Georgia", "Times New Roman", "Verdana"] as const;
export const DEFAULT_FONT = "Calibri";

export const LAYOUT_OPTIONS: { id: LayoutName; label: string }[] = [
  { id: "cover", label: "Title slide" },
  { id: "song", label: "Song lyrics" },
  { id: "content", label: "Title and text" },
  { id: "centered", label: "Centered title and text" },
  { id: "title-only", label: "Title only" },
  { id: "image", label: "Title, text and image right" },
  { id: "image-left", label: "Title, text and image left" },
  { id: "title-image", label: "Title and image" },
  { id: "two-images", label: "Title and two images" },
  { id: "text-two-images", label: "Title, text and two images" },
];

export function getTemplate(id: string): Template {
  const found = TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
  if (!found) throw new Error("No templates are available. Add a presentation and run npm run templates.");
  return found;
}

export function layoutNameFor(slide: Pick<Slide, "kind" | "image" | "layout">): LayoutName {
  if (slide.layout) return slide.layout;
  if (slide.image) return "image";
  const byKind: Partial<Record<SlideKind, LayoutName>> = { welcome: "cover", closing: "cover", song: "song" };
  return byKind[slide.kind] ?? "content";
}

function contentLayout(name: LayoutName, color: string): Layout {
  const box = (x: number, y: number, w: number, h: number, size: number, align: "left" | "center" = "left") =>
    ({ x, y, w, h, size, align, color });
  const result: Layout = {
    title: box(0.06, 0.1, 0.88, 0.18, 35),
    body: box(0.06, 0.32, 0.88, 0.5, 28),
    fitTitle: true,
  };
  switch (name) {
    case "cover":
      result.title = box(0.07, 0.14, 0.46, 0.35, 44);
      result.body = box(0.07, 0.59, 0.46, 0.2, 23);
      break;
    case "song":
      result.title = box(0.07, 0.12, 0.86, 0.12, 24);
      result.body = box(0.07, 0.28, 0.86, 0.5, 32);
      break;
    case "centered":
      result.title = box(0.08, 0.1, 0.84, 0.18, 35, "center");
      result.body = box(0.1, 0.3, 0.8, 0.52, 28, "center");
      break;
    case "title-only":
      result.title = box(0.08, 0.25, 0.84, 0.5, 48, "center");
      result.hideBody = true;
      break;
    case "image":
      result.title = box(0.06, 0.1, 0.42, 0.18, 32);
      result.body = box(0.06, 0.32, 0.42, 0.5, 26);
      result.image = { x: 0.53, y: 0.18, w: 0.41, h: 0.64 };
      break;
    case "image-left":
      result.title = box(0.53, 0.1, 0.41, 0.18, 32);
      result.body = box(0.53, 0.32, 0.41, 0.5, 26);
      result.image = { x: 0.06, y: 0.18, w: 0.41, h: 0.64 };
      break;
    case "title-image":
      result.title = box(0.08, 0.06, 0.84, 0.17, 35, "center");
      result.image = { x: 0.16, y: 0.26, w: 0.68, h: 0.66 };
      result.hideBody = true;
      break;
    case "two-images":
      result.title = box(0.08, 0.06, 0.84, 0.17, 35, "center");
      result.image = { x: 0.06, y: 0.28, w: 0.42, h: 0.62 };
      result.image2 = { x: 0.52, y: 0.28, w: 0.42, h: 0.62 };
      result.hideBody = true;
      break;
    case "text-two-images":
      result.title = box(0.06, 0.06, 0.88, 0.13, 30, "center");
      result.body = box(0.08, 0.2, 0.84, 0.14, 22, "center");
      result.image = { x: 0.06, y: 0.38, w: 0.42, h: 0.52 };
      result.image2 = { x: 0.52, y: 0.38, w: 0.42, h: 0.52 };
      break;
  }
  return result;
}

export function layoutFor(t: Template, slide: Pick<Slide, "kind" | "image" | "layout" | "textColor">) {
  const name = layoutNameFor(slide);
  if (t.backgrounds?.length) {
    const layout = contentLayout(name, slide.textColor ?? t.fg);
    if (slide.kind === "gospel" && name === "content") {
      layout.title = { ...layout.title, y: 0.08, h: 0.15, size: 30 };
      layout.body = { ...GOSPEL_BODY, color: slide.textColor ?? t.fg };
    }
    return { name, layout };
  }
  const layout = t.layouts?.[name] ?? t.layouts?.content;
  if (!layout) return null;
  return { name: t.layouts?.[name] ? name : "content", layout };
}

export function songIndexes(slides: Slide[]): number[] {
  const seen = new Map<string, number>();
  let count = 0;
  let previous: Slide | undefined;
  let previousIndex = 0;
  return slides.map((slide) => {
    if (slide.kind !== "song") {
      previous = slide;
      return 0;
    }
    let index = slide.songUid ? seen.get(slide.songUid) : undefined;
    if (index === undefined) {
      if (!slide.songUid && previous?.kind === "song" && !previous.songUid && previous.title === slide.title) {
        index = previousIndex;
      } else {
        index = count++;
      }
      if (slide.songUid) seen.set(slide.songUid, index);
    }
    previous = slide;
    previousIndex = index;
    return index;
  });
}

export function backgroundFor(t: Template, slide: Pick<Slide, "kind" | "image" | "image2" | "layout" | "background">, songIndex = 0) {
  const backgrounds = t.backgrounds ?? [];
  const selected = slide.background?.templateId === t.id ? slide.background.id : undefined;
  const kind = slide.image || slide.image2 ? "image" : slide.kind === "welcome" || slide.kind === "closing" ? "cover" : slide.kind === "song" ? "song" : "content";
  const songBackground = kind === "song" && t.songBackgrounds?.length
    ? t.songBackgrounds[songIndex % t.songBackgrounds.length] : undefined;
  const id = selected ?? songBackground ?? t.defaultBackgrounds?.[kind];
  return backgrounds.find((b) => b.id === id) ?? backgrounds[0];
}
