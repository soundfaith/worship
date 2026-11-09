"use client";
import { useEffect, useRef, useState } from "react";
import { buildSlides } from "@/lib/slides";
import { gospelForAssembly } from "@/lib/gospel";
import { GOSPEL_MIN_SIZE, readingFits } from "@/lib/layout";
import { uid } from "@/lib/store";
import { backgroundFor, FONTS, LAYOUT_OPTIONS, layoutFor, layoutNameFor, presentationTemplate, songIndexes, TEMPLATES } from "@/lib/templates";
import type { ImageProvider, LayoutName, PhotoSearchResult, Rect, Slide, Template } from "@/lib/types";
import { IconButton } from "./Icon";
import { SlideView } from "./SlideView";
import { ConfirmDialog } from "./Modal";
import type { TabProps } from "./ui";
import { shrinkImage } from "@/lib/image";

const NO_SLIDES: Slide[] = [];

export function ReviewTab({ a, update, exporting, onExport, exportError }: TabProps & {
  exporting: boolean;
  onExport: () => void;
  exportError: string;
}) {
  const [cur, setCur] = useState(0);
  const [error, setError] = useState("");
  const [regenerate, setRegenerate] = useState(false);
  const [imageQuery, setImageQuery] = useState("");
  const [imageProvider, setImageProvider] = useState<ImageProvider>("commons");
  const [imageProviders, setImageProviders] = useState<{ id: ImageProvider; label: string }[]>([]);
  const [libraryCategories, setLibraryCategories] = useState<string[]>([]);
  const [libraryCategory, setLibraryCategory] = useState("worship");
  const [imageResults, setImageResults] = useState<PhotoSearchResult[]>([]);
  const [imageNextCursor, setImageNextCursor] = useState<string | null>(null);
  const [imageSearching, setImageSearching] = useState(false);
  const [imageLoadingMore, setImageLoadingMore] = useState(false);
  const [imageDownloading, setImageDownloading] = useState("");
  const [imageError, setImageError] = useState("");
  const imageSearchId = useRef(0);
  const latestSlides = useRef<Slide[]>(a.slides ?? []);

  useEffect(() => {
    let active = true;
    fetch("/api/images?providers=1")
      .then(async (response) => {
        const data = await response.json() as {
          providers?: { id: ImageProvider; label: string }[];
          libraryCategories?: string[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? `Could not load photo providers (HTTP ${response.status}).`);
        if (!active) return;
        const providers = data.providers ?? [];
        setImageProviders(providers);
        const categories = data.libraryCategories ?? [];
        setLibraryCategories(categories);
        if (categories.length) {
          setLibraryCategory(categories[0]);
          setImageProvider("library");
        } else if (providers.some((provider) => provider.id === "unsplash")) {
          setImageProvider("unsplash");
        }
      })
      .catch((e: unknown) => {
        if (active) setImageError(e instanceof Error ? e.message : "Could not load photo providers.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!a.slides) update({ slides: buildSlides(a) });
  }, [a, update]);

  const slides = a.slides ?? NO_SLIDES;
  const songPositions = songIndexes(slides);
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
  const tpl = (s: Slide) => presentationTemplate(a.sectionTemplates[s.kind] ?? a.templateId, a.backgroundColor);
  const updateLogoPosition = (position: { x: number; y: number }) => {
    if (a.logo) update({ logo: { ...a.logo, ...position } });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("dialog") || t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "BUTTON" || t.isContentEditable) return;
      if (e.key === "ArrowRight") setCur((c) => Math.min(c + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setCur((c) => Math.max(c - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length]);

  if (!slide) return <p className="text-stone-500">No slides yet. Add songs or content first.</p>;
  const currentTemplate = tpl(slide);
  const currentLayout = layoutFor(currentTemplate, slide)?.layout;
  const currentBackground = backgroundFor(currentTemplate, slide, songPositions[idx]);
  const gospel = gospelForAssembly(a);

  const upload = async (file: File, field: "image" | "image2", slideId: string) => {
    setError("");
    try {
      const data = await shrinkImage(file);
      setSlides(latestSlides.current.map((item) => item.id === slideId ? { ...item, [field]: data } : item));
    } catch (e) {
      setError(`Could not save the image: ${e instanceof Error ? e.message : "unknown error"}. Your browser may have run out of storage.`);
    }
  };

  const searchImages = async (event?: React.FormEvent<HTMLFormElement>, cursor?: string, append = false) => {
    event?.preventDefault();
    setImageError("");
    const requestId = append ? imageSearchId.current : ++imageSearchId.current;
    if (append) setImageLoadingMore(true);
    else {
      setImageResults([]);
      setImageNextCursor(null);
      setImageSearching(true);
    }
    try {
      const params = new URLSearchParams({ provider: imageProvider });
      if (imageProvider === "library") params.set("category", libraryCategory);
      else params.set("q", imageQuery.trim());
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/images?${params}`);
      const data = await response.json() as { images?: PhotoSearchResult[]; nextCursor?: string | null; error?: string };
      if (!response.ok) throw new Error(data.error ?? `Image search failed (HTTP ${response.status}).`);
      if (requestId !== imageSearchId.current) return;
      setImageResults((results) => {
        const incoming = data.images ?? [];
        if (!append) return incoming;
        const existingIds = new Set(results.map((image) => image.id));
        return [...results, ...incoming.filter((image) => !existingIds.has(image.id))];
      });
      setImageNextCursor(data.nextCursor ?? null);
      if (!append && !data.images?.length) setImageError("No compatible images found. Try a different search.");
    } catch (e) {
      if (requestId === imageSearchId.current) setImageError(e instanceof Error ? e.message : "Image search failed.");
    } finally {
      if (requestId === imageSearchId.current) {
        setImageSearching(false);
        setImageLoadingMore(false);
      }
    }
  };

  const selectImage = async (image: PhotoSearchResult) => {
    setImageError("");
    setImageDownloading(image.id);
    const slideId = slide.id;
    try {
      const response = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(image.provider === "library"
          ? { provider: image.provider, id: image.id }
          : { provider: image.provider, url: image.thumbnailUrl, downloadUrl: image.downloadUrl }),
      });
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? `Image download failed (HTTP ${response.status}).`);
      }
      const data = await shrinkImage(await response.blob());
      setSlides(latestSlides.current.map((item) => item.id === slideId ? {
        ...item,
        background: undefined,
        backgroundImage: {
          data,
          title: image.title,
          artist: image.artist,
          license: image.license,
          licenseUrl: image.licenseUrl,
          sourceUrl: image.sourceUrl,
          providerLabel: image.providerLabel,
        },
      } : item));
      setImageResults([]);
      setImageQuery("");
    } catch (e) {
      setImageError(e instanceof Error ? e.message : "Could not save this image.");
    } finally {
      setImageDownloading("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">Slide {idx + 1} of {slides.length} · use ← → to navigate</p>
        <div className="flex gap-2">
          <button className="btn" onClick={() => setRegenerate(true)}>Regenerate</button>
          <button
            className="btn btn-primary"
            disabled={exporting}
            onClick={onExport}
          >
            {exporting ? "Exporting…" : "Export PowerPoint"}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-500 p-3 text-sm text-red-600">{error}</p>}
      {exportError && <p role="alert" className="rounded-xl border border-red-500 p-3 text-sm text-red-600">{exportError}</p>}
      {gospel.include && !gospel.text.trim() && <p role="status" className="rounded-xl border border-amber-500 p-3 text-sm text-amber-700">No Gospel text is available for the selected date. Add a reading or turn it off in Content.</p>}
      {regenerate && <ConfirmDialog title="Regenerate slides?" message="All manual slide edits will be lost. This cannot be undone." confirmLabel="Regenerate" onCancel={() => setRegenerate(false)} onConfirm={() => { setRegenerate(false); update({ slides: null }); }} />}

      <div className="flex h-[calc(100dvh-5rem)] min-h-[22rem] min-w-0 gap-2 sm:gap-4">
        <nav aria-label="Slide navigation" tabIndex={0} className="w-16 shrink-0 overflow-y-auto px-1 py-1 sm:w-32 lg:w-44">
          <ol className="space-y-2">
            {slides.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-label={`Slide ${i + 1}: ${s.title || "Untitled"}`}
                  onClick={() => setCur(i)}
                  aria-current={i === idx ? "true" : undefined}
                  className={`block w-full rounded-xl p-1 text-left transition ${i === idx ? "ring-2 ring-accent" : "hover:ring-1 hover:ring-stone-300"}`}
                >
                  <SlideView slide={s} template={tpl(s)} font={a.font} songIndex={songPositions[i]} logo={a.logo} />
                  <span className="block truncate px-1 pt-1 text-xs text-stone-500">{i + 1}. <span className="hidden sm:inline">{s.title}</span></span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div className="mx-auto w-full max-w-xl shrink-0">
            <SlideView
              slide={slide}
              template={currentTemplate}
              font={a.font}
              songIndex={songPositions[idx]}
              logo={a.logo}
              onLogoPositionChange={a.logo ? updateLogoPosition : undefined}
            />
            {a.logo && <p className="mt-1 text-center text-xs text-stone-500">Drag the logo to reposition it across all slides. Arrow keys also work when focused.</p>}
          </div>
          <div aria-label="Slide editing tools" tabIndex={0} className="min-h-0 min-w-0 flex-1 overflow-y-auto pr-1">
          <div className="card min-w-0 space-y-4 p-3 sm:p-5">
            <input className="input" aria-label="Slide title" value={slide.title} onChange={(e) => patch({ title: e.target.value })} />
            <textarea className="input h-36" aria-label="Slide text" value={slide.body} onChange={(e) => patch({ body: e.target.value })} />
            {slide.kind === "gospel" && currentLayout && !currentLayout.hideBody && !readingFits(currentLayout.body, slide.body, GOSPEL_MIN_SIZE) && <p role="status" className="text-sm text-amber-700">This reading may not fit at the minimum readable font size. Shorten it or choose a larger text layout.</p>}
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
              {slides.filter((item) => item.kind === slide.kind).length > 1 && <button className="btn btn-ghost" onClick={() => setSlides(slides.map((item) => item.kind === slide.kind ? { ...item, layout: slide.layout, background: slide.background, backgroundImage: slide.backgroundImage, font: slide.font, textColor: slide.textColor } : item))}>Apply design to all {slide.kind} slides</button>}
              <span className="flex-1" />
              <IconButton icon="trash" label="Remove slide" danger onClick={() => setSlides(slides.filter((_, i) => i !== idx))} />
            </div>
            {!!currentTemplate.layouts && (
              <section className="space-y-3" aria-label="Content layouts">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><h3 className="display text-2xl">Content layout</h3><p className="text-sm text-stone-500">Choose how text and images are arranged.</p></div>
                  <button className="btn btn-ghost" onClick={() => patch({ layout: undefined })}>Use automatic</button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {LAYOUT_OPTIONS.map(({ id, label }) => (
                    <button key={id} type="button" aria-label={`${label} layout`} aria-pressed={layoutNameFor(slide) === id} onClick={() => patch({ layout: id })} className={`h-full rounded-xl p-1 text-left ${layoutNameFor(slide) === id ? "ring-2 ring-accent" : "ring-1 ring-stone-200 hover:ring-accent"}`}>
                      <LayoutDiagram template={currentTemplate} slide={slide} layout={id} />
                      <span className="line-clamp-2 h-10 p-1 text-xs text-stone-600">{label}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {!!currentTemplate.backgrounds?.length && !slide.backgroundImage && (
              <section className="space-y-4" aria-label="Slide backgrounds">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="display text-2xl">Background</h3>
                    <p className="text-sm text-stone-500">Choose artwork independently of the content layout.</p>
                    {slide.background && (slide.background.templateId !== currentTemplate.id || !currentTemplate.backgrounds.some((b) => b.id === slide.background?.id)) && <p className="text-sm text-amber-700">The saved background is unavailable for this template; the automatic background is shown.</p>}
                  </div>
                  <button className="btn btn-ghost" onClick={() => patch({ background: undefined })}>Use automatic</button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {currentTemplate.backgrounds.map((background) => (
                    <button key={background.id} type="button" aria-label={`Use ${background.name} background`} aria-pressed={currentBackground?.id === background.id} onClick={() => patch({ background: { templateId: currentTemplate.id, id: background.id } })} className={`h-full rounded-xl p-1 text-left ${currentBackground?.id === background.id ? "ring-2 ring-accent" : "ring-1 ring-stone-200 hover:ring-accent"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${currentTemplate.dir}/${background.src}`} alt="" loading="lazy" className="aspect-video w-full rounded-lg object-cover" />
                      <span className="line-clamp-2 h-10 p-1 text-xs text-stone-600">{background.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section className="space-y-4" aria-label="Photo backgrounds">
              <div>
                <h3 className="display text-2xl">Photo background</h3>
                <p className="text-sm text-stone-500">Choose a free photo. Soft blur and a subtle overlay help text stay readable.</p>
              </div>
              {slide.backgroundImage && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-50 p-3 text-sm dark:bg-stone-900">
                  <p className="min-w-0 text-stone-600">
                    Using “{slide.backgroundImage.title}” by {slide.backgroundImage.artist} · {slide.backgroundImage.providerLabel ?? "Wikimedia Commons"} · {slide.backgroundImage.license}
                    {slide.backgroundImage.licenseUrl && <> · <a href={slide.backgroundImage.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">license</a></>}
                    {slide.backgroundImage.sourceUrl && <> · <a href={slide.backgroundImage.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">source</a></>}
                  </p>
                  <button className="btn btn-ghost" onClick={() => patch({ backgroundImage: undefined, background: undefined })}>Remove photo</button>
                </div>
              )}
              <form onSubmit={(event) => void searchImages(event)} className="flex flex-wrap gap-2">
                <label className="sr-only" htmlFor="photo-provider">Photo source</label>
                <select
                  id="photo-provider"
                  className="input !w-auto"
                  value={imageProvider}
                  onChange={(event) => {
                    imageSearchId.current++;
                    setImageProvider(event.target.value as ImageProvider);
                    setImageResults([]);
                    setImageNextCursor(null);
                    setImageError("");
                  }}
                  aria-label="Photo source"
                >
                  {imageProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
                </select>
                {imageProvider === "library" ? (
                  <>
                    <label className="sr-only" htmlFor="photo-category">Photo category</label>
                    <select
                      id="photo-category"
                      className="input !w-auto"
                      value={libraryCategory}
                      onChange={(event) => setLibraryCategory(event.target.value)}
                      aria-label="Photo category"
                    >
                      {libraryCategories.map((category) => (
                        <option key={category} value={category}>{category[0].toUpperCase() + category.slice(1)}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <input
                    className="input min-w-48 flex-1"
                    aria-label="Search photos"
                    placeholder="Search images…"
                    value={imageQuery}
                    onChange={(event) => setImageQuery(event.target.value)}
                    minLength={2}
                    maxLength={100}
                    required
                  />
                )}
                <button className="btn" type="submit" disabled={imageSearching || (imageProvider === "library" && !libraryCategories.length)}>
                  {imageSearching ? "Loading…" : imageProvider === "library" ? "Browse local photos" : "Search free images"}
                </button>
              </form>
              {imageError && <p role="alert" className="text-sm text-red-600">{imageError}</p>}
              {!imageProviders.some((provider) => provider.id === "unsplash") && !imageProviders.some((provider) => provider.id === "pexels") && (
                <p className="text-xs text-stone-500">
                  Want Unsplash or Pexels? Set <code>UNSPLASH_ACCESS_KEY</code> or <code>PEXELS_API_KEY</code> on the server to enable them.
                </p>
              )}
              {!!imageResults.length && (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {imageResults.map((image) => (
                    <li key={image.id}>
                      <button
                        type="button"
                        disabled={!!imageDownloading}
                        onClick={() => void selectImage(image)}
                        className="w-full rounded-xl border border-stone-200 p-2 text-left transition hover:border-accent disabled:opacity-60"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image.thumbnailUrl} alt="" loading="lazy" className="aspect-video w-full rounded-lg object-cover" />
                        <span className="mt-2 block truncate text-sm font-medium text-stone-800">{image.title}</span>
                        <span className="block truncate text-xs text-stone-500">{image.artist} · {image.providerLabel} · {image.license}</span>
                        {imageDownloading === image.id && <span className="mt-1 block text-xs text-accent">Saving image…</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {imageNextCursor && !!imageResults.length && (
                <button
                  type="button"
                  className="btn"
                  disabled={imageLoadingMore}
                  onClick={() => void searchImages(undefined, imageNextCursor, true)}
                >
                  {imageLoadingMore ? "Loading more…" : "Show more photos"}
                </button>
              )}
              <p className="text-xs text-stone-500">Images and their attribution are saved with this slide. License terms vary by image; verify them before publishing.</p>
            </section>
          </div>
          <button
            className="btn my-4"
            onClick={() => {
              const s: Slide = { id: uid(), kind: "custom", title: "Custom", body: "" };
              setSlides([...slides.slice(0, idx + 1), s, ...slides.slice(idx + 1)]);
              setCur(idx + 1);
            }}
          >
            + Add custom slide after this
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LayoutDiagram({ template, slide, layout: name }: { template: Template; slide: Slide; layout: LayoutName }) {
  const layout = layoutFor(template, { ...slide, layout: name })?.layout;
  if (!layout) return null;
  const position = (r: Rect) => ({ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` });
  return (
    <span aria-hidden="true" className="relative block aspect-video overflow-hidden rounded-lg bg-stone-100">
      <span className="absolute rounded-sm bg-stone-500/70" style={position(layout.title)} />
      {!layout.hideBody && <span className="absolute rounded-sm border border-stone-400 bg-stone-300/50" style={position(layout.body)} />}
      {layout.image && <span className="absolute grid place-items-center rounded-sm bg-accent/30 text-xs text-accent" style={position(layout.image)}>▧</span>}
      {layout.image2 && <span className="absolute grid place-items-center rounded-sm bg-accent/30 text-xs text-accent" style={position(layout.image2)}>▧</span>}
    </span>
  );
}
