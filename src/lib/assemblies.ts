"use client";
import { uid, useLocalStore } from "./store";
import { DEFAULT_TEMPLATE } from "./templates";
import type { Announcement, Assembly } from "./types";

const NONE: Assembly[] = [];
const NO_ANN: Announcement[] = [];

export function useAssemblies() {
  return useLocalStore<Assembly[]>("worship.assemblies", NONE);
}

export function useRecurring() {
  return useLocalStore<Announcement[]>("worship.recurringAnnouncements", NO_ANN);
}

export function blankAssembly(): Assembly {
  const now = Date.now();
  return {
    id: uid(),
    title: "",
    activity: "Prayer Assembly",
    date: new Date().toISOString().slice(0, 10),
    theme: "",
    presider: "",
    prayerLeader: "",
    worshipLeader: "",
    assignments: [],
    templateId: DEFAULT_TEMPLATE,
    font: "Inter",
    sectionTemplates: {},
    includeWelcome: true,
    includeTheme: false,
    includeClosing: true,
    openingPrayerText: "",
    closingPrayerText: "",
    songs: [],
    announcements: [],
    birthdays: [],
    anniversaries: [],
    slides: null,
    createdAt: now,
    updatedAt: now,
  };
}

// Copy an assembly as a starting point: keeps content, resets date and generated slides.
export function duplicateAssembly(a: Assembly): Assembly {
  return {
    ...structuredClone(a),
    id: uid(),
    title: a.title ? `${a.title} (copy)` : "",
    date: new Date().toISOString().slice(0, 10),
    slides: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
