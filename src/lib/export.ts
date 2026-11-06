import { fitSize } from "./layout";
import { renderArt } from "./art";
import { getTemplate, layoutFor } from "./templates";
import type { Assembly, Rect } from "./types";

const SW = 10;
const SH = 5.625;
const inch = (r: Rect) => ({ x: r.x * SW, y: r.y * SH, w: r.w * SW, h: r.h * SH });

export async function exportPptx(a: Assembly) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";
  pres.title = a.title || "Assembly";

  for (const sl of a.slides ?? []) {
    const t = getTemplate(a.sectionTemplates[sl.kind] ?? a.templateId);
    const found = layoutFor(t, sl);
    const slide = pres.addSlide();

    if (found) {
      const { layout } = found;
      slide.background = { color: t.bg };
      slide.addImage({ data: (await renderArt(t, found.name, layout)).slice(5), x: 0, y: 0, w: SW, h: SH });
      if (sl.image && layout.image) slide.addImage({ data: sl.image.slice(5), ...inch(layout.image), sizing: { type: "cover", ...inch(layout.image) } });
      for (const [box, text, font, fit] of [
        [layout.title, sl.title, t.fontTitle, false],
        [layout.body, sl.body, t.fontBody, true],
      ] as const) {
        slide.addText(box.caps ? text.toUpperCase() : text, {
          ...inch(box),
          fontFace: font,
          fontSize: fit ? fitSize(box, text) : box.size,
          color: box.color,
          align: box.align,
          valign: "middle",
          charSpacing: box.spacing,
          lineSpacingMultiple: 1.1,
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
  const safe = (a.title || "assembly").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  await pres.writeFile({ fileName: `${safe}${a.date ? "-" + a.date : ""}.pptx` });
}
