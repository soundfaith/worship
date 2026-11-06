// Writes templates/starter/starter-template.pptx: a ready-to-edit example of the template format.
// Usage: node scripts/make-starter.mjs
import fs from "node:fs";
import PptxGenJS from "pptxgenjs";

const pres = new PptxGenJS();
pres.layout = "LAYOUT_16x9";
const NAVY = "0B1A38";
const GOLD = "E3B968";
const IVORY = "F7F1E3";

const text = (s, t, opts) => s.addText(t, { fontFace: "Georgia", margin: 0, valign: "middle", ...opts });

const cover = pres.addSlide();
cover.background = { color: NAVY };
cover.addShape(pres.ShapeType.ellipse, { x: 3, y: 4.6, w: 4, h: 2, fill: { color: GOLD, transparency: 80 }, line: { type: "none" } });
text(cover, "{{title}}", { x: 1, y: 1.2, w: 8, h: 1.5, fontSize: 48, color: "F6E3B0", align: "center" });
text(cover, "{{body}}", { x: 1.5, y: 2.8, w: 7, h: 0.8, fontSize: 22, color: IVORY, align: "center" });

const song = pres.addSlide();
song.background = { color: NAVY };
text(song, "{{title}}", { x: 1, y: 0.2, w: 8, h: 0.45, fontSize: 14, color: GOLD, align: "center", charSpacing: 4 });
text(song, "{{body}}", { x: 0.8, y: 0.9, w: 8.4, h: 4.2, fontSize: 36, color: IVORY, align: "center" });

const content = pres.addSlide();
content.background = { color: NAVY };
text(content, "{{title}}", { x: 1, y: 0.4, w: 8, h: 0.75, fontSize: 36, color: "F6E3B0", align: "center" });
text(content, "{{body}}", { x: 1, y: 1.5, w: 8, h: 3.6, fontSize: 26, color: IVORY, align: "center" });

const image = pres.addSlide();
image.background = { color: NAVY };
image.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 4.6, h: 5.625, fill: { color: "1B2F5C" }, line: { type: "none" } });
text(image, "{{image}}", { x: 0, y: 0, w: 4.6, h: 5.625, fontSize: 12, color: GOLD, align: "center" });
text(image, "{{title}}", { x: 5.2, y: 0.8, w: 4, h: 1, fontSize: 30, color: "F6E3B0", align: "left" });
text(image, "{{body}}", { x: 5.2, y: 2.2, w: 4, h: 2.7, fontSize: 22, color: IVORY, align: "left" });

fs.mkdirSync("templates/starter", { recursive: true });
await pres.writeFile({ fileName: "templates/starter/starter-template.pptx" });
