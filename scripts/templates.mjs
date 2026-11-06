// Template packs: imports templates/*.pptx into public/templates/<id>/ and indexes every pack.
// Usage: node scripts/templates.mjs [--force]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "templates");
const OUT = path.join(root, "public", "templates");
const INDEX = path.join(root, "src", "lib", "templates.generated.json");
const force = process.argv.includes("--force");

const LAYOUTS = ["cover", "song", "content", "image"];
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const attr = (s, name) => s.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const round = (n) => Math.round(n * 10000) / 10000;

function themeColors(xml) {
  const map = {};
  for (const n of ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6"]) {
    const block = xml.match(new RegExp(`<a:${n}>([\\s\\S]*?)</a:${n}>`))?.[1] ?? "";
    map[n] = block.includes("srgbClr") ? attr(block, "val") : attr(block, "lastClr");
  }
  return { ...map, tx1: map.dk1, bg1: map.lt1, tx2: map.dk2, bg2: map.lt2 };
}

async function importPptx(file) {
  const warnings = [];
  const warn = (m) => warnings.push(m);
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const text = async (p) => (zip.file(p) ? zip.file(p).async("string") : "");
  const theme = themeColors(await text("ppt/theme/theme1.xml"));

  const pres = await text("ppt/presentation.xml");
  const sz = pres.match(/<p:sldSz[^>]*>/)?.[0] ?? "";
  const SW = Number(attr(sz, "cx")) || 9144000;
  const SH = Number(attr(sz, "cy")) || 5143500;
  const widthPt = SW / 12700;

  const presRels = await text("ppt/_rels/presentation.xml.rels");
  const relTarget = (rels, id) => {
    for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) if (attr(m[0], "Id") === id) return attr(m[0], "Target");
  };
  const slidePaths = [...pres.matchAll(/<p:sldId\b[^>]*>/g)]
    .map((m) => {
      const t = relTarget(presRels, attr(m[0], "r:id"));
      return t && "ppt/" + t.replace(/^\/?(ppt\/)?/, "");
    })
    .filter(Boolean);

  const id = slug(path.basename(file, ".pptx"));
  const outDir = path.join(OUT, id);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  let mediaCount = 0;

  const color = (frag) => {
    const m = frag.match(/<a:(srgbClr|schemeClr)\b([^>]*?)(\/>|>([\s\S]*?)<\/a:\1>)/);
    if (!m) return null;
    const val = attr(m[2], "val");
    const hex = m[1] === "srgbClr" ? val : theme[val];
    if (!hex) return null;
    const a = m[4]?.match(/<a:alpha val="(\d+)"/)?.[1];
    if (m[4]?.match(/<a:(lumMod|lumOff|tint|shade)/)) warn(`Colour "${val}" uses a tint/shade modifier, which is ignored; use a plain RGB colour.`);
    return { color: hex.toUpperCase(), alpha: a ? Number(a) / 100000 : undefined };
  };

  const fill = (frag) => {
    const grad = frag.match(/<a:gradFill\b[\s\S]*?<\/a:gradFill>/)?.[0];
    if (grad) {
      const stops = [...grad.matchAll(/<a:gs pos="(\d+)">([\s\S]*?)<\/a:gs>/g)]
        .map((m) => ({ pos: round(Number(m[1]) / 100000), ...color(m[2]) }))
        .filter((s) => s.color);
      if (grad.includes("<a:path")) warn("Radial gradient approximated as linear.");
      const ang = grad.match(/<a:lin\b[^>]*\bang="(\d+)"/)?.[1];
      return stops.length ? { type: "gradient", angle: ang ? Number(ang) / 60000 : 90, stops } : null;
    }
    const solid = frag.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/)?.[1];
    const c = solid && color(solid);
    return c ? { type: "solid", ...c } : null;
  };

  const rect = (frag) => {
    const xf = frag.match(/<a:xfrm\b([^>]*)>([\s\S]*?)<\/a:xfrm>/);
    if (!xf) return null;
    const off = xf[2].match(/<a:off\b[^>]*>/)?.[0];
    const ext = xf[2].match(/<a:ext\b[^>]*>/)?.[0];
    if (!off || !ext) return null;
    const r = {
      x: round(Number(attr(off, "x")) / SW),
      y: round(Number(attr(off, "y")) / SH),
      w: round(Number(attr(ext, "cx")) / SW),
      h: round(Number(attr(ext, "cy")) / SH),
    };
    const rot = attr(xf[1], "rot");
    return rot ? { ...r, rot: Number(rot) / 60000 } : r;
  };

  const saveMedia = async (rels, rid, slideNo) => {
    const t = relTarget(rels, rid);
    if (!t) return null;
    const p = "ppt/" + t.replace(/^(\.\.\/|\/)+(ppt\/)?/, "");
    const ext = path.extname(p).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) || !zip.file(p)) {
      warn(`Slide ${slideNo}: picture ${path.basename(p)} is not a web image (use PNG or JPG).`);
      return null;
    }
    const name = `media-${++mediaCount}${ext}`;
    fs.writeFileSync(path.join(outDir, name), await zip.file(p).async("nodebuffer"));
    return name;
  };

  const textStyle = (sp) => {
    const rpr = sp.match(/<a:rPr\b[^>]*\/>|<a:rPr\b[^>]*>[\s\S]*?<\/a:rPr>/)?.[0] ?? "";
    const size = Number(attr(rpr, "sz")) / 100;
    if (!size) warn("A text placeholder has no explicit font size; defaulted to 24pt.");
    return {
      size: round(((size || 24) * 720) / widthPt),
      align: /algn="(ctr|just)"/.test(sp) ? "center" : "left",
      color: color(rpr)?.color ?? "FFFFFF",
      ...(attr(rpr, "cap") === "all" ? { caps: true } : {}),
      ...(attr(rpr, "spc") ? { spacing: round(Number(attr(rpr, "spc")) / 100) } : {}),
      font: rpr.match(/<a:latin\b[^>]*typeface="([^"]*)"/)?.[1],
    };
  };

  const layouts = {};
  const fonts = {};
  for (const [i, sp] of slidePaths.entries()) {
    const xml = await text(sp);
    const rels = await text(sp.replace("slides/", "slides/_rels/") + ".rels");
    const marker = xml.match(/<a:t>\s*layout:\s*([a-z]+)\s*<\/a:t>/i)?.[1]?.toLowerCase();
    const name = marker ?? LAYOUTS[i];
    if (!LAYOUTS.includes(name)) {
      warn(`Slide ${i + 1} ignored (only the first 4 slides, or slides marked "layout:<name>", are used).`);
      continue;
    }
    if (xml.includes("<p:grpSp>")) warn(`Slide ${i + 1}: grouped shapes are not supported; ungroup them.`);

    const layout = { shapes: [] };
    const bgBlock = xml.match(/<p:bg>([\s\S]*?)<\/p:bg>/)?.[1];
    if (bgBlock) {
      const blip = bgBlock.match(/<a:blip\b[^>]*r:embed="([^"]+)"/)?.[1];
      if (blip) {
        const src = await saveMedia(rels, blip, i + 1);
        if (src) layout.shapes.push({ type: "image", x: 0, y: 0, w: 1, h: 1, src });
      } else {
        const f = fill(bgBlock);
        if (f) layout.bg = f;
      }
    } else warn(`Slide ${i + 1}: no slide background set (Format Background on this slide); a blank colour is used.`);

    for (const m of xml.matchAll(/<p:(sp|pic)>([\s\S]*?)<\/p:\1>/g)) {
      const [, kind, body] = m;
      const r = rect(body);
      if (!r) continue;
      if (kind === "pic") {
        const rid = body.match(/<a:blip\b[^>]*r:embed="([^"]+)"/)?.[1];
        const src = rid && (await saveMedia(rels, rid, i + 1));
        if (src) layout.shapes.push({ type: "image", ...r, src });
        continue;
      }
      const label = [...body.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((t) => t[1]).join("").trim().toLowerCase();
      if (label === `layout:${name}`) continue;
      const ph = label.match(/^\{\{(title|body|image)\}\}$/)?.[1];
      if (ph === "image") {
        layout.image = r;
        continue;
      }
      if (ph) {
        const { font, ...style } = textStyle(body);
        layout[ph] = { x: r.x, y: r.y, w: r.w, h: r.h, ...style };
        if (font && !fonts[ph]) fonts[ph] = font;
        continue;
      }
      if (label) warn(`Slide ${i + 1}: text "${label.slice(0, 20)}" is not a placeholder and is not imported (use {{title}} / {{body}}).`);
      const spPr = body.match(/<p:spPr>([\s\S]*?)<\/p:spPr>/)?.[1] ?? "";
      const prst = attr(spPr.match(/<a:prstGeom\b[^>]*>/)?.[0] ?? "", "prst") ?? "rect";
      const type = prst === "ellipse" ? "ellipse" : prst === "roundRect" ? "roundRect" : "rect";
      if (!["rect", "ellipse", "roundRect"].includes(prst)) warn(`Slide ${i + 1}: shape "${prst}" drawn as a rectangle.`);
      const f = fill(spPr.replace(/<a:ln\b[\s\S]*?<\/a:ln>/g, ""));
      if (f) layout.shapes.push({ type, ...r, fill: f });
      else if (!/<a:noFill/.test(spPr)) warn(`Slide ${i + 1}: a shape has a theme/style fill that is not imported; give it an explicit fill.`);
    }
    if (!layout.title || !layout.body) {
      warn(`Slide ${i + 1} (${name}): needs text boxes containing exactly {{title}} and {{body}}; layout skipped.`);
      continue;
    }
    layouts[name] = layout;
  }
  for (const n of LAYOUTS) if (!layouts[n] && n !== "image") warn(`No "${n}" layout found.`);
  if (!layouts.content) throw new Error("A template needs at least a content layout (3rd slide, or one marked layout:content).");

  const first = layouts.cover ?? layouts.content;
  const base = first.bg ?? { type: "solid", color: "FFFFFF" };
  const song = layouts.song ?? layouts.content;
  const pack = {
    id,
    name: path.basename(file, ".pptx").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    bg: (base.type === "solid" ? base.color : base.stops[0].color).toUpperCase(),
    fg: song.body.color,
    accent: song.title.color,
    fontTitle: fonts.title ?? "Georgia",
    fontBody: fonts.body ?? "Georgia",
    layouts,
  };
  fs.writeFileSync(path.join(outDir, "template.json"), JSON.stringify(pack, null, 2) + "\n");
  return { id, warnings };
}

if (fs.existsSync(SRC)) {
  for (const f of fs.readdirSync(SRC).filter((f) => /\.pptx$/i.test(f) && !f.startsWith("~$"))) {
    const out = path.join(OUT, slug(path.basename(f, ".pptx")), "template.json");
    if (!force && fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(path.join(SRC, f)).mtimeMs) continue;
    try {
      const { id, warnings } = await importPptx(path.join(SRC, f));
      console.log(`Imported ${f} -> public/templates/${id}`);
      for (const w of warnings) console.log(`  ! ${w}`);
    } catch (e) {
      console.log(`Failed to import ${f}: ${e.message}`);
    }
  }
}

const packs = fs.existsSync(OUT)
  ? fs
      .readdirSync(OUT, { withFileTypes: true })
      .filter((d) => d.isDirectory() && fs.existsSync(path.join(OUT, d.name, "template.json")))
      .map((d) => ({ ...JSON.parse(fs.readFileSync(path.join(OUT, d.name, "template.json"), "utf8")), dir: `/templates/${d.name}` }))
      .sort((a, b) => a.name.localeCompare(b.name))
  : [];
fs.writeFileSync(INDEX, JSON.stringify(packs, null, 2) + "\n");
console.log(`Templates indexed: ${packs.map((p) => p.name).join(", ") || "none"}`);
