import { fitSize, readingFontSize } from "./layout";
import { renderArt, renderBackground, renderPhotoBackground } from "./art";
import { backgroundFor, BLANK_TEMPLATE_ID, DEFAULT_FONT, layoutFor, presentationTemplate, songIndexes } from "./templates";
import type { Assembly, Rect, Slide, SlideKind } from "./types";

const SW = 10;
const SH = 5.625;
const inch = (r: Rect) => ({ x: r.x * SW, y: r.y * SH, w: r.w * SW, h: r.h * SH });

export async function exportPptx(a: Assembly) {
  return exportSlides({ title: a.title, date: a.date, slides: a.slides ?? [], templateId: a.templateId, sectionTemplates: a.sectionTemplates, font: a.font, backgroundColor: a.backgroundColor, logo: a.showLogo === false ? undefined : a.logo });
}

export async function exportSlides({ title, date, slides, templateId, sectionTemplates = {}, font, backgroundColor, logo }: {
  title: string;
  date?: string;
  slides: Slide[];
  templateId: string;
  sectionTemplates?: Partial<Record<SlideKind, string>>;
  font?: string;
  backgroundColor?: string;
  logo?: Assembly["logo"];
}) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";
  pres.title = title || "Assembly";

  const songPositions = songIndexes(slides);
  for (const [index, sl] of slides.entries()) {
    const t = presentationTemplate(sectionTemplates[sl.kind] ?? templateId, backgroundColor);
    const found = layoutFor(t, sl);
    const slide = pres.addSlide();

    if (found) {
      const { layout } = found;
      const background = backgroundFor(t, sl, songPositions[index]);
      slide.background = { color: t.bg };
      if (t.id !== BLANK_TEMPLATE_ID || sl.backgroundImage) {
        const artwork = sl.backgroundImage
          ? await renderPhotoBackground(t, found.name, layout, sl.backgroundImage.data, sl.backgroundImage.sourceUrl)
          : background
            ? await renderBackground(t, background)
            : await renderArt(t, found.name, layout);
        slide.addImage({ data: artwork.slice(5), x: 0, y: 0, w: SW, h: SH });
      }
      if (sl.image && layout.image) slide.addImage({ data: sl.image.slice(5), ...inch(layout.image), sizing: { type: "cover", ...inch(layout.image) } });
      if (sl.image2 && layout.image2) slide.addImage({ data: sl.image2.slice(5), ...inch(layout.image2), sizing: { type: "cover", ...inch(layout.image2) } });
      for (const [box, text, boxFont, fit, reading] of [
        [layout.title, sl.title, sl.font || font || t.fontTitle, !!layout.fitTitle, false],
        ...(!layout.hideBody ? [[layout.body, sl.body, sl.font || font || t.fontBody, true, sl.kind === "gospel"] as const] : []),
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
      if (logo) slide.addImage({ data: logo.data.slice(5), ...inch({ x: logo.x, y: logo.y, w: logo.width, h: logo.height }) });
      continue;
    }

    slide.background = { color: t.bg };
    const isSong = sl.kind === "song";
    const lines = sl.body.split("\n").length;
    const longest = Math.max(0, ...sl.body.split("\n").map((l) => l.length));
    const size = Math.max(20, Math.min(44, Math.floor(300 / Math.max(lines * 1.25, longest / 4, 5)) + 14));

    slide.addText(sl.title, {
      x: 0.6, y: 0.3, w: 8.8, h: 0.7,
      fontFace: sl.font || font || t.fontTitle, fontSize: isSong ? 16 : 34, color: t.accent,
      align: "center", bold: !isSong, charSpacing: isSong ? 4 : 0,
    });
    slide.addShape(pres.ShapeType.line, { x: 4.4, y: 1.05, w: 1.2, h: 0, line: { color: t.accent, width: 1 } });
    slide.addText(sl.body, {
      x: 0.6, y: 1.25, w: 8.8, h: 4,
      fontFace: sl.font || font || t.fontBody, fontSize: size, color: t.fg,
      align: "center", valign: "middle", fit: "shrink", lineSpacingMultiple: 1.1,
    });
    if (logo) slide.addImage({ data: logo.data.slice(5), ...inch({ x: logo.x, y: logo.y, w: logo.width, h: logo.height }) });
  }
  const photoCredits = [...new Map(
    slides.flatMap((item) => item.backgroundImage?.sourceUrl
      ? [[item.backgroundImage.sourceUrl, item.backgroundImage] as const]
      : []),
  ).values()];
  if (photoCredits.length) {
    const creditTemplate = presentationTemplate(templateId, backgroundColor);
    const creditSlide = pres.addSlide();
    creditSlide.background = { color: creditTemplate.bg };
    creditSlide.addText("Photo credits", {
      x: 0.5, y: 0.35, w: 9, h: 0.55,
      fontFace: creditTemplate.fontTitle, fontSize: 28, bold: true,
      color: creditTemplate.fg, margin: 0,
    });
    const rows = Math.ceil(photoCredits.length / 2);
    const rowHeight = Math.min(0.42, 4.25 / rows);
    photoCredits.forEach((credit, index) => {
      const column = Math.floor(index / rows);
      const row = index % rows;
      const provider = credit.providerLabel ?? "Wikimedia Commons";
      const attribution = provider.includes("Unsplash")
        ? `Photo by ${credit.artist} on Unsplash · "${credit.title}"`
        : `"${credit.title}" by ${credit.artist} · ${provider} · ${credit.license}`;
      creditSlide.addText(attribution, {
        x: column ? 5.2 : 0.5,
        y: 1.15 + row * rowHeight,
        w: 4.3,
        h: rowHeight - 0.03,
        fontFace: font || DEFAULT_FONT,
        fontSize: Math.min(13, Math.max(8, rowHeight * 28)),
        color: creditTemplate.fg,
        margin: 0.02,
        breakLine: false,
        fit: "shrink",
        hyperlink: { url: credit.sourceUrl },
      });
    });
    if (logo) creditSlide.addImage({ data: logo.data.slice(5), ...inch({ x: logo.x, y: logo.y, w: logo.width, h: logo.height }) });
  }
  const safe = (title || "assembly").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "presentation";
  await pres.writeFile({ fileName: `${safe}${date ? "-" + date : ""}.pptx` });
}
