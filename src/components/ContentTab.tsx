"use client";
import { useAssemblies, useRecurring } from "@/lib/assemblies";
import { uid } from "@/lib/store";
import type { Announcement, Celebrant } from "@/lib/types";
import { IconButton } from "./Icon";
import { Field, Section, type TabProps } from "./ui";

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
      {label}
    </label>
  );
}

function CelebrantList({
  items, onChange, noun, detailLabel,
}: { items: Celebrant[]; onChange: (v: Celebrant[]) => void; noun: string; detailLabel: string }) {
  return (
    <div className="space-y-2">
      {items.map((c) => (
        <div key={c.id} className="flex gap-2">
          <input className="input" aria-label={noun} placeholder={noun} value={c.name} onChange={(e) => onChange(items.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))} />
          <input className="input" aria-label={detailLabel} placeholder={detailLabel} value={c.detail ?? ""} onChange={(e) => onChange(items.map((x) => (x.id === c.id ? { ...x, detail: e.target.value } : x)))} />
          <IconButton icon="close" label="Remove" danger onClick={() => onChange(items.filter((x) => x.id !== c.id))} />
        </div>
      ))}
      <button className="btn" onClick={() => onChange([...items, { id: uid(), name: "", detail: "" }])}>+ Add</button>
    </div>
  );
}

export function ContentTab({ a, update }: TabProps) {
  const [all] = useAssemblies();
  const [recurring, setRecurring] = useRecurring();
  const set = (patch: Parameters<TabProps["update"]>[0]) => update({ ...patch, slides: null });

  const setAnn = (list: Announcement[]) => set({ announcements: list });
  const previous = all
    .filter((x) => x.id !== a.id)
    .flatMap((x) => x.announcements)
    .filter((x, i, arr) => x.text.trim() && arr.findIndex((y) => y.text === x.text) === i)
    .filter((x) => !a.announcements.some((y) => y.text === x.text))
    .slice(0, 8);
  const reusable = [...recurring.filter((r) => !a.announcements.some((y) => y.text === r.text)), ...previous];

  const move = (i: number, d: number) => {
    const next = [...a.announcements];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setAnn(next);
  };
  const toggleRecurring = (x: Announcement, on: boolean) => {
    setAnn(a.announcements.map((y) => (y.id === x.id ? { ...y, recurring: on } : y)));
    setRecurring((l) => (on ? [...l, { ...x, recurring: true }] : l.filter((r) => r.text !== x.text)));
  };

  return (
    <div className="space-y-8">
      <Section title="Sections" hint="Optional slides to include.">
        <div className="flex flex-wrap gap-6">
          <Check label="Welcome slide" checked={a.includeWelcome} onChange={(v) => set({ includeWelcome: v })} />
          <Check label="Theme slide" checked={a.includeTheme} onChange={(v) => set({ includeTheme: v })} />
          <Check label="Closing prayer" checked={a.includeClosing} onChange={(v) => set({ includeClosing: v })} />
        </div>
      </Section>

      <Section title="Opening prayer" hint={a.prayerLeader ? `Led by ${a.prayerLeader}` : "Set the prayer leader in Details."}>
        <Field label="Prayer text (optional)">
          <textarea className="input h-24" value={a.openingPrayerText} onChange={(e) => set({ openingPrayerText: e.target.value })} />
        </Field>
        {a.includeClosing && (
          <Field label="Closing prayer text (optional)">
            <textarea className="input h-24" value={a.closingPrayerText} onChange={(e) => set({ closingPrayerText: e.target.value })} />
          </Field>
        )}
      </Section>

      <Section title="Announcements" hint="Each announcement becomes its own slide.">
        {a.announcements.map((x, i) => (
          <div key={x.id} className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/60 p-3">
            <textarea className="input h-20" aria-label="Announcement" value={x.text} onChange={(e) => setAnn(a.announcements.map((y) => (y.id === x.id ? { ...y, text: e.target.value } : y)))} />
            <div className="flex flex-wrap items-center gap-4">
              <Check label="Show" checked={x.show} onChange={(v) => setAnn(a.announcements.map((y) => (y.id === x.id ? { ...y, show: v } : y)))} />
              <Check label="Save as recurring" checked={x.recurring} onChange={(v) => toggleRecurring(x, v)} />
              <span className="flex-1" />
              <IconButton icon="up" label="Move up" disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton icon="down" label="Move down" disabled={i === a.announcements.length - 1} onClick={() => move(i, 1)} />
              <IconButton icon="close" label="Remove" danger onClick={() => setAnn(a.announcements.filter((y) => y.id !== x.id))} />
            </div>
          </div>
        ))}
        <button className="btn" onClick={() => setAnn([...a.announcements, { id: uid(), text: "", show: true, recurring: false }])}>+ Add announcement</button>
        {reusable.length > 0 && (
          <div className="space-y-1 pt-2">
            <p className="eyebrow">Reuse</p>
            {reusable.map((x) => (
              <button key={x.id} className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-stone-100" onClick={() => setAnn([...a.announcements, { ...x, id: uid(), show: true }])}>
                + {x.text}
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Birthdays">
        <CelebrantList items={a.birthdays} onChange={(v) => set({ birthdays: v })} noun="Name" detailLabel="Date (optional)" />
      </Section>

      <Section title="Anniversaries">
        <CelebrantList items={a.anniversaries} onChange={(v) => set({ anniversaries: v })} noun="Couple" detailLabel="Years (optional)" />
      </Section>
    </div>
  );
}
