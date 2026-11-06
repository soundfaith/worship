import { fitSize, readingFontSize } from "./layout";
import { renderArt, renderBackground } from "./art";
import { backgroundFor, DEFAULT_FONT, getTemplate, layoutFor, songIndexes } from "./templates";
import type { Assembly, Rect, Slide, SlideKind } from "./types";

const SW = 10;
const SH = 5.625;
const inch = (r: Rect) => ({ x: r.x * SW, y: r.y * SH, w: r.w * SW, h: r.h * SH });

export async function exportPptx(a: Assembly) {
  return exportSlides({ title: a.title, date: a.date, slides: a.slides ?? [], templateId: a.templateId, sectionTemplates: a.sectionTemplates, font: a.font });
}

export async function exportSlides({ title, date, slides, templateId, sectionTemplates = {}, font }: {
  title: string;
  date?: string;
  slides: Slide[];
  templateId: string;
  sectionTemplates?: Partial<Record<SlideKind, string>>;
  font?: string;
}) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";
  pres.title = title || "Assembly";

  const songPositions = songIndexes(slides);
  for (const [index, sl] of slides.entries()) {
    const t = getTemplate(sectionTemplates[sl.kind] ?? templateId);
    const found = layoutFor(t, sl);
    const slide = pres.addSlide();

    if (found) {
      const { layout } = found;
      const background = backgroundFor(t, sl, songPositions[index]);
      const slideFont = sl.font ?? font ?? DEFAULT_FONT;
      slide.background = { color: t.bg };
      slide.addImage({ data: (await (background ? renderBackground(t, background) : renderArt(t, found.name, layout))).slice(5), x: 0, y: 0, w: SW, h: SH });
      if (sl.image && layout.image) slide.addImage({ data: sl.image.slice(5), ...inch(layout.image), sizing: { type: "cover", ...inch(layout.image) } });
      if (sl.image2 && layout.image2) slide.addImage({ data: sl.image2.slice(5), ...inch(layout.image2), sizing: { type: "cover", ...inch(layout.image2) } });
      for (const [box, text, boxFont, fit, reading] of [
        [layout.title, sl.title, slideFont, !!layout.fitTitle, false],
        ...(!layout.hideBody ? [[layout.body, sl.body, slideFont, true, sl.kind === "gospel"] as const] : []),
      ] as const) {
        const content = reading ? text.trim() : text;
        slide.addText(box.caps ? content.toUpperCase() : content, {
          ...inch(box),
          fontFace: boxFont,
          fontSize: fit ? (reading ? readingFontSize(box, text) : fitSize(box, text)) : box.size,
          color: box.color,
          align: box.align,
          valign: "middle",
          charSpacing: box.spacing,
          lineSpacingMultiple: reading ? 1.3 : 1.1,
          margin: 0,
        });
      }
      continue;
    }

    slide.background = { color: t.bg };
    const isSong = sl.kind === "song";
    const lines = sl.body.split("\n").length;
    const longest = Math.max(0, ...sl.body.split("\n").map((l) => l.length));
    const size = Math.max(20, Math.min(44, Math.floor(300 / Math.max(lines * 1.25, longest / 4, 5)) + 14));

    slide.addText(sl.title, {
      x: 0.6, y: 0.3, w: 8.8, h: 0.7,
      fontFace: t.fontTitle, fontSize: isSong ? 16 : 34, color: t.accent,
      align: "center", bold: !isSong, charSpacing: isSong ? 4 : 0,
    });
    slide.addShape(pres.ShapeType.line, { x: 4.4, y: 1.05, w: 1.2, h: 0, line: { color: t.accent, width: 1 } });
    slide.addText(sl.body, {
      x: 0.6, y: 1.25, w: 8.8, h: 4,
      fontFace: t.fontBody, fontSize: size, color: t.fg,
      align: "center", valign: "middle", fit: "shrink", lineSpacingMultiple: 1.1,
    });
  }
  const safe = (title || "assembly").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "presentation";
  await pres.writeFile({ fileName: `${safe}${date ? "-" + date : ""}.pptx` });
}
