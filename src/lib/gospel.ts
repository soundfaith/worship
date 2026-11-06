import daily from "../../data/gospel/daily-readings.json";
import matthew from "../../data/gospel/matthew.json";
import mark from "../../data/gospel/mark.json";
import luke from "../../data/gospel/luke.json";
import john from "../../data/gospel/john.json";
import type { Assembly, GospelSettings } from "./types";
import { GOSPEL_BODY, GOSPEL_MIN_SIZE, readingFits } from "./layout";

type Verse = { chapter: number; verse: number; paragraph: number; text: string };
const books: Record<string, { verses: Verse[] }> = { matthew, mark, luke, john };
const entries: Record<string, { reference: string }> = daily.entries;

export function readingForDate(date: string): { reference: string; text: string; error?: string; partial?: boolean; missingVerses?: boolean } {
  const entry = entries[date];
  if (!entry) return { reference: "", text: "", error: "No daily Gospel reading is available for this date. Choose another date or enter a reading below." };
  const reference = entry.reference;
  const primary = reference.split(/\s+or\s+/i)[0].replace(/[–—]/g, "-");
  const match = /^(Matthew|Mark|Luke|John)\s+(\d+)\s*:\s*(.+)$/i.exec(primary);
  if (!match) return { reference, text: "", error: "This Gospel reference could not be interpreted. Please enter the reading below." };
  const book = books[match[1].toLowerCase()];
  let chapter = Number(match[2]);
  const segments = match[3].replace(/\s+and\s+/gi, ",").split(/\s*,\s*/);
  const selected: Verse[] = [];
  let partial = false;
  let missingVerses = false;
  for (const segment of segments) {
    const range = /^(\d+)([a-z])?(?:\s*-\s*(?:(\d+)\s*:\s*)?(\d+)([a-z])?)?$/i.exec(segment.trim());
    if (!range) return { reference, text: "", error: "This Gospel reference could not be interpreted. Please enter the reading below." };
    const start = Number(range[1]);
    const endChapter = range[3] ? Number(range[3]) : chapter;
    const end = range[4] ? Number(range[4]) : start;
    partial ||= !!range[2] || !!range[5];
    if (endChapter < chapter || (endChapter === chapter && end < start)) {
      return { reference, text: "", error: "This Gospel reference has an invalid verse range. Please enter the reading below." };
    }
    const verses = book.verses.filter((verse) =>
      (verse.chapter > chapter || (verse.chapter === chapter && verse.verse >= start)) &&
      (verse.chapter < endChapter || (verse.chapter === endChapter && verse.verse <= end)));
    if (!verses.length || verses[0].chapter !== chapter || verses[0].verse !== start ||
        verses[verses.length - 1].chapter !== endChapter || verses[verses.length - 1].verse !== end) {
      return { reference, text: "", error: "Some verses for this Gospel reading are unavailable. Please enter the reading below." };
    }
    missingVerses ||= verses.some((verse, index) => index > 0 && verse.chapter === verses[index - 1].chapter && verse.verse > verses[index - 1].verse + 1);
    selected.push(...verses);
    chapter = endChapter;
  }
  const paragraphs: string[] = [];
  selected.forEach((verse, index) => {
    const previous = selected[index - 1];
    if (!previous || verse.chapter !== previous.chapter || verse.paragraph !== previous.paragraph || verse.verse !== previous.verse + 1) {
      paragraphs.push(verse.text);
    } else {
      paragraphs[paragraphs.length - 1] += ` ${verse.text}`;
    }
  });
  return { reference, text: paragraphs.join("\n\n"), partial, missingVerses };
}

export function gospelForAssembly(a: Pick<Assembly, "date" | "gospel">) {
  const settings: GospelSettings = a.gospel ?? {};
  const date = settings.date ?? a.date;
  const dailyReading = readingForDate(date);
  return {
    date,
    include: settings.include ?? true,
    reference: settings.reference ?? dailyReading.reference,
    text: settings.text ?? dailyReading.text,
    error: dailyReading.error,
    partial: dailyReading.partial,
    missingVerses: dailyReading.missingVerses,
    custom: settings.reference !== undefined || settings.text !== undefined,
  };
}

export function paginateReading(text: string): string[] {
  const pages: string[] = [];
  let page = "";
  const fits = (value: string) => readingFits(GOSPEL_BODY, value, GOSPEL_MIN_SIZE);
  const segments: string[] = [];
  let start = 0;
  for (const match of text.matchAll(/\r?\n[ \t]*\r?\n(?:[ \t]*\r?\n)*/g)) {
    const end = match.index + match[0].length;
    segments.push(text.slice(start, end));
    start = end;
  }
  segments.push(text.slice(start));
  const flush = () => { if (page) { pages.push(page); page = ""; } };
  const flushAtSentence = () => {
    let boundary = 0;
    for (const match of page.matchAll(/[.!?]["')\]]*\s+/g)) {
      const end = match.index + match[0].length;
      if (end >= page.length * 0.6) boundary = end;
    }
    if (boundary && /\S/.test(page.slice(boundary))) {
      pages.push(page.slice(0, boundary));
      page = page.slice(boundary);
    } else {
      flush();
    }
  };

  for (const segment of segments) {
    if (fits(page + segment)) {
      page += segment;
      continue;
    }
    flush();
    if (fits(segment)) {
      page = segment;
      continue;
    }
    const tokens = segment.match(/\s+|\S+/gu) ?? [];
    for (const token of tokens) {
      if (fits(page + token)) {
        page += token;
        continue;
      }
      if (/\S/.test(page)) flushAtSentence();
      if (!fits(page + token) && /\S/.test(page)) flush();
      if (fits(page + token)) {
        page += token;
        continue;
      }
      for (const character of token) {
        if (page && !fits(page + character) && /\S/.test(page)) flush();
        page += character;
      }
    }
  }
  flush();
  return pages;
}
