"use client";
import { useState } from "react";
import { BACKGROUND_COLOR_OPTIONS, BLANK_TEMPLATE_ID, FONTS, TEMPLATES, getTemplate, presentationTemplate } from "@/lib/templates";
import { Section, type TabProps } from "./ui";
import { SlideView } from "./SlideView";
import { useLogoPreference, usePreferredFont } from "@/lib/assemblies";
import { shrinkImage } from "@/lib/image";
import type { LogoPlacement } from "@/lib/types";

export function DetailsTab({ a, update }: TabProps) {
  const [, setPreferredFont] = usePreferredFont();
  const [logoPreference, setLogoPreference] = useLogoPreference();
  const [error, setError] = useState("");
  const selectedBackgroundColor = presentationTemplate(BLANK_TEMPLATE_ID, a.backgroundColor).bg;

  const updateLogo = (logo: LogoPlacement | undefined) => {
    update({ logo, showLogo: logo ? (a.showLogo ?? true) : false });
    setLogoPreference(logo ?? null);
  };
  const uploadLogo = async (file: File) => {
    setError("");
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
      const logo = { data: await shrinkImage(file, 640, "image/png"), width, height, x: 0.97 - width, y: 0.97 - height };
      updateLogo(logo);
    } catch (cause) {
      setError(`Could not load the logo: ${cause instanceof Error ? cause.message : "unknown error"}.`);
    }
  };

  const resizeLogo = (width: number) => {
    if (!a.logo) return;
    const logo = { ...a.logo, width, height: width * a.logo.height / a.logo.width };
    update({ logo });
    setLogoPreference(logo);
  };

  const maxLogoWidth = a.logo
    ? Math.max(0.02, Math.min(1.9, 1.9 * a.logo.width / a.logo.height))
    : 0.14;

  return (
    <div className="space-y-8">
      <Section title="Choose a template">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="min-w-0 space-y-4">
            {!TEMPLATES.some((template) => template.id === a.templateId) && (
              <p className="text-sm text-amber-700">{getTemplate(a.templateId).name} is unavailable. Choose another design.</p>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => update({ templateId: template.id })}
                  aria-pressed={a.templateId === template.id}
                  className={`rounded-xl p-2 text-left transition ${a.templateId === template.id ? "ring-2 ring-accent" : "ring-1 ring-stone-200 hover:ring-accent"}`}
                >
                  <SlideView
                    template={presentationTemplate(template.id, a.backgroundColor)}
                    font={a.font}
                    slide={{ id: template.id, kind: "welcome", title: template.name, body: a.title || "Prayer Assembly" }}
                  />
                  <span className="mt-1 block text-center text-sm">{template.name}</span>
                </button>
              ))}
            </div>
            {a.templateId === BLANK_TEMPLATE_ID && (
              <div className="space-y-3 border-t border-stone-200 pt-4">
                <p className="text-sm font-medium text-stone-700">Background color</p>
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
                      onChange={(event) => update({ backgroundColor: event.target.value.slice(1).toUpperCase() })}
                      className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          <aside className="min-w-0 space-y-4 border-t border-stone-200 pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <h3 className="display text-xl text-stone-900">Logo</h3>
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn cursor-pointer">
                {a.logo ? "Replace logo" : "Add logo"}
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
              {a.logo && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={a.showLogo !== false}
                    onChange={(event) => update({ showLogo: event.target.checked })}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  Show on slides
                </label>
              )}
              {a.logo && <button className="btn btn-ghost" onClick={() => updateLogo(undefined)}>Remove</button>}
            </div>
            {a.logo && (
              <div className="space-y-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.logo.data} alt="Uploaded presentation logo" className="h-20 max-w-40 rounded border border-stone-200 object-contain p-2" />
                <label className="block max-w-48 text-sm">
                  Size
                  <input
                    type="range"
                    min="0.02"
                    max={maxLogoWidth}
                    step="0.005"
                    aria-label="Logo size"
                    value={a.logo.width}
                    onChange={(event) => resizeLogo(Number(event.target.value))}
                    className="mt-1 block w-full accent-accent"
                  />
                </label>
              </div>
            )}
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            {!a.logo && logoPreference && <p className="text-xs text-stone-500">Your saved logo will be used in new assemblies.</p>}
          </aside>
        </div>
      </Section>

      <Section title="Presentation font">
        <select
          className="input max-w-sm"
          value={a.font ?? ""}
          onChange={(event) => {
            const font = event.target.value;
            update({ font });
            setPreferredFont(font);
          }}
        >
          <option value="">Use template fonts</option>
          {FONTS.map((font) => <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>)}
        </select>
      </Section>
    </div>
  );
}
