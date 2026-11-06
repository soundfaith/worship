export type SlideKind =
  | "welcome"
  | "theme"
  | "prayer"
  | "song"
  | "announcement"
  | "birthday"
  | "anniversary"
  | "closing"
  | "custom";

export interface Slide {
  id: string;
  kind: SlideKind;
  title: string;
  body: string;
  image?: string;
  layout?: LayoutName; // overrides the page layout chosen from the slide kind
}

export interface SongIndexEntry {
  id: string;
  title: string;
  slideCount: number;
  rank?: number;
  match?: "title" | "lyrics";
  snippet?: string;
  version?: number;
  versionCount?: number;
  custom?: boolean;
}

export interface Song {
  id: string;
  title: string;
  slides: string[];
  version?: number;
  versionCount?: number;
  custom?: boolean;
}

export interface AssemblySong {
  uid: string;
  songId: string;
  title: string;
  slides: string[];
  lines?: number;
}

export interface Announcement {
  id: string;
  text: string;
  show: boolean;
  recurring: boolean;
}

export interface Celebrant {
  id: string;
  name: string;
  detail?: string;
}

export interface Assignment {
  id: string;
  role: string;
  name: string;
}

export interface Assembly {
  id: string;
  title: string;
  activity: string;
  date: string;
  theme: string;
  presider: string;
  prayerLeader: string;
  worshipLeader: string;
  assignments: Assignment[];
  templateId: string;
  sectionTemplates: Partial<Record<SlideKind, string>>;
  includeWelcome: boolean;
  includeTheme: boolean;
  includeClosing: boolean;
  openingPrayerText: string;
  closingPrayerText: string;
  songs: AssemblySong[];
  announcements: Announcement[];
  birthdays: Celebrant[];
  anniversaries: Celebrant[];
  slides: Slide[] | null;
  createdAt: number;
  updatedAt: number;
}

export interface Template {
  id: string;
  name: string;
  bg: string;
  fg: string;
  accent: string;
  fontTitle: string;
  fontBody: string;
  dir?: string; // public URL of a template pack folder
  layouts?: Partial<Record<LayoutName, Layout>>;
}

export type LayoutName = "cover" | "song" | "content" | "image";

// Rect in fractions of the slide (0-1).
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextBox extends Rect {
  size: number; // points on a 10in-wide slide
  align: "left" | "center";
  color: string;
  caps?: boolean;
  spacing?: number;
}

export interface GradientStop {
  pos: number; // 0-1
  color: string;
  alpha?: number; // 0-1
}

export type Fill =
  | { type: "solid"; color: string; alpha?: number }
  | { type: "gradient"; angle: number; stops: GradientStop[] };

// Decorative shapes drawn behind the text. `src` is relative to the template folder.
export interface Shape extends Rect {
  type: "rect" | "ellipse" | "roundRect" | "image";
  fill?: Fill;
  src?: string;
  rot?: number;
  opacity?: number;
}

export interface Layout {
  bg?: Fill;
  shapes?: Shape[];
  title: TextBox;
  body: TextBox;
  image?: Rect;
}
