import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "lib", "presentation.ts"), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
vm.runInNewContext(js, { exports });
const { presentationIndexForSwipe } = exports;

test("horizontal swipes navigate without passing either end, including the credits slide", () => {
  assert.equal(presentationIndexForSwipe(0, 3, -100, 0), 1);
  assert.equal(presentationIndexForSwipe(1, 3, -100, 0), 2);
  assert.equal(presentationIndexForSwipe(2, 3, -100, 0), 2);
  assert.equal(presentationIndexForSwipe(1, 3, 100, 0), 0);
  assert.equal(presentationIndexForSwipe(0, 3, 100, 0), 0);
});

test("short, vertical and diagonal gestures do not change slides", () => {
  assert.equal(presentationIndexForSwipe(1, 3, -49, 0), 1);
  assert.equal(presentationIndexForSwipe(1, 3, -80, 120), 1);
  assert.equal(presentationIndexForSwipe(1, 3, -80, 80), 1);
});
