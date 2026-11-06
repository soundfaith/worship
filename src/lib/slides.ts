import type { Assembly, Celebrant, Slide } from "./types";
import { uid } from "./store";
import { chunkLines, DEFAULT_LINES } from "./lyrics";
import { gospelForAssembly, paginateReading } from "./gospel";

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
  const add = (kind: Slide["kind"], title: string, body: string) => s.push({ id: uid(), kind, title, body });

  if (a.includeWelcome) {
    add("welcome", a.title || "Welcome", [a.activity, formatDate(a.date)].filter(Boolean).join("\n"));
  }
  if (a.includeTheme && a.theme.trim()) add("theme", "Theme", a.theme.trim());

  const prayerBody = [a.openingPrayerText.trim(), a.prayerLeader ? `Led by ${a.prayerLeader}` : ""]
    .filter(Boolean)
    .join("\n\n");
  add("prayer", "Opening Prayer", prayerBody);

  const gospel = gospelForAssembly(a);
  if (gospel.include && gospel.text.trim()) {
    for (const body of paginateReading(gospel.text)) add("gospel", gospel.reference || "Gospel Reading", body);
  }

  for (const song of a.songs) {
    s.push({ id: uid(), kind: "song", songUid: song.uid, title: song.title, body: "", layout: "title-only" });
    for (const body of chunkLines(song.slides, song.lines ?? DEFAULT_LINES)) {
      s.push({ id: uid(), kind: "song", songUid: song.uid, title: song.title, body });
    }
  }

  for (const ann of a.announcements.filter((x) => x.show && x.text.trim())) {
    add("announcement", "Announcements", ann.text.trim());
  }
  chunk(a.birthdays.filter((b) => b.name.trim()), 6).forEach((g) => add("birthday", "Happy Birthday!", names(g)));
  chunk(a.anniversaries.filter((b) => b.name.trim()), 5).forEach((g) =>
    add("anniversary", "Happy Anniversary!", names(g)),
  );

  if (a.includeClosing) {
    add("closing", "Closing Prayer", a.closingPrayerText.trim());
  }
  return s;
}
