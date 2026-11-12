import packs from "./templates.generated.json";
import { GOSPEL_BODY } from "./layout";
import type { Fill, Layout, LayoutName, Shape, Slide, SlideKind, Template } from "./types";

const importedTemplates = packs as Template[];
export const BLANK_TEMPLATE_ID = "blank";
export const BLANK_BACKGROUND_DEFAULT = "F7F5F0";
export const BACKGROUND_COLOR_OPTIONS = [
  { name: "Warm white", color: "F7F5F0" },
  { name: "White", color: "FFFFFF" },
  { name: "Sand", color: "EADFCB" },
  { name: "Sage", color: "DCE5D8" },
  { name: "Sky", color: "DCE8F2" },
  { name: "Blush", color: "F0DEDA" },
  { name: "Navy", color: "1D2940" },
  { name: "Forest", color: "21372F" },
] as const;
export const FONTS = [
  "Inter",
  "Arial",
  "Aptos",
  "Calibri",
  "Cambria",
  "Candara",
  "Century Gothic",
  "Franklin Gothic Medium",
  "Garamond",
  "Georgia",
  "Palatino Linotype",
  "Tahoma",
  "Trebuchet MS",
  "Verdana",
] as const;
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

const box = (x: number, y: number, w: number, h: number, size: number, color: string, align: "left" | "center" = "left") =>
  ({ x, y, w, h, size, align, color });
const solid = (color: string, alpha = 1): Fill => ({ type: "solid", color, alpha });
const fade = (color: string, start: number, end: number): Fill => ({
  type: "gradient",
  angle: 0,
  stops: [{ pos: 0, color, alpha: start }, { pos: 1, color, alpha: end }],
});
const shape = (type: Shape["type"], x: number, y: number, w: number, h: number, fill: Fill, opacity = 1): Shape =>
  ({ type, x, y, w, h, fill, opacity });

function premiumLayouts(bg: string, fg: string, accent: string, soft: string, style: "atelier" | "nocturne" | "olive" | "pilgrim" | "lumen" | "stillwater" | "solstice" | "cathedral" | "terra" | "meadow"): Partial<Record<LayoutName, Layout>> {
  const coverShapes: Shape[] = style === "atelier"
    ? [
        shape("ellipse", 0.68, -0.2, 0.48, 0.86, solid(accent, 0.14)),
        shape("ellipse", 0.78, 0.5, 0.28, 0.5, solid(soft, 0.7)),
        shape("roundRect", 0.08, 0.24, 0.09, 0.012, solid(accent)),
      ]
    : style === "nocturne"
      ? [
          shape("ellipse", 0.67, -0.2, 0.55, 0.95, solid(accent, 0.16)),
          shape("ellipse", 0.82, 0.53, 0.23, 0.42, solid(soft, 0.16)),
          shape("roundRect", 0.08, 0.24, 0.09, 0.012, solid(accent)),
        ]
        : style === "pilgrim"
          ? [
              shape("rect", 0, 0, 0.78, 1, fade("102D2A", 0.94, 0.12)),
              shape("roundRect", 0.08, 0.24, 0.18, 0.009, solid(accent)),
              shape("ellipse", 0.79, 0.64, 0.32, 0.56, solid(accent, 0.12)),
            ]
          : style === "lumen"
            ? [
                shape("rect", 0, 0, 0.8, 1, fade("F5EFE1", 0.96, 0.08)),
                shape("roundRect", 0.08, 0.24, 0.18, 0.009, solid(accent)),
                shape("ellipse", 0.82, -0.15, 0.3, 0.5, solid(accent, 0.14)),
              ]
            : style === "stillwater"
              ? [
                  shape("rect", 0, 0, 1, 1, solid("14252D", 0.24)),
                  shape("roundRect", 0.08, 0.24, 0.18, 0.009, solid(accent)),
                  shape("ellipse", 0.84, 0.62, 0.3, 0.52, solid(accent, 0.16)),
                ]
              : style === "solstice"
                ? [
                    shape("rect", 0.62, 0, 0.38, 1, fade("0C2438", 0.05, 0.88)),
                    shape("ellipse", 0.69, 0.13, 0.42, 0.72, solid(accent, 0.18)),
                    shape("ellipse", 0.77, 0.27, 0.26, 0.44, solid(accent, 0.24)),
                    shape("roundRect", 0.08, 0.24, 0.18, 0.009, solid(accent)),
                  ]
                : style === "cathedral"
                  ? [
                      shape("ellipse", 0.63, -0.3, 0.56, 1.06, solid(soft, 0.2)),
                      shape("roundRect", 0.72, 0.1, 0.34, 0.76, solid(accent, 0.12)),
                      shape("roundRect", 0.08, 0.24, 0.18, 0.009, solid(accent)),
                      shape("rect", 0.84, 0.1, 0.012, 0.76, solid(accent, 0.48)),
                    ]
                  : style === "terra"
                    ? [
                        shape("rect", 0.72, 0, 0.28, 1, solid(accent, 0.2)),
                        shape("ellipse", 0.67, 0.17, 0.48, 0.8, solid(accent, 0.24)),
                        shape("ellipse", 0.78, 0.33, 0.27, 0.44, solid(soft, 0.22)),
                        shape("roundRect", 0.08, 0.24, 0.18, 0.009, solid(accent)),
                      ]
                    : style === "meadow"
                      ? [
                          shape("ellipse", 0.69, -0.22, 0.5, 0.9, solid(soft, 0.3)),
                          shape("ellipse", 0.82, 0.56, 0.28, 0.46, solid(accent, 0.18)),
                          shape("roundRect", 0.08, 0.24, 0.18, 0.009, solid(accent)),
                          shape("rect", 0.08, 0.78, 0.36, 0.004, solid(accent, 0.7)),
                        ]
                      : [
          shape("ellipse", 0.68, -0.2, 0.5, 0.88, solid(accent, 0.18)),
          shape("ellipse", 0.82, 0.56, 0.24, 0.4, solid(soft, 0.3)),
          shape("roundRect", 0.08, 0.24, 0.09, 0.012, solid(accent)),
        ];
  const contentShapes: Shape[] = style === "pilgrim"
    ? [shape("rect", 0, 0, 1, 1, fade("102D2A", 0.84, 0.36)), shape("roundRect", 0.08, 0.29, 0.12, 0.012, solid(accent))]
    : style === "solstice"
      ? [shape("rect", 0, 0, 1, 1, fade("0C2438", 0.86, 0.3)), shape("ellipse", 0.77, 0.63, 0.32, 0.56, solid(accent, 0.14)), shape("roundRect", 0.08, 0.29, 0.15, 0.01, solid(accent))]
      : style === "cathedral"
        ? [shape("rect", 0, 0, 1, 1, solid("211C35", 0.3)), shape("roundRect", 0.84, 0.08, 0.1, 0.84, solid(accent, 0.1)), shape("rect", 0.89, 0.08, 0.008, 0.84, solid(accent, 0.55)), shape("roundRect", 0.08, 0.29, 0.12, 0.01, solid(accent))]
        : style === "terra"
          ? [shape("rect", 0, 0, 0.025, 1, solid(accent, 0.85)), shape("ellipse", 0.82, 0.63, 0.3, 0.52, solid(accent, 0.14)), shape("roundRect", 0.08, 0.29, 0.15, 0.01, solid(accent))]
          : style === "meadow"
            ? [shape("rect", 0, 0, 1, 1, fade("253A32", 0.76, 0.2)), shape("ellipse", 0.82, 0.65, 0.3, 0.5, solid(soft, 0.16)), shape("roundRect", 0.08, 0.29, 0.15, 0.01, solid(accent))]
    : style === "lumen"
        ? [shape("rect", 0, 0, 1, 1, fade("F5EFE1", 0.94, 0.35)), shape("roundRect", 0.08, 0.29, 0.12, 0.012, solid(accent))]
        : style === "stillwater"
          ? [shape("rect", 0, 0, 1, 1, solid("14252D", 0.32)), shape("roundRect", 0.08, 0.29, 0.12, 0.012, solid(accent))]
          : [
    shape("roundRect", 0.055, 0.08, 0.012, 0.82, solid(accent)),
    shape("ellipse", 0.91, 0.04, 0.18, 0.32, solid(soft, 0.6)),
    shape("roundRect", 0.08, 0.29, 0.12, 0.012, solid(accent, 0.8)),
  ];
  const imageShapes: Shape[] = style === "pilgrim" || style === "stillwater"
    ? [shape("roundRect", 0.57, 0.19, 0.38, 0.64, solid("102D2A", 0.2)), shape("roundRect", 0.08, 0.29, 0.12, 0.012, solid(accent))]
    : [
    shape("roundRect", 0.57, 0.19, 0.38, 0.64, solid(soft, 0.55)),
    shape("roundRect", 0.08, 0.29, 0.12, 0.012, solid(accent, 0.8)),
  ];
  const make = (
    title: Layout["title"],
    body: Layout["body"],
    shapes: Shape[],
    options: Pick<Layout, "image" | "image2" | "hideBody"> = {},
  ): Layout => ({ bg: solid(bg), shapes, title, body, fitTitle: true, ...options });

  return {
    cover: make(box(0.08, 0.31, 0.56, 0.27, 50, fg), box(0.08, 0.65, 0.55, 0.16, 23, fg), coverShapes),
    song: make(box(0.1, 0.1, 0.8, 0.13, 25, accent, "center"), box(0.1, 0.29, 0.8, 0.56, 34, fg, "center"), [
      shape("roundRect", 0.1, 0.26, 0.8, 0.008, solid(accent, 0.6)),
      shape("ellipse", 0.02, 0.72, 0.17, 0.3, solid(soft, 0.55)),
      shape("ellipse", 0.88, -0.03, 0.16, 0.28, solid(soft, 0.55)),
    ]),
    content: make(box(0.09, 0.11, 0.8, 0.16, 35, fg), box(0.1, 0.34, 0.78, 0.52, 26, fg), contentShapes),
    centered: make(box(0.1, 0.13, 0.8, 0.16, 37, fg, "center"), box(0.15, 0.34, 0.7, 0.5, 27, fg, "center"), [
      shape("roundRect", 0.42, 0.31, 0.16, 0.01, solid(accent)),
      shape("ellipse", -0.08, 0.72, 0.24, 0.42, solid(soft, 0.6)),
      shape("ellipse", 0.88, -0.12, 0.24, 0.42, solid(soft, 0.6)),
    ]),
    "title-only": make(box(0.1, 0.24, 0.8, 0.48, 48, fg, "center"), box(0.1, 0.75, 0.8, 0.1, 20, fg, "center"), [
      shape("roundRect", 0.42, 0.19, 0.16, 0.012, solid(accent)),
      shape("ellipse", 0.82, 0.72, 0.3, 0.52, solid(soft, 0.55)),
    ], { hideBody: true }),
    image: make(box(0.08, 0.12, 0.42, 0.16, 34, fg), box(0.08, 0.35, 0.42, 0.48, 25, fg), imageShapes, { image: { x: 0.56, y: 0.17, w: 0.39, h: 0.66 } }),
    "image-left": make(box(0.55, 0.12, 0.39, 0.16, 34, fg), box(0.55, 0.35, 0.39, 0.48, 25, fg), [
      shape("roundRect", 0.06, 0.17, 0.39, 0.66, solid(soft, 0.55)),
      shape("roundRect", 0.56, 0.3, 0.12, 0.012, solid(accent, 0.8)),
    ], { image: { x: 0.06, y: 0.17, w: 0.39, h: 0.66 } }),
    "title-image": make(box(0.1, 0.06, 0.8, 0.15, 34, fg, "center"), box(0.1, 0.22, 0.8, 0.12, 20, fg, "center"), [
      shape("roundRect", 0.16, 0.27, 0.68, 0.64, solid(soft, 0.55)),
    ], { image: { x: 0.16, y: 0.27, w: 0.68, h: 0.64 }, hideBody: true }),
    "two-images": make(box(0.1, 0.05, 0.8, 0.16, 35, fg, "center"), box(0.1, 0.22, 0.8, 0.1, 20, fg, "center"), [
      shape("roundRect", 0.06, 0.27, 0.42, 0.64, solid(soft, 0.55)),
      shape("roundRect", 0.52, 0.27, 0.42, 0.64, solid(soft, 0.55)),
    ], {
      image: { x: 0.06, y: 0.27, w: 0.42, h: 0.64 },
      image2: { x: 0.52, y: 0.27, w: 0.42, h: 0.64 },
      hideBody: true,
    }),
    "text-two-images": make(box(0.08, 0.04, 0.84, 0.12, 32, fg, "center"), box(0.08, 0.17, 0.84, 0.15, 22, fg, "center"), [
      shape("roundRect", 0.06, 0.36, 0.42, 0.55, solid(soft, 0.55)),
      shape("roundRect", 0.52, 0.36, 0.42, 0.55, solid(soft, 0.55)),
    ], {
      image: { x: 0.06, y: 0.36, w: 0.42, h: 0.55 },
      image2: { x: 0.52, y: 0.36, w: 0.42, h: 0.55 },
    }),
  };
}

const PREMIUM_TEMPLATES: Template[] = [
  {
    id: "solstice", name: "Solstice", bg: "0C2438", fg: "F8F3E7", accent: "D8AB62",
    fontTitle: "Georgia", fontBody: "Inter",
    layouts: premiumLayouts("0C2438", "F8F3E7", "D8AB62", "48667A", "solstice"),
  },
  {
    id: "cathedral", name: "Cathedral", bg: "211C35", fg: "F5F0E7", accent: "C9A66B",
    fontTitle: "Georgia", fontBody: "Inter",
    layouts: premiumLayouts("211C35", "F5F0E7", "C9A66B", "625D83", "cathedral"),
  },
  {
    id: "terra", name: "Terra", bg: "462B2A", fg: "F6EBDD", accent: "D99773",
    fontTitle: "Georgia", fontBody: "Inter",
    layouts: premiumLayouts("462B2A", "F6EBDD", "D99773", "9E6B55", "terra"),
  },
  {
    id: "meadow", name: "Meadow", bg: "253A32", fg: "F1F0E2", accent: "D5C67D",
    fontTitle: "Georgia", fontBody: "Inter",
    layouts: premiumLayouts("253A32", "F1F0E2", "D5C67D", "617A61", "meadow"),
  },
  {
    id: "atelier", name: "Atelier", bg: "F5F0E7", fg: "29251F", accent: "A55F43",
    fontTitle: "Georgia", fontBody: "Inter",
    layouts: premiumLayouts("F5F0E7", "29251F", "A55F43", "DCCBB4", "atelier"),
  },
  {
    id: "nocturne", name: "Nocturne", bg: "172132", fg: "F4F0E7", accent: "E5BD75",
    fontTitle: "Georgia", fontBody: "Inter",
    layouts: premiumLayouts("172132", "F4F0E7", "E5BD75", "7890A4", "nocturne"),
  },
  {
    id: "olive", name: "Olive", bg: "E9EEE6", fg: "26362D", accent: "62785D",
    fontTitle: "Georgia", fontBody: "Inter",
    layouts: premiumLayouts("E9EEE6", "26362D", "62785D", "CFDACB", "olive"),
  },
  {
    id: "pilgrim", name: "Pilgrim", bg: "102D2A", fg: "F7F1E3", accent: "D8B875",
    fontTitle: "Georgia", fontBody: "Inter",
    layouts: premiumLayouts("102D2A", "F7F1E3", "D8B875", "52756A", "pilgrim"),
  },
  {
    id: "lumen", name: "Lumen", bg: "F5EFE1", fg: "29251F", accent: "A15D3D",
    fontTitle: "Georgia", fontBody: "Inter",
    layouts: premiumLayouts("F5EFE1", "29251F", "A15D3D", "D7C6A7", "lumen"),
  },
  {
    id: "stillwater", name: "Stillwater", bg: "14252D", fg: "F1F4F2", accent: "A9D0C9",
    fontTitle: "Georgia", fontBody: "Inter",
    layouts: premiumLayouts("14252D", "F1F4F2", "A9D0C9", "628D91", "stillwater"),
  },
];

const BLANK_TEMPLATE: Template = {
  id: BLANK_TEMPLATE_ID,
  name: "Blank",
  bg: BLANK_BACKGROUND_DEFAULT,
  fg: "29251F",
  accent: "29251F",
  fontTitle: "Inter",
  fontBody: "Inter",
  layouts: premiumLayouts(BLANK_BACKGROUND_DEFAULT, "29251F", "29251F", "F7F5F0", "atelier"),
};

export const TEMPLATES: Template[] = [...PREMIUM_TEMPLATES, ...importedTemplates, BLANK_TEMPLATE];
export const DEFAULT_TEMPLATE = "lumen";

export function getTemplate(id: string): Template {
  const found = TEMPLATES.find((t) => t.id === id) ?? TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE);
  if (!found) throw new Error("No templates are available. Add a presentation and run npm run templates.");
  return found;
}

function readableColor(hex: string): string {
  const rgb = hex.match(/^[\da-f]{6}$/i) ? hex : BLANK_BACKGROUND_DEFAULT;
  const channels = [0, 2, 4].map((start) => parseInt(rgb.slice(start, start + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 > 0.42 ? "29251F" : "F7F5F0";
}

export function presentationTemplate(templateId: string, backgroundColor?: string): Template {
  const template = getTemplate(templateId);
  if (template.id !== BLANK_TEMPLATE_ID) return template;
  const color = backgroundColor && /^[\da-f]{6}$/i.test(backgroundColor) ? backgroundColor.toUpperCase() : BLANK_BACKGROUND_DEFAULT;
  const foreground = readableColor(color);
  const layouts = Object.fromEntries(
    Object.entries(template.layouts ?? {}).map(([name, layout]) => [
      name,
      layout && {
        ...layout,
        bg: solid(color),
        title: { ...layout.title, color: foreground },
        body: { ...layout.body, color: foreground },
      },
    ]),
  ) as Template["layouts"];
  return { ...template, bg: color, fg: foreground, accent: foreground, layouts };
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
