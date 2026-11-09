"use client";
import { useState } from "react";
import { uid } from "@/lib/store";
import { BACKGROUND_COLOR_OPTIONS, BLANK_TEMPLATE_ID, DEFAULT_FONT, FONTS, TEMPLATES, getTemplate, presentationTemplate } from "@/lib/templates";
import { IconButton } from "./Icon";
import { Field, Section, type TabProps } from "./ui";
import { SlideView } from "./SlideView";
import { usePreferredFont } from "@/lib/assemblies";
import { ConfirmDialog } from "./Modal";
import { shrinkImage } from "@/lib/image";
import type { LogoPlacement } from "@/lib/types";

export function DetailsTab({ a, update }: TabProps) {
  const [, setPreferredFont] = usePreferredFont();
  const [fontError, setFontError] = useState("");
  const [logoError, setLogoError] = useState("");
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const selectedBackgroundColor = presentationTemplate(BLANK_TEMPLATE_ID, a.backgroundColor).bg;
  const uploadLogo = async (file: File) => {
    setLogoError("");
    try {
      const bitmap = await createImageBitmap(file);
      const aspect = bitmap.width / bitmap.height;
      bitmap.close();
      let width = 0.14;
      let height = width / aspect;
      if (height > 0.18) {
        height = 0.18;
        width = height * aspect;
      }
      const data = await shrinkImage(file, 640, "image/png");
      update({ logo: { data, width, height, x: 0.97 - width, y: 0.97 - height } satisfies LogoPlacement });
    } catch (error) {
      setLogoError(`Could not load the logo: ${error instanceof Error ? error.message : "unknown error"}.`);
    }
  };
  const resizeLogo = (width: number) => {
    if (!a.logo) return;
    const height = width * a.logo.height / a.logo.width;
    update({
      logo: {
        ...a.logo,
        width,
        height,
        x: Math.min(a.logo.x, 1 - width),
        y: Math.min(a.logo.y, 1 - height),
      },
    });
  };
  return (
    <div className="space-y-8">
      <Section title="Assembly">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title"><input className="input" value={a.title} onChange={(e) => update({ title: e.target.value })} /></Field>
          <Field label="Activity type"><input className="input" value={a.activity} onChange={(e) => update({ activity: e.target.value })} /></Field>
          <Field label="Date"><input type="date" className="input" value={a.date} onChange={(e) => {
            if (a.slides) setPendingDate(e.target.value);
            else update({ date: e.target.value });
          }} /></Field>
          <Field label="Theme (optional)"><input className="input" value={a.theme} onChange={(e) => update({ theme: e.target.value })} /></Field>
        </div>
      </Section>
      {pendingDate !== null && <ConfirmDialog title="Change assembly date?" message="Slides will be regenerated for the new date, and manual slide edits will be lost. Custom Gospel text will be kept." confirmLabel="Change date" onCancel={() => setPendingDate(null)} onConfirm={() => { update({ date: pendingDate, slides: null }); setPendingDate(null); }} />}

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

      <Section title="Logo" hint="A discreet logo is included on every slide. Move it in the Review slide preview.">
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn cursor-pointer">
            {a.logo ? "Change logo" : "Upload logo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Upload presentation logo"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadLogo(file);
                event.target.value = "";
              }}
            />
          </label>
          {a.logo && <button className="btn btn-ghost" onClick={() => update({ logo: undefined })}>Remove logo</button>}
        </div>
        {a.logo && (
          <Field label="Logo size">
            <input
              type="range"
              min="0.05"
              max={Math.min(0.3, 0.18 * a.logo.width / a.logo.height)}
              step="0.005"
              aria-label="Logo size"
              value={a.logo.width}
              onChange={(event) => resizeLogo(Number(event.target.value))}
              className="w-full max-w-sm accent-accent"
            />
          </Field>
        )}
        {logoError && <p role="alert" className="text-sm text-red-600">{logoError}</p>}
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
              <SlideView template={presentationTemplate(t.id, a.backgroundColor)} font={a.font} slide={{ id: t.id, kind: "welcome", title: t.name, body: "Prayer Assembly" }} />
              <span className="mt-1 block text-center text-sm">{t.name}</span>
            </button>
          ))}
        </div>
        {a.templateId === BLANK_TEMPLATE_ID && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-stone-700">Slide background color</p>
            <div className="flex flex-wrap gap-2">
              {BACKGROUND_COLOR_OPTIONS.map(({ name, color }) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`${name} background`}
                  aria-pressed={selectedBackgroundColor === color}
                  onClick={() => update({ backgroundColor: color })}
                  className={`h-9 w-9 rounded-full border border-stone-300 transition ${selectedBackgroundColor === color ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : "hover:scale-105"}`}
                  title={name}
                  style={{ backgroundColor: `#${color}` }}
                />
              ))}
              <label className="flex items-center gap-2 text-sm text-stone-500">
                Custom
                <input
                  type="color"
                  aria-label="Custom slide background color"
                  value={`#${selectedBackgroundColor}`}
                  onChange={(e) => update({ backgroundColor: e.target.value.slice(1).toUpperCase() })}
                  className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                />
              </label>
            </div>
            <p className="text-xs text-stone-500">The selected color is used on every slide. Text color adjusts automatically for contrast.</p>
          </div>
        )}
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
