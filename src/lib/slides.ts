import type { Assembly, Celebrant, Slide } from "./types";
import { uid } from "./store";
import { chunkLines, DEFAULT_LINES } from "./lyrics";
import { gospelForAssembly, paginateReading } from "./gospel";
import { mergeSlides } from "./slide-merge";

const chunk = <T,>(arr: T[], n: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

const names = (c: Celebrant[]) => c.map((x) => (x.detail ? `${x.name} — ${x.detail}` : x.name)).join("\n");

export function formatDate(d: string) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export function coverSlide(a: Assembly): Slide {
  return {
    id: `cover-${a.id}`,
    kind: "welcome",
    title: a.title || "Untitled assembly",
    body: [a.activity, formatDate(a.date)].filter(Boolean).join("\n"),
  };
}

export function buildSlides(a: Assembly): Slide[] {
  const s: Slide[] = [];
  const add = (kind: Slide["kind"], title: string, body: string, key: string) =>
    s.push({ id: uid(), kind, title, body, source: { id: key, title, body } });

  if (a.includeWelcome) {
    add("welcome", a.title || "Welcome", [a.activity, formatDate(a.date)].filter(Boolean).join("\n"), "welcome");
  }
  if (a.includeTheme && a.theme.trim()) add("theme", "Theme", a.theme.trim(), "theme");

  const prayerBody = [a.openingPrayerText.trim(), a.prayerLeader ? `Led by ${a.prayerLeader}` : ""]
    .filter(Boolean)
    .join("\n\n");
  add("prayer", "Opening Prayer", prayerBody, "prayer");

  const gospel = gospelForAssembly(a);
  if (gospel.include && gospel.text.trim()) {
    paginateReading(gospel.text).forEach((body, i) => add("gospel", gospel.reference || "Gospel Reading", body, `gospel:${i}`));
  }

  for (const song of a.songs) {
    const title = song.title;
    s.push({ id: uid(), kind: "song", songUid: song.uid, title, body: "", layout: "title-only", source: { id: `song:${song.uid}:title`, title, body: "" } });
    chunkLines(song.slides, song.lines ?? DEFAULT_LINES).forEach((body, i) => {
      s.push({ id: uid(), kind: "song", songUid: song.uid, title, body, source: { id: `song:${song.uid}:${i}`, title, body } });
    });
  }

  for (const ann of a.announcements.filter((x) => x.show && x.text.trim())) {
    add("announcement", "Announcements", ann.text.trim(), `announcement:${ann.id}`);
  }
  for (const story of (a.stories ?? []).filter((x) => x.show && x.text.trim())) {
    const title = story.title.trim() || "Long content";
    paginateReading(story.text).forEach((body, i) => {
      s.push({ id: uid(), kind: "story", groupId: story.id, title, body, source: { id: `story:${story.id}:${i}`, title, body } });
    });
  }
  chunk(a.birthdays.filter((b) => b.name.trim()), 6).forEach((g, i) => add("birthday", "Happy Birthday!", names(g), `birthday:${i}`));
  chunk(a.anniversaries.filter((b) => b.name.trim()), 5).forEach((g, i) =>
    add("anniversary", "Happy Anniversary!", names(g), `anniversary:${i}`),
  );

  if (a.includeClosing) {
    add("closing", "Closing Prayer", a.closingPrayerText.trim(), "closing");
  }
  return s;
}

// The assembly update for a content change. Keeps the user's slide edits instead of clearing them.
export function contentPatch(a: Assembly, patch: Partial<Assembly>): Partial<Assembly> {
  return { ...patch, slides: mergeSlides(a.slides, buildSlides({ ...a, ...patch })) };
}
