export type SlideKind =
  | "welcome"
  | "theme"
  | "prayer"
  | "gospel"
  | "song"
  | "announcement"
  | "birthday"
  | "anniversary"
  | "closing"
  | "custom";

export interface Slide {
  id: string;
  kind: SlideKind;
  songUid?: string;
  title: string;
  body: string;
  image?: string;
  image2?: string;
  background?: { templateId: string; id: string };
  backgroundImage?: {
    data: string;
    title: string;
    artist: string;
    license: string;
    licenseUrl: string;
    sourceUrl: string;
    providerLabel?: string;
  };
  font?: string;
  textColor?: string;
  layout?: LayoutName; // overrides the page layout chosen from the slide kind
}

export interface SongMetadata {
  language?: string;
  tempo?: "slow" | "medium" | "fast";
  energy?: number;
  tags?: string[];
}

export interface SongIndexEntry extends SongMetadata {
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

export interface Song extends SongMetadata {
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

export interface GospelSettings {
  date?: string;
  include?: boolean;
  reference?: string;
  text?: string;
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
  backgroundColor?: string;
  font?: string;
  sectionTemplates: Partial<Record<SlideKind, string>>;
  logo?: LogoPlacement;
  showLogo?: boolean;
  includeWelcome: boolean;
  includeTheme: boolean;
  includeClosing: boolean;
  openingPrayerText: string;
  gospel?: GospelSettings;
  closingPrayerText: string;
  songs: AssemblySong[];
  announcements: Announcement[];
  birthdays: Celebrant[];
  anniversaries: Celebrant[];
  slides: Slide[] | null;
  createdAt: number;
  updatedAt: number;
}

export interface LogoPlacement {
  data: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LogoPreference = LogoPlacement | null;

export type ImageProvider = "library" | "commons" | "unsplash" | "pexels";

export interface PhotoSearchResult {
  id: string;
  title: string;
  artist: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  thumbnailUrl: string;
  provider: ImageProvider;
  providerLabel: string;
  downloadUrl?: string;
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
  backgrounds?: TemplateBackground[];
  defaultBackgrounds?: Partial<Record<"cover" | "song" | "content" | "image", string>>;
  songBackgrounds?: string[];
}

export interface TemplateBackground {
  id: string;
  name: string;
  src: string;
}

export type LayoutName = "cover" | "song" | "content" | "image" | "image-left" | "two-images" | "text-two-images" | "title-image" | "title-only" | "centered";

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
  fitTitle?: boolean;
  title: TextBox;
  body: TextBox;
  image?: Rect;
  image2?: Rect;
  hideBody?: boolean;
}
