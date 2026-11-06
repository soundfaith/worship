// Render templates/*.pptx into independent background images and index the imported packs.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "templates");
const OUT = path.join(root, "public", "templates");
const INDEX = path.join(root, "src", "lib", "templates.generated.json");
const RENDERER = path.join(root, "scripts", "render-powerpoint.ps1");
const force = process.argv.includes("--force");
const LAYOUTS = ["cover", "song", "content", "image"];
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const baseName = (file) => path.basename(file).replace(/\.pptx$/i, "");

function isPng(file) {
  let fd;
  try {
    fd = fs.openSync(file, "r");
    const header = Buffer.alloc(8);
    return fs.fstatSync(fd).size > 8 && fs.readSync(fd, header, 0, 8, 0) === 8 &&
      header.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function validateConfig(config, slideCount) {
  if (!config || typeof config !== "object" || !config.layouts || typeof config.layouts !== "object" || !config.layouts.content) {
    throw new Error("The .template.json file must contain layouts.content with a slide number.");
  }
  for (const [name, layout] of Object.entries(config.layouts)) {
    if (!LAYOUTS.includes(name) || !layout || !Number.isInteger(layout.slide) || layout.slide < 1 || layout.slide > slideCount) {
      throw new Error(`Invalid layout "${name}": specify an existing slide number from 1 to ${slideCount}.`);
    }
    for (const field of ["titleShape", "bodyShape"]) {
      if (layout[field] !== undefined && (typeof layout[field] !== "string" || !layout[field])) throw new Error(`${name}.${field} must be a non-empty shape name.`);
    }
    for (const field of ["title", "body", "image"]) {
      const box = layout[field];
      if (box === undefined) continue;
      if (!box || typeof box !== "object" || Array.isArray(box)) throw new Error(`${name}.${field} must be an object.`);
      const allowed = field === "image" ? ["x", "y", "w", "h"] : ["x", "y", "w", "h", "size", "color", "align"];
      for (const [key, value] of Object.entries(box)) {
        if (!allowed.includes(key)) throw new Error(`Unknown property ${name}.${field}.${key}.`);
        if (key === "color") {
          if (typeof value !== "string" || !/^[0-9a-f]{6}$/i.test(value)) throw new Error(`${name}.${field}.color must be a six-digit RGB color.`);
        } else if (key === "align") {
          if (!["left", "center"].includes(value)) throw new Error(`${name}.${field}.align must be left or center.`);
        } else if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || (key !== "size" && value > 1) || (["w", "h", "size"].includes(key) && value === 0)) {
          throw new Error(`Invalid number in ${name}.${field}.${key}.`);
        }
      }
      if (field === "image" && !["x", "y", "w", "h"].every((key) => key in box)) throw new Error(`${name}.image requires x, y, w and h.`);
    }
  }
}

async function getConfig(file, configPath) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const presentation = zip.file("ppt/presentation.xml");
  if (!presentation) throw new Error("The presentation is missing ppt/presentation.xml.");
  const slideCount = [...(await presentation.async("string")).matchAll(/<p:sldId\b/g)].length;
  if (!slideCount) throw new Error("The presentation has no slides.");
  const config = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, "utf8"))
    : { layouts: { cover: { slide: 1 }, song: { slide: Math.min(2, slideCount) }, content: { slide: Math.min(3, slideCount) } } };
  validateConfig(config, slideCount);
  config.layouts.cover ??= { slide: 1 };
  config.layouts.song ??= { slide: Math.min(2, slideCount) };
  return { config, slideCount };
}

function cacheValid(dest, hash, slideCount, config) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(dest, "source.json"), "utf8"));
    const pack = JSON.parse(fs.readFileSync(path.join(dest, "template.json"), "utf8"));
    if (manifest.sourceHash !== hash || !Array.isArray(pack.backgrounds) || pack.backgrounds.length !== slideCount) return false;
    for (let i = 0; i < slideCount; i++) {
      const background = pack.backgrounds[i];
      if (background.id !== `slide-${i + 1}` || background.src !== `slide-${i + 1}.png` || !isPng(path.join(dest, background.src))) return false;
    }
    return LAYOUTS.every((name) => pack.defaultBackgrounds?.[name] === `slide-${(config.layouts[name] ?? config.layouts.content).slide}`) &&
      Object.values(pack.layouts ?? {}).every((layout) => (layout.shapes ?? []).every((shape) => shape.type !== "image" || (typeof shape.src === "string" && fs.existsSync(path.join(dest, shape.src)))));
  } catch {
    return false;
  }
}

function importRendered(file, config, slideCount, outDir, sourceHash) {
  if (process.platform !== "win32") {
    throw new Error("This presentation needs to be prepared on Windows with Microsoft PowerPoint. Run npm run templates there and commit the generated public/templates folder before deploying.");
  }
  const configPath = path.join(outDir, "input.json");
  fs.writeFileSync(configPath, JSON.stringify(config));
  const result = spawnSync("powershell.exe", [
    "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", RENDERER, "-Source", file, "-OutputDir", outDir, "-ConfigPath", configPath,
  ], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(`PowerPoint rendering failed: ${result.error?.message ?? (result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`)}`);
  }
  const rendered = JSON.parse(fs.readFileSync(path.join(outDir, "rendered.json"), "utf8").replace(/^\uFEFF/, ""));
  const backgrounds = Array.from({ length: slideCount }, (_, i) => ({
    id: `slide-${i + 1}`, name: `Slide ${i + 1}`, src: `slide-${i + 1}.png`,
  }));
  for (const background of backgrounds) {
    if (!isPng(path.join(outDir, background.src))) throw new Error(`PowerPoint did not produce a valid ${background.src}.`);
  }
  const layouts = {};
  let titleFont;
  let bodyFont;
  for (const name of LAYOUTS) {
    const item = rendered.layouts[name];
    if (!item) continue;
    const { font: title, ...titleBox } = item.title;
    const { font: body, ...bodyBox } = item.body;
    titleFont ??= title;
    bodyFont ??= body;
    layouts[name] = {
      bg: { type: "solid", color: "FFFFFF" },
      shapes: [{ type: "image", x: 0, y: 0, w: 1, h: 1, src: `slide-${config.layouts[name].slide}.png` }],
      title: titleBox, body: bodyBox, fitTitle: true,
      ...(item.image ? { image: item.image } : {}),
    };
  }
  const defaultBackgrounds = Object.fromEntries(LAYOUTS.map((name) => [name, `slide-${(config.layouts[name] ?? config.layouts.content).slide}`]));
  const pack = {
    id: slug(baseName(file)),
    name: baseName(file).replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    bg: "FFFFFF",
    fg: layouts.content.body.color,
    accent: layouts.content.title.color,
    fontTitle: titleFont || "Inter",
    fontBody: bodyFont || "Inter",
    backgrounds, defaultBackgrounds, layouts,
  };
  fs.writeFileSync(path.join(outDir, "template.json"), JSON.stringify(pack, null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, "source.json"), JSON.stringify({ sourceHash }, null, 2) + "\n");
  fs.unlinkSync(configPath);
  fs.unlinkSync(path.join(outDir, "rendered.json"));
  return rendered.warnings ?? [];
}

const indexed = [];
const files = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter((f) => /\.pptx$/i.test(f) && !f.startsWith("~$")) : [];
const ids = files.map((f) => slug(baseName(f)));
for (const [index, f] of files.entries()) {
  const file = path.join(SRC, f);
  const id = ids[index];
  const dest = path.join(OUT, id);
  const configPath = path.join(SRC, `${baseName(f)}.template.json`);
  let staging;
  try {
    if (!id) throw new Error("The file name needs at least one letter or number.");
    if (ids.indexOf(id) !== ids.lastIndexOf(id)) throw new Error(`Multiple presentation names resolve to the same pack id "${id}".`);
    const { config, slideCount } = await getConfig(file, configPath);
    const scriptContent = (script) => fs.readFileSync(script, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
    const hash = createHash("sha256").update(fs.readFileSync(file)).update(JSON.stringify(config))
      .update(scriptContent(fileURLToPath(import.meta.url))).update(scriptContent(RENDERER)).digest("hex");
    if (!force && cacheValid(dest, hash, slideCount, config)) {
      indexed.push({ ...JSON.parse(fs.readFileSync(path.join(dest, "template.json"), "utf8")), dir: `/templates/${id}` });
      continue;
    }
    fs.mkdirSync(OUT, { recursive: true });
    staging = fs.mkdtempSync(path.join(OUT, ".worship-template-"));
    const warnings = importRendered(file, config, slideCount, staging, hash);
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(staging).filter((entry) => entry !== "source.json")) {
      fs.copyFileSync(path.join(staging, entry), path.join(dest, entry));
    }
    fs.copyFileSync(path.join(staging, "source.json"), path.join(dest, "source.json"));
    indexed.push({ ...JSON.parse(fs.readFileSync(path.join(dest, "template.json"), "utf8")), dir: `/templates/${id}` });
    console.log(`Rendered ${f} -> public/templates/${id}`);
    for (const warning of warnings) console.warn(`  ! ${warning}`);
  } catch (e) {
    console.error(`Failed to import ${f}: ${e.message}`);
    process.exitCode = 1;
  } finally {
    if (staging) fs.rmSync(staging, { recursive: true, force: true });
  }
}
indexed.sort((a, b) => a.name.localeCompare(b.name));
fs.mkdirSync(path.dirname(INDEX), { recursive: true });
fs.writeFileSync(INDEX, JSON.stringify(indexed, null, 2) + "\n");
console.log(`Templates indexed: ${indexed.map((p) => p.name).join(", ") || "none"}`);
