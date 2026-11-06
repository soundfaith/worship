"use client";
import { useEffect, useState } from "react";
import { exportPptx } from "@/lib/export";
import { buildSlides } from "@/lib/slides";
import { uid } from "@/lib/store";
import { getTemplate, TEMPLATES } from "@/lib/templates";
import type { LayoutName, Slide } from "@/lib/types";
import { IconButton } from "./Icon";
import { SlideView } from "./SlideView";
import type { TabProps } from "./ui";

// Downscale uploads so saved assemblies stay small enough for browser storage.
async function shrinkImage(file: File, max = 1280): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
}

export function ReviewTab({ a, update }: TabProps) {
  const [cur, setCur] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!a.slides) update({ slides: buildSlides(a) });
  }, [a, update]);

  const slides = a.slides ?? [];
  const idx = Math.min(cur, Math.max(0, slides.length - 1));
  const slide = slides[idx];
  const setSlides = (s: Slide[]) => update({ slides: s });
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
              try { await exportPptx(a); } finally { setBusy(false); }
            }}
          >
            {busy ? "Exporting…" : "Export PowerPoint"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-4">
          <SlideView slide={slide} template={tpl(slide)} />
          <div className="card space-y-4 p-5">
            <input className="input" aria-label="Slide title" value={slide.title} onChange={(e) => patch({ title: e.target.value })} />
            <textarea className="input h-36" aria-label="Slide text" value={slide.body} onChange={(e) => patch({ body: e.target.value })} />
            {(slide.kind === "custom" || slide.layout === "image") && (
              <div className="flex items-center gap-3 text-sm text-stone-600">
                <label className="btn cursor-pointer">
                  {slide.image ? "Change image" : "Add image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) patch({ image: await shrinkImage(f) });
                      e.target.value = "";
                    }}
                  />
                </label>
                {slide.image && <button className="btn btn-ghost" onClick={() => patch({ image: undefined })}>Remove image</button>}
                <span className="text-xs text-stone-400">Uses the template’s image layout.</span>
              </div>
            )}
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
                  {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              {tpl(slide).layouts && (
                <label className="text-sm text-stone-500">
                  Page layout{" "}
                  <select
                    className="input !inline-block !w-auto"
                    value={slide.layout ?? ""}
                    onChange={(e) => patch({ layout: (e.target.value || undefined) as Slide["layout"] })}
                  >
                    <option value="">Auto</option>
                    {(Object.keys(tpl(slide).layouts!) as LayoutName[]).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              )}
              <span className="flex-1" />
              <IconButton icon="trash" label="Remove slide" danger onClick={() => setSlides(slides.filter((_, i) => i !== idx))} />
            </div>
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
                <SlideView slide={s} template={tpl(s)} />
                <span className="block px-1 pt-1 text-xs text-stone-500">{i + 1}. {s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
