"use client";
import { useState } from "react";
import { uid } from "@/lib/store";
import { DEFAULT_FONT, FONTS, TEMPLATES, getTemplate } from "@/lib/templates";
import { IconButton } from "./Icon";
import { Field, Section, type TabProps } from "./ui";
import { SlideView } from "./SlideView";
import { usePreferredFont } from "@/lib/assemblies";

export function DetailsTab({ a, update }: TabProps) {
  const [, setPreferredFont] = usePreferredFont();
  const [fontError, setFontError] = useState("");
  return (
    <div className="space-y-8">
      <Section title="Assembly">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title"><input className="input" value={a.title} onChange={(e) => update({ title: e.target.value })} /></Field>
          <Field label="Activity type"><input className="input" value={a.activity} onChange={(e) => update({ activity: e.target.value })} /></Field>
          <Field label="Date"><input type="date" className="input" value={a.date} onChange={(e) => update({ date: e.target.value })} /></Field>
          <Field label="Theme (optional)"><input className="input" value={a.theme} onChange={(e) => update({ theme: e.target.value })} /></Field>
        </div>
      </Section>

      <Section title="Service assignments">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Presiding brother/sister"><input className="input" value={a.presider} onChange={(e) => update({ presider: e.target.value })} /></Field>
          <Field label="Opening prayer leader"><input className="input" value={a.prayerLeader} onChange={(e) => update({ prayerLeader: e.target.value })} /></Field>
          <Field label="Worship leader"><input className="input" value={a.worshipLeader} onChange={(e) => update({ worshipLeader: e.target.value })} /></Field>
        </div>
        {a.assignments.map((x) => (
          <div key={x.id} className="flex gap-2">
            <input className="input" placeholder="Role" aria-label="Role" value={x.role} onChange={(e) => update({ assignments: a.assignments.map((y) => (y.id === x.id ? { ...y, role: e.target.value } : y)) })} />
            <input className="input" placeholder="Name" aria-label="Name" value={x.name} onChange={(e) => update({ assignments: a.assignments.map((y) => (y.id === x.id ? { ...y, name: e.target.value } : y)) })} />
            <IconButton icon="close" label="Remove assignment" danger onClick={() => update({ assignments: a.assignments.filter((y) => y.id !== x.id) })} />
          </div>
        ))}
        <button className="btn" onClick={() => update({ assignments: [...a.assignments, { id: uid(), role: "", name: "" }] })}>+ Add assignment</button>
      </Section>

      <Section title="Template" hint="Applies to the whole presentation. You can override per section when reviewing.">
        {!TEMPLATES.some((t) => t.id === a.templateId) && <p className="text-sm text-amber-700">The saved template is no longer available. {getTemplate(a.templateId).name} will be used until you select a template.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => update({ templateId: t.id })}
              aria-pressed={a.templateId === t.id}
              className={`rounded-xl p-1.5 text-left transition ${a.templateId === t.id ? "ring-2 ring-accent" : "ring-1 ring-transparent hover:ring-stone-300"}`}
            >
              <SlideView template={t} font={a.font} slide={{ id: t.id, kind: "welcome", title: t.name, body: "Prayer Assembly" }} />
              <span className="mt-1 block text-center text-sm">{t.name}</span>
            </button>
          ))}
        </div>
        <Field label="Presentation font">
          <select className="input max-w-xs" value={a.font ?? DEFAULT_FONT} onChange={(e) => {
            const font = e.target.value;
            update({ font });
            try { setPreferredFont(font); setFontError(""); } catch { setFontError("Could not save your default font in this browser."); }
          }}>
            {FONTS.map((font) => <option key={font} value={font}>{font}</option>)}
          </select>
        </Field>
        {fontError && <p role="alert" className="text-sm text-red-600">{fontError}</p>}
        <p className="text-xs text-stone-500">For PowerPoint to display your chosen font, install it on the presenting computer.</p>
      </Section>
    </div>
  );
}
