import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import PptxGenJS from "pptxgenjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const windows = process.platform === "win32";
const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

test("renders all slides without changing sources, preserves packs, and validates the deployment cache", { skip: !windows }, async () => {
  const project = fs.mkdtempSync(path.join(root, ".template-test-"));
  try {
    for (const dir of ["scripts", "templates", "public/templates/fixture", "public/templates/glory", "src/lib"]) fs.mkdirSync(path.join(project, dir), { recursive: true });
    for (const file of ["templates.mjs", "render-powerpoint.ps1"]) fs.copyFileSync(path.join(root, "scripts", file), path.join(project, "scripts", file));
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    for (let i = 0; i < 4; i++) {
      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };
      if (i === 0) slide.addText("private slide text", { x: 1, y: 1, w: 5, h: 1, fontSize: 32, color: "2A1B10" });
    }
    const source = path.join(project, "templates", "Fixture.pptx");
    await pptx.writeFile({ fileName: source });
    const groupScript = `
$existing = @(Get-Process POWERPNT -ErrorAction SilentlyContinue).Count -gt 0
$app = New-Object -ComObject PowerPoint.Application
$deck = $null
try {
  $deck = $app.Presentations.Open($env:FIXTURE, 0, 0, 0)
  $shapes = $deck.Slides.Item(4).Shapes
  $a = $shapes.AddTextbox(1, 50, 50, 200, 50)
  $a.TextFrame.TextRange.Text = 'private grouped text'
  $b = $shapes.AddTextbox(1, 50, 150, 200, 50)
  $b.TextFrame.TextRange.Text = 'private grouped text 2'
  [void]$shapes.Range(@($a.Name, $b.Name)).Group()
  $deck.Save()
} finally {
  if ($deck) { $deck.Close() }
  if ($app -and -not $existing) { $app.Quit() }
}
`;
    const group = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", groupScript], { encoding: "utf8", env: { ...process.env, FIXTURE: source } });
    assert.equal(group.status, 0, group.stderr);
    const before = hash(source);
    const configPath = path.join(project, "templates", "Fixture.template.json");
    fs.writeFileSync(configPath, JSON.stringify({ layouts: { cover: { slide: 1 }, song: { slide: 2 }, content: { slide: 1 }, image: { slide: 4 } } }));
    fs.writeFileSync(path.join(project, "public", "templates", "fixture", "keep.txt"), "keep");
    fs.writeFileSync(path.join(project, "public", "templates", "glory", "template.json"), JSON.stringify({ id: "glory", name: "Glory" }));
    const script = path.join(project, "scripts", "templates.mjs");
    const run = (...args) => spawnSync(process.execPath, [...args, script], { cwd: project, encoding: "utf8" });
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    assert.doesNotMatch(first.stdout + first.stderr, /private (slide|grouped) text/i);
    assert.match(first.stderr, /Master\/layout text and text embedded in images/);
    assert.equal(hash(source), before);
    const dest = path.join(project, "public", "templates", "fixture");
    const pack = JSON.parse(fs.readFileSync(path.join(dest, "template.json"), "utf8"));
    assert.deepEqual(pack.backgrounds.map((b) => b.id), ["slide-1", "slide-2", "slide-3", "slide-4"]);
    assert.deepEqual(pack.defaultBackgrounds, { cover: "slide-1", song: "slide-2", content: "slide-1", image: "slide-4" });
    assert.equal(pack.fg, "2A1B10");
    assert.equal(pack.accent, "2A1B10");
    assert.equal(pack.layouts.song.title.font, undefined);
    assert.equal(pack.layouts.song.title.color, "FFFFFF");
    assert.equal(fs.readFileSync(path.join(dest, "keep.txt"), "utf8"), "keep");
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(project, "src", "lib", "templates.generated.json"), "utf8")).map((p) => p.id), ["fixture"]);
    assert.equal(hash(path.join(dest, "slide-3.png")), hash(path.join(dest, "slide-4.png")), "grouped text should be removed");

    const linux = path.join(project, "linux.mjs");
    fs.writeFileSync(linux, 'Object.defineProperty(process, "platform", { value: "linux" });\n');
    const cached = run("--import", pathToFileURL(linux).href);
    assert.equal(cached.status, 0, cached.stderr);
    const renderer = path.join(project, "scripts", "render-powerpoint.ps1");
    const rendererText = fs.readFileSync(renderer, "utf8").replace(/\r\n/g, "\n");
    fs.writeFileSync(renderer, rendererText.replace(/\n/g, "\r\n"));
    const lineEndings = run("--import", pathToFileURL(linux).href);
    assert.equal(lineEndings.status, 0, lineEndings.stderr);
    fs.appendFileSync(path.join(project, "scripts", "render-powerpoint.ps1"), "\n# Cache invalidation test\n");
    const changedRenderer = run("--import", pathToFileURL(linux).href);
    assert.notEqual(changedRenderer.status, 0);
    assert.match(changedRenderer.stderr, /prepared on Windows/);
    fs.copyFileSync(path.join(root, "scripts", "render-powerpoint.ps1"), path.join(project, "scripts", "render-powerpoint.ps1"));
    fs.writeFileSync(path.join(dest, "slide-4.png"), "corrupt");
    const missing = run("--import", pathToFileURL(linux).href);
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /prepared on Windows/);
    assert.equal(hash(source), before);

    fs.writeFileSync(configPath, JSON.stringify({ layouts: { content: { slide: 5 } } }));
    const badConfig = run();
    assert.notEqual(badConfig.status, 0);
    assert.match(badConfig.stderr, /existing slide number/);
    assert.equal(hash(source), before);
    assert.equal(fs.readFileSync(path.join(dest, "keep.txt"), "utf8"), "keep");

    fs.unlinkSync(configPath);
    const backgroundOnly = new PptxGenJS();
    backgroundOnly.layout = "LAYOUT_WIDE";
    backgroundOnly.addSlide().background = { color: "FFFFFF" };
    await backgroundOnly.writeFile({ fileName: source });
    const backgroundHash = hash(source);
    const blankResult = run();
    assert.equal(blankResult.status, 0, blankResult.stderr);
    assert.match(blankResult.stderr, /fewer than two matching text boxes/);
    const blankPack = JSON.parse(fs.readFileSync(path.join(dest, "template.json"), "utf8"));
    assert.equal(blankPack.fg, "FFFFFF");
    assert.equal(blankPack.accent, "FFFFFF");
    assert.equal(blankPack.fontTitle, "Inter");
    assert.equal(blankPack.fontBody, "Inter");
    assert.deepEqual(blankPack.defaultBackgrounds, { cover: "slide-1", song: "slide-1", content: "slide-1", image: "slide-1" });
    assert.equal(hash(source), backgroundHash);
    assert.equal(fs.readFileSync(path.join(dest, "keep.txt"), "utf8"), "keep");
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});
