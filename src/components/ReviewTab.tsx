"use client";
import { useEffect, useRef, useState } from "react";
import { exportPptx } from "@/lib/export";
import { buildSlides } from "@/lib/slides";
import { uid } from "@/lib/store";
import { backgroundFor, FONTS, getTemplate, LAYOUT_OPTIONS, layoutFor, TEMPLATES } from "@/lib/templates";
import type { LayoutName, Slide } from "@/lib/types";
import { IconButton } from "./Icon";
import { SlideView } from "./SlideView";
import type { TabProps } from "./ui";

const NO_SLIDES: Slide[] = [];

// Downscale uploads so saved assemblies stay small enough for browser storage.
async function shrinkImage(file: File, max = 1280): Promise<string> {
  const bmp = await createImageBitmap(file);
  try {
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Cannot process this image.");
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  } finally {
    bmp.close();
  }
}

export function ReviewTab({ a, update }: TabProps) {
  const [cur, setCur] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const latestSlides = useRef<Slide[]>(a.slides ?? []);

  useEffect(() => {
    if (!a.slides) update({ slides: buildSlides(a) });
  }, [a, update]);

  const slides = a.slides ?? NO_SLIDES;
  useEffect(() => { latestSlides.current = slides; }, [slides]);
  const idx = Math.min(cur, Math.max(0, slides.length - 1));
  const slide = slides[idx];
  const setSlides = (s: Slide[]) => {
    update({ slides: s });
    latestSlides.current = s;
  };
  const patch = (p: Partial<Slide>) => setSlides(slides.map((x, i) => (i === idx ? { ...x, ...p } : x)));
  const move = (d: number) => {
    const j = idx + d;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[idx], next[j]] = [next[j], next[idx]];
    setSlides(next);
    setCur(j);
  };
  const tpl = (s: Slide) => getTemplate(a.sectionTemplates[s.kind] ?? a.templateId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT") return;
      if (e.key === "ArrowRight") setCur((c) => Math.min(c + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setCur((c) => Math.max(c - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length]);

  if (!slide) return <p className="text-stone-500">No slides yet. Add songs or content first.</p>;
  const currentTemplate = tpl(slide);
  const currentLayout = layoutFor(currentTemplate, slide)?.layout;
  const currentBackground = backgroundFor(currentTemplate, slide);

  const upload = async (file: File, field: "image" | "image2", slideId: string) => {
    setError("");
    try {
      const data = await shrinkImage(file);
      setSlides(latestSlides.current.map((item) => item.id === slideId ? { ...item, [field]: data } : item));
    } catch (e) {
      setError(`Could not save the image: ${e instanceof Error ? e.message : "unknown error"}. Your browser may have run out of storage.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">Slide {idx + 1} of {slides.length} · use ← → to navigate</p>
        <div className="flex gap-2">
          <button className="btn" onClick={() => confirm("Regenerate all slides? Manual edits will be lost.") && update({ slides: null })}>Regenerate</button>
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try { await exportPptx(a); } catch (e) {
                setError(`Export failed: ${e instanceof Error ? e.message : "unknown error"}`);
              } finally { setBusy(false); }
            }}
          >
            {busy ? "Exporting…" : "Export PowerPoint"}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-500 p-3 text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-4">
          <SlideView slide={slide} template={currentTemplate} font={a.font} />
          <div className="card space-y-4 p-5">
            <input className="input" aria-label="Slide title" value={slide.title} onChange={(e) => patch({ title: e.target.value })} />
            <textarea className="input h-36" aria-label="Slide text" value={slide.body} onChange={(e) => patch({ body: e.target.value })} />
            {currentLayout?.hideBody && slide.body && <p className="text-xs text-stone-500">This layout hides the slide text; it is preserved if you switch layouts.</p>}
            {[{ field: "image" as const, rect: currentLayout?.image, label: "Image 1" }, { field: "image2" as const, rect: currentLayout?.image2, label: "Image 2" }].filter((item) => item.rect).map(({ field, label }) => (
              <div key={field} className="flex flex-wrap items-center gap-3 text-sm text-stone-600">
                <label className="btn cursor-pointer">
                  {slide[field] ? `Change ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}
                  <input type="file" accept="image/*" aria-label={`Upload ${label.toLowerCase()}`} className="sr-only" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file, field, slide.id);
                    e.target.value = "";
                  }} />
                </label>
                {slide[field] && <button className="btn btn-ghost" onClick={() => patch({ [field]: undefined })}>Remove {label.toLowerCase()}</button>}
              </div>
            ))}
            {!currentLayout?.image && (slide.image || slide.image2) && <p className="text-xs text-stone-500">Images are preserved but hidden in this layout.</p>}
            {currentLayout?.image && !currentLayout.image2 && slide.image2 && <p className="text-xs text-stone-500">Image 2 is preserved but hidden in this layout.</p>}
            <div className="flex flex-wrap items-center gap-2">
              <IconButton icon="up" label="Move slide earlier" disabled={idx === 0} onClick={() => move(-1)} />
              <IconButton icon="down" label="Move slide later" disabled={idx === slides.length - 1} onClick={() => move(1)} />
              <label className="ml-2 text-sm text-stone-500">
                Template for “{slide.kind}” slides{" "}
                <select
                  className="input !inline-block !w-auto"
                  value={a.sectionTemplates[slide.kind] ?? ""}
                  onChange={(e) => update({ sectionTemplates: { ...a.sectionTemplates, [slide.kind]: e.target.value || undefined } })}
                >
                  <option value="">Assembly default</option>
                  {a.sectionTemplates[slide.kind] && !TEMPLATES.some((t) => t.id === a.sectionTemplates[slide.kind]) && <option value={a.sectionTemplates[slide.kind]}>Unavailable template (using {currentTemplate.name})</option>}
                  {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              {currentTemplate.backgrounds?.length ? (
                <label className="text-sm text-stone-500">
                  Content layout{" "}
                  <select
                    className="input !inline-block !w-auto"
                    value={slide.layout ?? ""}
                    onChange={(e) => patch({ layout: (e.target.value || undefined) as Slide["layout"] })}
                  >
                    <option value="">Auto</option>
                    {LAYOUT_OPTIONS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </label>
              ) : currentTemplate.layouts && (
                <label className="text-sm text-stone-500">Page layout{" "}
                  <select className="input !inline-block !w-auto" value={slide.layout ?? ""} onChange={(e) => patch({ layout: (e.target.value || undefined) as LayoutName | undefined })}>
                    <option value="">Auto</option>
                    {(Object.keys(currentTemplate.layouts) as LayoutName[]).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              )}
              <label className="text-sm text-stone-500">Slide font{" "}
                <select className="input !inline-block !w-auto" value={slide.font ?? ""} onChange={(e) => patch({ font: e.target.value || undefined })}>
                  <option value="">Presentation default</option>
                  {FONTS.map((font) => <option key={font} value={font}>{font}</option>)}
                </select>
              </label>
              {currentTemplate.backgrounds?.length ? <label className="flex items-center gap-2 text-sm text-stone-500">Text color
                <input type="color" aria-label="Slide text color" value={`#${slide.textColor ?? currentTemplate.fg}`} onChange={(e) => patch({ textColor: e.target.value.slice(1).toUpperCase() })} />
                {slide.textColor && <button className="btn btn-ghost" onClick={() => patch({ textColor: undefined })}>Reset</button>}
              </label> : null}
              {slides.filter((item) => item.kind === slide.kind).length > 1 && <button className="btn btn-ghost" onClick={() => setSlides(slides.map((item) => item.kind === slide.kind ? { ...item, layout: slide.layout, background: slide.background, font: slide.font, textColor: slide.textColor } : item))}>Apply design to all {slide.kind} slides</button>}
              <span className="flex-1" />
              <IconButton icon="trash" label="Remove slide" danger onClick={() => setSlides(slides.filter((_, i) => i !== idx))} />
            </div>
            {!!currentTemplate.backgrounds?.length && (
              <section className="card space-y-4 p-5" aria-label="Slide backgrounds">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="display text-2xl">Background</h3>
                    <p className="text-sm text-stone-500">Choose artwork independently of the content layout.</p>
                    {slide.background && (slide.background.templateId !== currentTemplate.id || !currentTemplate.backgrounds.some((b) => b.id === slide.background?.id)) && <p className="text-sm text-amber-700">The saved background is unavailable for this template; the automatic background is shown.</p>}
                  </div>
                  <button className="btn btn-ghost" onClick={() => patch({ background: undefined })}>Use automatic</button>
                </div>
                <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                  {currentTemplate.backgrounds.map((background) => (
                    <button key={background.id} type="button" aria-label={`Use ${background.name} background`} aria-pressed={currentBackground?.id === background.id} onClick={() => patch({ background: { templateId: currentTemplate.id, id: background.id } })} className={`rounded-xl p-1 text-left ${currentBackground?.id === background.id ? "ring-2 ring-accent" : "ring-1 ring-stone-200 hover:ring-accent"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${currentTemplate.dir}/${background.src}`} alt="" loading="lazy" className="aspect-video w-full rounded-lg object-cover" />
                      <span className="block p-1 text-xs text-stone-600">{background.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
          <button
            className="btn"
            onClick={() => {
              const s: Slide = { id: uid(), kind: "custom", title: "Custom", body: "" };
              setSlides([...slides.slice(0, idx + 1), s, ...slides.slice(idx + 1)]);
              setCur(idx + 1);
            }}
          >
            + Add custom slide after this
          </button>
        </div>

        <ol className="max-h-[40rem] space-y-2 overflow-y-auto pr-1">
          {slides.map((s, i) => (
            <li key={s.id}>
              <button
                onClick={() => setCur(i)}
                aria-current={i === idx}
                className={`block w-full rounded-xl p-1 text-left transition ${i === idx ? "ring-2 ring-accent" : "hover:ring-1 hover:ring-stone-300"}`}
              >
                <SlideView slide={s} template={tpl(s)} font={a.font} />
                <span className="block px-1 pt-1 text-xs text-stone-500">{i + 1}. {s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
