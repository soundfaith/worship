import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
function load(file, imports) {
  const source = fs.readFileSync(path.join(root, "src", "lib", file), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require: (name) => name in imports ? imports[name] : require(name) });
  return exports;
}

const { backgroundFor, songIndexes } = load("templates.ts", { "./templates.generated.json": [] });
const template = {
  id: "test",
  backgrounds: ["one", "two", "three", "base", "image"].map((id) => ({ id })),
  defaultBackgrounds: { song: "base", image: "image" },
  songBackgrounds: ["one", "two", "three"],
};
const song = (id, songUid, title = "Song") => ({ id, kind: "song", songUid, title, body: "" });

test("cycles per song, not lyric slide, including repeated titles and reordered slides", () => {
  const slides = [song("a", "first"), song("b", "first"), song("c", "second"), song("d", "third"), song("e", "fourth"), song("f", "first")];
  const indexes = Array.from(songIndexes(slides));
  assert.deepEqual(indexes, [0, 0, 1, 2, 3, 0]);
  assert.deepEqual(indexes.map((n, i) => backgroundFor(template, slides[i], n).id), ["one", "one", "two", "three", "one", "one"]);
  const reordered = [slides[2], slides[0], slides[1]];
  assert.deepEqual(Array.from(songIndexes(reordered)), [0, 1, 1]);
});

test("uses numbered song designs, generic fallback and manual overrides", () => {
  const slide = song("a", "first");
  assert.equal(backgroundFor({ ...template, songBackgrounds: ["two"] }, slide, 4).id, "two");
  assert.equal(backgroundFor({ ...template, songBackgrounds: ["one", "three"] }, slide, 3).id, "three");
  assert.equal(backgroundFor({ ...template, songBackgrounds: [] }, slide, 2).id, "base");
  assert.equal(backgroundFor(template, { ...slide, background: { templateId: "test", id: "base" } }, 1).id, "base");
  assert.equal(backgroundFor(template, { ...slide, image: "upload" }, 1).id, "image");
});

test("groups legacy consecutive same-title song slides without changing saved data", () => {
  const slides = [song("a", undefined, "A"), song("b", undefined, "A"), song("c", undefined, "B"), { id: "d", kind: "custom" }, song("e", undefined, "A")];
  assert.deepEqual(Array.from(songIndexes(slides)), [0, 0, 1, 0, 2]);
});

test("generated lyric slides retain their distinct assembly song identities", () => {
  let id = 0;
  const { buildSlides } = load("slides.ts", { "./store": { uid: () => String(++id) }, "./lyrics": { chunkLines: (lines) => lines, DEFAULT_LINES: 4 }, "./gospel": { gospelForAssembly: () => ({ include: false }), paginateReading: () => [] } });
  const a = { includeWelcome: false, includeTheme: false, includeClosing: false, openingPrayerText: "", prayerLeader: "", songs: [
    { uid: "first", title: "Same", slides: ["a", "b"] }, { uid: "second", title: "Same", slides: ["c"] },
  ], announcements: [], birthdays: [], anniversaries: [] };
  const slides = buildSlides(a).filter((slide) => slide.kind === "song");
  assert.deepEqual(Array.from(slides, (slide) => slide.songUid), ["first", "first", "first", "second", "second"]);
  assert.deepEqual(Array.from(slides, (slide) => slide.layout ?? null), ["title-only", null, null, "title-only", null]);
});
