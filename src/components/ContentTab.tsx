"use client";
import { useState } from "react";
import { useAssemblies, useRecurring } from "@/lib/assemblies";
import { gospelForAssembly } from "@/lib/gospel";
import { uid } from "@/lib/store";
import type { Announcement } from "@/lib/types";
import { IconButton } from "./Icon";
import { ConfirmDialog } from "./Modal";
import { Field, Section, type TabProps } from "./ui";
import { Icon } from "./Icon";

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
      {label}
    </label>
  );
}

export function ContentTab({ a, update }: TabProps) {
  const [all] = useAssemblies();
  const [recurring, setRecurring] = useRecurring();
  const [pendingGospelDate, setPendingGospelDate] = useState<string | null>(null);
  const [pendingAssemblyDate, setPendingAssemblyDate] = useState<string | null>(null);
  const set = (patch: Parameters<TabProps["update"]>[0]) => update({ ...patch, slides: null });
  const gospel = gospelForAssembly(a);
  const changeGospelDate = (date: string) => {
    if (gospel.custom) setPendingGospelDate(date);
    else set({ gospel: { ...a.gospel, date: date || undefined } });
  };
  const loadGospelDate = (date: string) => set({ gospel: { include: gospel.include, date: date || undefined } });

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
      <Section title="The essentials">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Assembly title">
            <input className="input" value={a.title} onChange={(event) => update({ title: event.target.value })} placeholder="Sunday Prayer Assembly" />
          </Field>
          <Field label="Date">
            <input
              type="date"
              className="input"
              value={a.date}
              onChange={(event) => {
                if (a.slides) setPendingAssemblyDate(event.target.value);
                else set({ date: event.target.value });
              }}
            />
          </Field>
        </div>
      </Section>
      {pendingAssemblyDate !== null && (
        <ConfirmDialog
          title="Change assembly date?"
          message="Slides will be regenerated for the new date, and manual slide edits will be lost. Custom Gospel text will be kept."
          confirmLabel="Change date"
          onCancel={() => setPendingAssemblyDate(null)}
          onConfirm={() => { set({ date: pendingAssemblyDate }); setPendingAssemblyDate(null); }}
        />
      )}
      <details className="card group p-4 sm:p-6">
        <summary className="cursor-pointer list-none text-base font-medium text-stone-800 marker:hidden">
          <span className="flex items-center justify-between">Add more details <Icon name="chevron" className="h-5 w-5 text-stone-400 transition-transform group-open:rotate-180" /></span>
        </summary>
        <div className="mt-6 space-y-8">
      <Section title="Service details">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Presider"><input className="input" value={a.presider} onChange={(event) => set({ presider: event.target.value })} /></Field>
          <Field label="Opening prayer leader"><input className="input" value={a.prayerLeader} onChange={(event) => set({ prayerLeader: event.target.value })} /></Field>
          <Field label="Worship leader"><input className="input" value={a.worshipLeader} onChange={(event) => set({ worshipLeader: event.target.value })} /></Field>
        </div>
        <Field label="Activity type"><input className="input" value={a.activity} onChange={(event) => set({ activity: event.target.value })} /></Field>
        <Field label="Theme"><input className="input" value={a.theme} onChange={(event) => set({ theme: event.target.value })} /></Field>
        {a.assignments.map((assignment) => (
          <div key={assignment.id} className="flex gap-2">
            <input className="input" aria-label="Role" placeholder="Role" value={assignment.role} onChange={(event) => set({ assignments: a.assignments.map((item) => item.id === assignment.id ? { ...item, role: event.target.value } : item) })} />
            <input className="input" aria-label="Name" placeholder="Name" value={assignment.name} onChange={(event) => set({ assignments: a.assignments.map((item) => item.id === assignment.id ? { ...item, name: event.target.value } : item) })} />
            <IconButton icon="close" label="Remove assignment" danger onClick={() => set({ assignments: a.assignments.filter((item) => item.id !== assignment.id) })} />
          </div>
        ))}
        <button className="btn" onClick={() => set({ assignments: [...a.assignments, { id: uid(), role: "", name: "" }] })}>+ Add assignment</button>
      </Section>
      {a.slides && <p role="status" className="rounded-xl border border-amber-500 p-3 text-sm text-amber-700">Changing content will regenerate slides and discard manual slide edits.</p>}
      <Section title="Sections" hint="Optional slides to include.">
        <div className="flex flex-wrap gap-6">
          <Check label="Welcome slide" checked={a.includeWelcome} onChange={(v) => set({ includeWelcome: v })} />
          <Check label="Theme slide" checked={a.includeTheme} onChange={(v) => set({ includeTheme: v })} />
          <Check label="Closing prayer" checked={a.includeClosing} onChange={(v) => set({ includeClosing: v })} />
        </div>
      </Section>

      <section className="card min-w-0 space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="display text-2xl text-stone-900">Gospel Reading</h2>
            <p className="text-sm text-stone-500">Daily reading · World English Bible</p>
          </div>
          <label className="text-sm text-stone-500">
            Reading date
            <input type="date" aria-label="Gospel reading date" className="input mt-1 !w-auto" value={gospel.date} onChange={(e) => changeGospelDate(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Check label="Include Gospel reading" checked={gospel.include} onChange={(include) => set({ gospel: { ...a.gospel, include } })} />
          {a.gospel?.date && <button className="btn btn-ghost" onClick={() => changeGospelDate("")}>Use assembly date</button>}
        </div>
        {gospel.custom && <p className="text-xs text-stone-500">Your edits are preserved when the assembly date changes.</p>}
        {gospel.error && <p role="status" className="text-sm text-amber-700">{gospel.error}</p>}
        {!gospel.custom && gospel.partial && <p className="text-xs text-stone-500">Where the reference specifies part of a verse, the full verse is included.</p>}
        {!gospel.custom && gospel.missingVerses && <p role="status" className="text-sm text-amber-700">This translation skips a verse number in the selected passage. Review the text and edit it if needed.</p>}
        {!gospel.custom && /\s+or\s+/i.test(gospel.reference) && <p className="text-xs text-stone-500">The first reading option is shown; you can edit it below.</p>}
        <Field label="Reference">
          <input className="input" value={gospel.reference} onChange={(e) => set({ gospel: { ...a.gospel, reference: e.target.value, text: gospel.text } })} />
        </Field>
        <Field label="Reading text">
          <textarea className="input h-56" value={gospel.text} onChange={(e) => set({ gospel: { ...a.gospel, reference: gospel.reference, text: e.target.value } })} />
        </Field>
        {gospel.custom && <button className="btn" onClick={() => setPendingGospelDate(a.gospel?.date ?? "")}>Restore daily reading</button>}
      </section>
      {pendingGospelDate !== null && <ConfirmDialog title="Replace edited reading?" message="Your edits to the Gospel reference and text will be replaced by the daily reading for the selected date." confirmLabel="Replace reading" onCancel={() => setPendingGospelDate(null)} onConfirm={() => { loadGospelDate(pendingGospelDate); setPendingGospelDate(null); }} />}

      <Section title="Prayer texts" hint={a.prayerLeader ? `Opening prayer led by ${a.prayerLeader}` : undefined}>
        <Field label="Prayer text (optional)">
          <textarea className="input h-24" value={a.openingPrayerText} onChange={(e) => set({ openingPrayerText: e.target.value })} />
        </Field>
        {a.includeClosing && (
          <Field label="Closing prayer text (optional)">
            <textarea className="input h-24" value={a.closingPrayerText} onChange={(e) => set({ closingPrayerText: e.target.value })} />
          </Field>
        )}
      </Section>

      <Section title="Announcements">
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

        </div>
      </details>
    </div>
  );
}
