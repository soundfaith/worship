import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
function load(file, imports = {}) {
  const source = fs.readFileSync(path.join(root, "src", file), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(js, {
    exports, URL, URLSearchParams, process,
    require: (name) => name in imports ? imports[name] : require(name),
  });
  return exports;
}

const { DEFAULT_SONG_FILTERS, matchesSongFilters, songFilterParams, songFiltersFromParams } = load("lib/song-filters.ts");

test("English is the default and unknown languages remain hidden until enabled", () => {
  assert.equal(matchesSongFilters({ language: "english" }, DEFAULT_SONG_FILTERS), true);
  assert.equal(matchesSongFilters({ language: "filipino" }, DEFAULT_SONG_FILTERS), false);
  assert.equal(matchesSongFilters({}, DEFAULT_SONG_FILTERS), false);
  assert.equal(matchesSongFilters({}, { ...DEFAULT_SONG_FILTERS, showOtherLanguages: true }), true);
});

test("tempo and energy combine with any selected theme", () => {
  const filters = { ...DEFAULT_SONG_FILTERS, tempo: "fast", energy: 4, themes: ["hope", "joy"] };
  assert.equal(matchesSongFilters({ language: "english", tempo: "fast", energy: 4, tags: ["joy"] }, filters), true);
  assert.equal(matchesSongFilters({ language: "english", tempo: "medium", energy: 4, tags: ["joy"] }, filters), false);
  assert.equal(matchesSongFilters({ language: "english", tempo: "fast", energy: 3, tags: ["hope"] }, filters), false);
  assert.equal(matchesSongFilters({ language: "english", tempo: "fast", energy: 4 }, filters), false);
  const parsed = songFiltersFromParams(songFilterParams(filters));
  assert.equal(parsed.tempo, "fast");
  assert.equal(parsed.energy, 4);
  assert.deepEqual(Array.from(parsed.themes), ["hope", "joy"]);
  assert.throws(() => songFiltersFromParams(new URLSearchParams("energy=6")), /Invalid song filters/);
});

test("ranked API search filters before limiting results and includes metadata in the index", async () => {
  const songs = Array.from({ length: 205 }, (_, i) => ({
    id: `other-${i}`, title: `Song ${String(i).padStart(3, "0")}`, slides: ["words"],
    language: "filipino", tempo: "slow", energy: 2, tags: ["hope"],
  }));
  songs.push({ id: "english", title: "Song z", slides: ["words"], language: "english", tempo: "fast", energy: 5, tags: ["joy"] });
  const { GET } = load("app/api/songs/route.ts", {
    fs: { promises: { readFile: async () => JSON.stringify({ songs }) } },
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    "@/lib/search": load("lib/search.ts"),
    "@/lib/song-filters": load("lib/song-filters.ts"),
  });
  const index = await GET({ url: "http://localhost/api/songs" });
  assert.equal(index.body.find((song) => song.id === "english").energy, 5);
  const result = await GET({ url: "http://localhost/api/songs?q=song&language=english&tempo=fast&energy=5&theme=hope&theme=joy" });
  assert.deepEqual(Array.from(result.body, (song) => song.id), ["english"]);
  const invalid = await GET({ url: "http://localhost/api/songs?q=song&tempo=medium" });
  assert.equal(invalid.status, 400);
});
