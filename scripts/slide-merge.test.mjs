import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "lib", "slide-merge.ts"), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
vm.runInNewContext(js, { exports });
// vm contexts have their own Array/Object prototypes, so compare plain JSON copies.
const mergeSlides = (prev, next) => JSON.parse(JSON.stringify(exports.mergeSlides(prev, next)));

const generated = (key, title, body = "") => ({
  id: `id-${key}`,
  kind: "content",
  title,
  body,
  source: { id: key, title, body },
});
const ids = (slides) => slides.map((s) => s.id);

test("returns the regenerated list when there are no existing slides", () => {
  const next = [generated("welcome", "Welcome")];
  assert.deepEqual(mergeSlides(null, next), next);
});

test("keeps user edits and order, and refreshes unedited text from the source", () => {
  const prev = [
    { ...generated("welcome", "Welcome", "Old"), body: "My text" },
    generated("prayer", "Prayer", "Old prayer"),
  ];
  const next = [generated("welcome", "Welcome", "New"), generated("prayer", "Prayer", "New prayer")];
  const merged = mergeSlides(prev, next);
  assert.equal(merged[0].body, "My text");
  assert.equal(merged[1].body, "New prayer");
  assert.deepEqual(ids(merged), ["id-welcome", "id-prayer"]);
});

test("drops generated slides whose source is gone but keeps hand-added slides", () => {
  const custom = { id: "custom-1", kind: "custom", title: "Custom", body: "" };
  const prev = [generated("welcome", "Welcome"), custom, generated("announcement:1", "News")];
  const merged = mergeSlides(prev, [generated("welcome", "Welcome")]);
  assert.deepEqual(ids(merged), ["id-welcome", "custom-1"]);
});

test("inserts new generated slides after the slide that precedes them", () => {
  const prev = [generated("welcome", "Welcome"), { id: "custom-1", kind: "custom", title: "Custom", body: "" }];
  const next = [generated("welcome", "Welcome"), generated("story:1:0", "Story"), generated("closing", "Closing")];
  assert.deepEqual(ids(mergeSlides(prev, next)), ["id-welcome", "id-story:1:0", "id-closing", "custom-1"]);
});
