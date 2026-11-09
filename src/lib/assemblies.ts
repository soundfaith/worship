"use client";
import { uid, useLocalStore } from "./store";
import { DEFAULT_FONT, DEFAULT_TEMPLATE } from "./templates";
import type { Announcement, Assembly } from "./types";

const NONE: Assembly[] = [];
const NO_ANN: Announcement[] = [];
const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export function useAssemblies() {
  return useLocalStore<Assembly[]>("worship.assemblies", NONE);
}

export function useSoundFaithDiscoveryEligibility() {
  return useLocalStore<boolean>("worship.soundfaithDiscoveryEligible", false);
}

export function useRecurring() {
  return useLocalStore<Announcement[]>("worship.recurringAnnouncements", NO_ANN);
}

export function usePreferredFont() {
  return useLocalStore<string>("worship.preferredFont", DEFAULT_FONT);
}

export function blankAssembly(font = DEFAULT_FONT): Assembly {
  const now = Date.now();
  return {
    id: uid(),
    title: "",
    activity: "Prayer Assembly",
    date: localDate(),
    theme: "",
    presider: "",
    prayerLeader: "",
    worshipLeader: "",
    assignments: [],
    templateId: DEFAULT_TEMPLATE,
    backgroundColor: "F7F5F0",
    font,
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
    date: localDate(),
    slides: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
