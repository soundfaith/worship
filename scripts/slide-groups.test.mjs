import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "lib", "slide-groups.ts"), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
vm.runInNewContext(js, { exports });
const { groupRange: groupRangeInContext, moveSlideRange: moveInContext } = exports;
// vm contexts have their own Array/Object prototypes, so compare plain JSON copies.
const plain = (value) => JSON.parse(JSON.stringify(value));
const groupRange = (...args) => plain(groupRangeInContext(...args));
const moveSlideRange = (...args) => {
  const result = moveInContext(...args);
  return result && plain(result);
};

const slide = (id, extra = {}) => ({ id, kind: "content", title: id, body: "", ...extra });
const ids = (slides) => slides.map((s) => s.id);
const song = (id, uid) => slide(id, { kind: "song", songUid: uid });
const story = (id, groupId) => slide(id, { kind: "story", groupId });
const gospel = (id) => slide(id, { kind: "gospel" });

test("groupRange spans a song, a story, and adjacent Gospel pages", () => {
  const slides = [slide("a"), song("s1", "u1"), song("s2", "u1"), story("t1", "g1"), story("t2", "g1"), gospel("g1"), gospel("g2")];
  assert.deepEqual(groupRange(slides, 2), { start: 1, end: 3 });
  assert.deepEqual(groupRange(slides, 4), { start: 3, end: 5 });
  assert.deepEqual(groupRange(slides, 6), { start: 5, end: 7 });
  assert.deepEqual(groupRange(slides, 0), { start: 0, end: 1 });
});

test("moving a whole song past an ungrouped slide keeps the song together", () => {
  const slides = [slide("a"), song("s1", "u1"), song("s2", "u1"), slide("b")];
  const result = moveSlideRange(slides, 1, 3, 1, false);
  assert.deepEqual(ids(result.slides), ["a", "b", "s1", "s2"]);
  assert.equal(result.index, 2);
});

test("moving an ungrouped slide up jumps over a whole group", () => {
  const slides = [story("t1", "g1"), story("t2", "g1"), slide("b")];
  const result = moveSlideRange(slides, 2, 3, -1, true);
  assert.deepEqual(ids(result.slides), ["b", "t1", "t2"]);
  assert.equal(result.index, 0);
});

test("moving one slide of a group swaps only with a single neighbor", () => {
  const slides = [slide("a"), story("t1", "g1"), story("t2", "g1")];
  const result = moveSlideRange(slides, 2, 3, -1, false);
  assert.deepEqual(ids(result.slides), ["a", "t2", "t1"]);
  assert.equal(result.index, 1);
});

test("moves at the ends of the deck return null", () => {
  const slides = [slide("a"), slide("b")];
  assert.equal(moveSlideRange(slides, 0, 1, -1, false), null);
  assert.equal(moveSlideRange(slides, 1, 2, 1, false), null);
});
