import assert from "node:assert/strict";
import { test } from "node:test";
import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { defaultLayouts, readTemplateNotes } from "./template-notes.mjs";

async function deck(notes) {
  const presentation = new PptxGenJS();
  for (const note of notes) {
    const slide = presentation.addSlide();
    if (note !== null) slide.addNotes(note);
  }
  return JSZip.loadAsync(await presentation.write({ outputType: "nodebuffer" }));
}

test("reads markers from speaker notes, case-insensitively and across formatted runs", async () => {
  const zip = await deck(["ordinary notes\n  LAYOUT : COVER  ", "layout:song", "layout:content\nlayout:image", null]);
  const file = "ppt/notesSlides/notesSlide1.xml";
  const xml = await zip.file(file).async("string");
  zip.file(file, xml.replace("LAYOUT : COVER", "LAYOUT :</a:t></a:r><a:r><a:t> COVER"));
  assert.deepEqual(await readTemplateNotes(zip), {
    slideCount: 4,
    markers: { cover: 1, song: 2, content: 3, image: 3 },
  });
});

test("uses presentation order rather than internal slide or notes filenames", async () => {
  const zip = await deck(["layout:cover", "layout:song"]);
  const file = "ppt/presentation.xml";
  const xml = await zip.file(file).async("string");
  const slides = xml.match(/<p:sldId [^>]+\/>/g);
  assert.equal(slides.length, 2);
  zip.file(file, xml.replace(slides.join(""), slides.reverse().join("")));
  assert.deepEqual((await readTemplateNotes(zip)).markers, { song: 1, cover: 2 });
});

test("rejects duplicate and unknown layout markers", async () => {
  await assert.rejects(readTemplateNotes(await deck(["layout:song", "layout:song"])), /Duplicate layout:song markers on slides 1 and 2/);
  await assert.rejects(readTemplateNotes(await deck(["layout:song2", "layout:song2"])), /Duplicate layout:song2 markers on slides 1 and 2/);
  await assert.rejects(readTemplateNotes(await deck(["layout:chorus"])), /Unknown layout marker on slide 1/);
});

test("reads numbered song markers independently of slide order", async () => {
  const zip = await deck(["layout:song3", "layout:song1", "layout:song2\nlayout:song"]);
  assert.deepEqual((await readTemplateNotes(zip)).markers, { song3: 1, song1: 2, song2: 3, song: 3 });
});

test("uses positional defaults and caps each role at the last available slide", () => {
  for (const [count, expected] of [[1, [1, 1, 1, 1]], [2, [1, 2, 2, 2]], [3, [1, 2, 3, 3]], [4, [1, 2, 3, 4]], [5, [1, 2, 3, 4]]]) {
    assert.deepEqual(Object.values(defaultLayouts(count)).map((layout) => layout.slide), expected);
  }
});

test("ignores normal notes and slide content without notes", async () => {
  const zip = await deck(["A note mentioning layout:song in a sentence.", null]);
  assert.deepEqual(await readTemplateNotes(zip), { slideCount: 2, markers: {} });
});
