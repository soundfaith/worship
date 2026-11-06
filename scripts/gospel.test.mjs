import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
function load(file, imports) {
  const source = fs.readFileSync(path.join(root, "src", "lib", file), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => name in imports ? imports[name] : require(name) });
  return exports;
}

const data = Object.fromEntries(["daily-readings", "matthew", "mark", "luke", "john"].map((name) =>
  [`../../data/gospel/${name}.json`, require(path.join(root, "data", "gospel", `${name}.json`))]));
const { readingForDate, gospelForAssembly, paginateReading } = load("gospel.ts", data);

test("resolves every indexed reference, including cross-chapter and alternate readings", () => {
  const entries = data["../../data/gospel/daily-readings.json"].entries;
  for (const date of Object.keys(entries)) {
    const reading = readingForDate(date);
    assert.equal(reading.error, undefined, `${date}: ${reading.reference}: ${reading.error}`);
    assert.ok(reading.text.length > 0, date);
  }
  const crossChapter = readingForDate("2026-03-29");
  assert.match(crossChapter.reference, /26:14/);
  const lastVerse = data["../../data/gospel/matthew.json"].verses.find((verse) => verse.chapter === 27 && verse.verse === 66);
  assert.ok(crossChapter.text.endsWith(lastVerse.text));
  assert.ok(readingForDate("2026-01-25").reference.includes(" or "));
  assert.equal(readingForDate("2026-11-13").missingVerses, true);
  assert.ok(readingForDate("2028-01-01").error);
});

test("formats selected verses as source paragraphs without inserted verse numbers", () => {
  const verses = data["../../data/gospel/luke.json"].verses.filter((verse) => verse.chapter === 16 && verse.verse >= 1 && verse.verse <= 8);
  const expected = [];
  for (const [index, verse] of verses.entries()) {
    const previous = verses[index - 1];
    if (!previous || verse.paragraph !== previous.paragraph) expected.push(verse.text);
    else expected[expected.length - 1] += ` ${verse.text}`;
  }
  assert.ok(expected.length > 1);
  assert.equal(readingForDate("2026-11-06").text, expected.join("\n\n"));
});

test("keeps disjoint selections and chapter boundaries separate", () => {
  const verses = data["../../data/gospel/matthew.json"].verses;
  const get = (chapter, verse) => verses.find((item) => item.chapter === chapter && item.verse === verse);
  const reading = readingForDate("2026-12-05").text;
  assert.ok(reading.includes(get(10, 1).text));
  assert.ok(reading.includes(get(10, 5).text));
  assert.ok(!reading.includes(get(10, 2).text));
  assert.ok(reading.includes(`\n\n${get(10, 5).text}`));
  assert.ok(reading.includes(get(9, 35).text));
});

test("follows assembly date unless a different date or custom text is saved", () => {
  const first = gospelForAssembly({ date: "2026-11-06" });
  const second = gospelForAssembly({ date: "2026-11-07" });
  assert.notEqual(first.reference, second.reference);
  const selected = gospelForAssembly({ date: "2026-11-07", gospel: { date: "2026-11-06" } });
  assert.equal(selected.reference, first.reference);
  const edited = gospelForAssembly({ date: "2028-01-01", gospel: { reference: "Custom", text: "Pasted text" } });
  assert.equal(edited.text, "Pasted text");
  assert.equal(edited.reference, "Custom");
  assert.equal(edited.custom, true);
  assert.equal(gospelForAssembly({ date: "2026-11-06", gospel: { include: false } }).include, false);
});

test("pagination preserves all characters, including newlines and long words", () => {
  const text = `  First line\n${"A word ".repeat(120)}\n\n${"x".repeat(300)}\nEnd  `;
  const pages = Array.from(paginateReading(text));
  assert.ok(pages.length > 2);
  assert.equal(pages.join(""), text);
  assert.equal(pages.filter((page) => page.length > 240).length, 1);
  const shortLines = Array.from({ length: 12 }, (_, i) => `${i + 1} short verse`).join("\n");
  const linePages = Array.from(paginateReading(shortLines));
  assert.ok(linePages.length >= 3);
  assert.equal(linePages.join(""), shortLines);
});

test("builds editable Gospel slides and song title slides in order", () => {
  let next = 0;
  const { buildSlides } = load("slides.ts", {
    "./store": { uid: () => String(++next) },
    "./lyrics": { chunkLines: (lines) => lines, DEFAULT_LINES: 4 },
    "./gospel": { gospelForAssembly, paginateReading },
  });
  const text = "Reading words ".repeat(80);
  const assembly = { date: "2026-11-06", includeWelcome: false, includeTheme: false, includeClosing: false,
    openingPrayerText: "", prayerLeader: "", gospel: { text, reference: "Custom reading" },
    songs: [{ uid: "song-one", title: "Test", slides: ["first", "second"] }],
    announcements: [], birthdays: [], anniversaries: [] };
  const slides = buildSlides(assembly);
  const readings = slides.filter((slide) => slide.kind === "gospel");
  assert.ok(readings.length > 1);
  assert.equal(readings.map((slide) => slide.body).join(""), text);
  const songs = slides.filter((slide) => slide.kind === "song");
  assert.equal(songs.length, 3);
  assert.equal(songs[0].layout, "title-only");
  assert.equal(songs[0].body, "");
  assert.ok(songs.every((slide) => slide.songUid === "song-one"));
  assert.ok(slides.indexOf(readings.at(-1)) < slides.indexOf(songs[0]));
});
