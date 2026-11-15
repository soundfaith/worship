import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "lib", "video.ts"), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
vm.runInNewContext(js, { exports, URL, document: undefined, indexedDB: undefined, FileReader: undefined });
const { parseYouTubeId } = exports;

test("parses common YouTube link formats", () => {
  const id = "dQw4w9WgXcQ";
  assert.equal(parseYouTubeId(`https://www.youtube.com/watch?v=${id}&t=42`), id);
  assert.equal(parseYouTubeId(`https://youtu.be/${id}?si=abc`), id);
  assert.equal(parseYouTubeId(`https://m.youtube.com/watch?v=${id}`), id);
  assert.equal(parseYouTubeId(`https://www.youtube.com/shorts/${id}`), id);
  assert.equal(parseYouTubeId(`https://www.youtube.com/embed/${id}`), id);
});

test("rejects links that are not YouTube videos", () => {
  assert.equal(parseYouTubeId("https://vimeo.com/123456789"), null);
  assert.equal(parseYouTubeId("https://www.youtube.com/watch?v=short"), null);
  assert.equal(parseYouTubeId("https://www.youtube.com/"), null);
  assert.equal(parseYouTubeId("not a url"), null);
});
