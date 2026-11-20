"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { buildSlides } from "@/lib/slides";
import { gospelForAssembly } from "@/lib/gospel";
import { GOSPEL_MIN_SIZE, isReadingSlide, readingFits } from "@/lib/layout";
import { groupRange, moveSlideRange, slideGroupKey } from "@/lib/slide-groups";
import { uid } from "@/lib/store";
import { backgroundFor, FONTS, LAYOUT_OPTIONS, layoutFor, layoutNameFor, presentationTemplate, songIndexes, TEMPLATES } from "@/lib/templates";
import type { ImageProvider, LayoutName, PhotoSearchResult, Rect, Slide, SlidePicture, SlideVideo, Template } from "@/lib/types";
import { Icon, IconButton } from "./Icon";
import { SlideView } from "./SlideView";
import { Presentation } from "./Presentation";
import { ImagePicker } from "./ImagePicker";
import { VideoPicker } from "./VideoPicker";
import { ConfirmDialog, Modal } from "./Modal";
import Dropdown from "./ui/Dropdown";
import type { TabProps } from "./ui";
import { shrinkImage } from "@/lib/image";
import { defaultPicture } from "@/lib/picture";
import { useLogoPreference } from "@/lib/assemblies";
import { captureVideoPoster, deleteVideoBlob, MAX_VIDEO_BYTES, parseYouTubeId, saveVideoBlob } from "@/lib/video";

const NO_SLIDES: Slide[] = [];
const GALLERY_IMAGE_SIZES = "(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 320px";

export function ReviewTab({ a, update, exportError, presentationError, presentRequest, handledPresentRequestRef }: TabProps & {
  exportError: string;
  presentationError: string;
  presentRequest: number;
  handledPresentRequestRef: RefObject<number>;
}) {
  const [cur, setCur] = useState(0);
  const [error, setError] = useState("");
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [pictureBusy, setPictureBusy] = useState(false);
  const [pictureError, setPictureError] = useState("");
  const [regenerate, setRegenerate] = useState(false);
  const [deleteSlide, setDeleteSlide] = useState<Slide | null>(null);
  const [isPresenting, setIsPresenting] = useState(false);
  const [editPanel, setEditPanel] = useState<"text" | "layout" | "background" | "media">("text");
  const [pendingFont, setPendingFont] = useState<{ slideId: string; font: string } | null>(null);
  const [pendingMove, setPendingMove] = useState<-1 | 1 | null>(null);
  const [, setLogoPreference] = useLogoPreference();
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
  const slideNavigationRef = useRef<HTMLElement | null>(null);
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
  const moveBy = (direction: -1 | 1, whole: boolean) => {
    const range = whole ? groupRange(slides, idx) : { start: idx, end: idx + 1 };
    // A grouped slide moved alone swaps with a single neighbor; an ungrouped slide never splits a group.
    const wholeNeighbor = whole || slideGroupKey(slide) === null;
    const result = moveSlideRange(slides, range.start, range.end, direction, wholeNeighbor);
    if (!result) return;
    setSlides(result.slides);
    setCur(result.index);
  };
  const requestMove = (direction: -1 | 1) => {
    const range = groupRange(slides, idx);
    if (range.end - range.start > 1) setPendingMove(direction);
    else moveBy(direction, false);
  };
  const tpl = (s: Slide) => presentationTemplate(a.sectionTemplates[s.kind] ?? a.templateId, a.backgroundColor);
  const updateLogoPosition = (position: { x: number; y: number }) => {
    if (a.logo) {
      const logo = { ...a.logo, ...position };
      update({ logo });
      setLogoPreference(logo);
    }
  };

  const activeTemplate = slide ? tpl(slide) : undefined;
  const hasBackgrounds = Boolean(activeTemplate?.backgrounds && activeTemplate.backgrounds.length > 0);
  const activePanel = editPanel === "background" && !hasBackgrounds ? "text" : editPanel;

  useEffect(() => {
    const el = slideNavigationRef.current?.querySelector<HTMLButtonElement>(`button[data-slide-index="${idx}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [idx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isPresenting) return;
      const t = e.target as HTMLElement;
      if (t.closest('[aria-label="Slide navigation"]')) return;
      if (t.closest("dialog") || t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "BUTTON" || t.isContentEditable) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setCur((c) => Math.min(c + 1, slides.length - 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCur((c) => Math.max(c - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPresenting, slides.length]);

  const startPresentation = useCallback(() => {
    setIsPresenting(true);
  }, []);
  const closePresentation = useCallback(() => setIsPresenting(false), []);
  useEffect(() => {
    if (presentRequest > handledPresentRequestRef.current) {
      handledPresentRequestRef.current = presentRequest;
      startPresentation();
    }
  }, [presentRequest, handledPresentRequestRef, startPresentation]);
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

  const setVideo = (slideId: string, video: SlideVideo | undefined) => {
    setSlides(latestSlides.current.map((item) => item.id === slideId ? { ...item, video } : item));
  };
  const setVideoFrame = (slideId: string, videoFrame: Rect) => {
    setSlides(latestSlides.current.map((item) => item.id === slideId ? { ...item, videoFrame } : item));
  };
  const attachVideoFile = async (file: File, slideId: string) => {
    setVideoError("");
    if (!file.type.startsWith("video/")) {
      setVideoError("Choose a video file.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setVideoError(`Videos must be ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB or smaller.`);
      return;
    }
    setVideoBusy(true);
    try {
      const id = crypto.randomUUID();
      const poster = await captureVideoPoster(file);
      await saveVideoBlob(id, file);
      const previous = latestSlides.current.find((item) => item.id === slideId)?.video;
      setVideo(slideId, { kind: "file", id, name: file.name, poster });
      if (previous?.kind === "file") await deleteVideoBlob(previous.id).catch(() => undefined);
    } catch (e) {
      setVideoError(`Could not add the video: ${e instanceof Error ? e.message : "unknown error"}.`);
    } finally {
      setVideoBusy(false);
    }
  };
  const attachVideoLink = (url: string, slideId: string) => {
    const videoId = parseYouTubeId(url);
    if (!videoId) {
      setVideoError("Enter a YouTube link.");
      return;
    }
    setVideoError("");
    const previous = latestSlides.current.find((item) => item.id === slideId)?.video;
    setVideo(slideId, { kind: "link", url, videoId });
    if (previous?.kind === "file") void deleteVideoBlob(previous.id).catch(() => undefined);
  };
  const removeVideo = (slideId: string) => {
    const previous = latestSlides.current.find((item) => item.id === slideId)?.video;
    setVideoError("");
    setSlides(latestSlides.current.map((item) => item.id === slideId ? { ...item, video: undefined, videoFrame: undefined } : item));
    if (previous?.kind === "file") void deleteVideoBlob(previous.id).catch(() => undefined);
  };

  const setPicture = (slideId: string, picture: SlidePicture | undefined) => {
    setSlides(latestSlides.current.map((item) => item.id === slideId ? { ...item, picture } : item));
  };
  const attachPicture = async (file: File, slideId: string) => {
    setPictureError("");
    if (!file.type.startsWith("image/")) {
      setPictureError("Choose an image file.");
      return;
    }
    setPictureBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const ratio = bitmap.width / bitmap.height;
      bitmap.close();
      const data = await shrinkImage(file);
      setPicture(slideId, defaultPicture(data, ratio));
    } catch (e) {
      setPictureError(`Could not add the image: ${e instanceof Error ? e.message : "unknown error"}.`);
    } finally {
      setPictureBusy(false);
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
    } catch (e) {
      setImageError(e instanceof Error ? e.message : "Could not save this image.");
    } finally {
      setImageDownloading("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm tabular-nums text-stone-500" aria-live="polite">{idx + 1} / {slides.length}</span>
        <button className="btn" title="Rebuild generated slides from the current assembly content" onClick={() => setRegenerate(true)}>Rebuild slides</button>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-500 p-3 text-sm text-red-600">{error}</p>}
      {presentationError && <p role="status" className="text-sm text-amber-700">{presentationError}</p>}
      {exportError && <p role="alert" className="rounded-xl border border-red-500 p-3 text-sm text-red-600">{exportError}</p>}
      {gospel.include && !gospel.text.trim() && <p role="status" className="rounded-xl border border-amber-500 p-3 text-sm text-amber-700">No Gospel text is available for the selected date. Add a reading or turn it off in Content.</p>}
      {isPresenting && slides.length > 0 && <Presentation assembly={a} slides={slides} onClose={closePresentation} error={presentationError} />}
      {regenerate && <ConfirmDialog title="Rebuild slides from content?" message="This refreshes the deck from the current assembly content. Manual slide edits will be removed." confirmLabel="Rebuild slides" onCancel={() => setRegenerate(false)} onConfirm={() => { setRegenerate(false); update({ slides: null }); }} />}
      {deleteSlide && <ConfirmDialog title="Remove slide?" message={`“${deleteSlide.title || "Untitled slide"}” will be removed from this assembly.`} confirmLabel="Remove slide" onCancel={() => setDeleteSlide(null)} onConfirm={() => {
        const nextSlides = slides.filter((item) => item.id !== deleteSlide.id);
        setSlides(nextSlides);
        setCur(Math.min(idx, nextSlides.length - 1));
        setDeleteSlide(null);
      }} />}
      {pendingFont && (
        <Modal labelledBy="font-scope-title" describedBy="font-scope-message" onClose={() => setPendingFont(null)} className="confirm-modal">
          <h2 id="font-scope-title" className="display text-3xl text-stone-900">Apply font</h2>
          <p id="font-scope-message" className="mt-3 text-sm leading-relaxed text-stone-600">Apply this font to the current slide or all slides?</p>
          <div className="mt-7 flex flex-wrap justify-end gap-2">
            <button type="button" className="btn" data-initial-focus onClick={() => setPendingFont(null)}>Cancel</button>
            <button type="button" className="btn" onClick={() => {
              setSlides(latestSlides.current.map((item) => item.id === pendingFont.slideId ? { ...item, font: pendingFont.font || undefined } : item));
              setPendingFont(null);
            }}>Current slide</button>
            <button type="button" className="btn btn-primary" onClick={() => {
              setSlides(latestSlides.current.map((item) => ({ ...item, font: pendingFont.font || undefined })));
              setPendingFont(null);
            }}>All slides</button>
          </div>
        </Modal>
      )}

      {pendingMove && (() => {
        const range = groupRange(slides, idx);
        const label = slideGroupKey(slide)?.startsWith("song:") ? "song" : slideGroupKey(slide) === "gospel" ? "Gospel reading" : "long content";
        const direction = pendingMove;
        return (
          <Modal labelledBy="move-scope-title" describedBy="move-scope-message" onClose={() => setPendingMove(null)} className="confirm-modal">
            <h2 id="move-scope-title" className="display text-3xl text-stone-900">Move slide</h2>
            <p id="move-scope-message" className="mt-3 text-sm leading-relaxed text-stone-600">This slide is part of a {label} with {range.end - range.start} slides. Move the whole {label} or only this slide?</p>
            <div className="mt-7 flex flex-wrap justify-end gap-2">
              <button type="button" className="btn" data-initial-focus onClick={() => setPendingMove(null)}>Cancel</button>
              <button type="button" className="btn" onClick={() => { setPendingMove(null); moveBy(direction, false); }}>Only this slide</button>
              <button type="button" className="btn btn-primary" onClick={() => { setPendingMove(null); moveBy(direction, true); }}>Whole {label}</button>
            </div>
          </Modal>
        );
      })()}

      <div className="flex min-w-0 flex-col items-stretch gap-3 sm:min-h-[38rem] sm:flex-row sm:items-start sm:gap-4">
        <nav
          ref={slideNavigationRef}
          aria-label="Slide navigation"
          tabIndex={0}
          onKeyDown={(event) => {
            const direction = event.key === "ArrowRight" || event.key === "ArrowDown"
              ? 1
              : event.key === "ArrowLeft" || event.key === "ArrowUp"
                ? -1
                : 0;
            if (!direction) return;
            event.preventDefault();
            const next = Math.max(0, Math.min(idx + direction, slides.length - 1));
            setCur(next);
            requestAnimationFrame(() => {
              slideNavigationRef.current
                ?.querySelector<HTMLButtonElement>(`button[data-slide-index="${next}"]`)
                ?.focus();
            });
          }}
          className="slides-nav-scroll w-full shrink-0 overflow-x-auto rounded-xl sm:sticky sm:top-20 sm:max-h-[calc(100dvh-7rem)] sm:w-32 sm:overflow-y-auto sm:overflow-x-hidden sm:p-1 sm:pr-1.5 lg:w-44"
        >
          <ol className="flex w-max gap-2 p-1 sm:w-auto sm:flex-col sm:space-y-2 sm:p-0">
            {slides.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  data-slide-index={i}
                  aria-label={`Slide ${i + 1}: ${s.title || "Untitled"}`}
                  onClick={() => setCur(i)}
                  tabIndex={i === idx ? 0 : -1}
                  aria-current={i === idx ? "true" : undefined}
                  className={`block w-24 rounded-lg p-1 text-left transition sm:w-full sm:rounded-md ${i === idx ? "ring-2 ring-accent" : "hover:ring-1 hover:ring-stone-300"}`}
                >
                  <SlideView slide={s} template={tpl(s)} font={a.font} songIndex={songPositions[i]} logo={a.showLogo === false ? undefined : a.logo} className="!rounded-sm" />
                  <span className="block truncate px-1 pt-1 text-[10px] text-stone-500 sm:text-xs">{i + 1}. <span className="sm:inline">{s.title}</span></span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <div className="w-full max-w-xl shrink-0">
              <SlideView
                slide={slide}
                template={currentTemplate}
                font={a.font}
                songIndex={songPositions[idx]}
                logo={a.showLogo === false ? undefined : a.logo}
                onLogoPositionChange={a.logo && a.showLogo !== false ? updateLogoPosition : undefined}
                onPictureChange={(picture) => setPicture(slide.id, picture)}
                onVideoFrameChange={(videoFrame) => setVideoFrame(slide.id, videoFrame)}
                play
              />
            </div>
            <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
              <IconButton icon="up" label="Move slide earlier" disabled={idx === 0} onClick={() => requestMove(-1)} />
              <IconButton icon="down" label="Move slide later" disabled={idx === slides.length - 1} onClick={() => requestMove(1)} />
            </div>
          </div>
          <div role="tablist" aria-label="Slide editing sections" className="flex max-w-full w-fit gap-1 overflow-x-auto rounded-xl bg-stone-100 p-1">
              {([
                ["text", "Style"],
                ["layout", "Layout"],
                ...(hasBackgrounds ? [["background", "Background"] as const] : []),
                ["media", "Media"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activePanel === id}
                  onClick={() => setEditPanel(id as "text" | "layout" | "background" | "media")}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-base font-medium transition ${activePanel === id ? "bg-surface text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          <div aria-label="Slide editing tools" className="space-y-4">
          <div className="card min-w-0 space-y-4 p-3 sm:p-5">
            <div hidden={activePanel !== "text"} className="space-y-4">
            <input className="input" aria-label="Slide title" value={slide.title} onChange={(e) => patch({ title: e.target.value })} />
            <textarea className="input h-36" aria-label="Slide text" value={slide.body} onChange={(e) => patch({ body: e.target.value })} />
            {isReadingSlide(slide) && currentLayout && !currentLayout.hideBody && !readingFits(currentLayout.body, slide.body, GOSPEL_MIN_SIZE) && <p role="status" className="text-sm text-amber-700">This reading may not fit at the minimum readable font size. Shorten it or choose a larger text layout.</p>}
            {currentLayout?.hideBody && slide.body && <p className="text-xs text-stone-500">This layout hides the slide text; it is preserved if you switch layouts.</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <span className="mb-1 block text-xs text-stone-500">Slide template</span>
                <Dropdown
                  label="Slide template"
                  selectedValue={a.sectionTemplates[slide.kind] ?? ""}
                  onSelect={(value) => update({ sectionTemplates: { ...a.sectionTemplates, [slide.kind]: value || undefined } })}
                  selectedRender={<>
                    <span className="w-12 shrink-0">
                      <SlideView slide={{ id: "template-preview", kind: slide.kind, title: "", body: "", layout: slide.layout }} template={currentTemplate} font={a.font} className="!rounded-md !shadow-none" />
                    </span>
                    <span className="truncate">{a.sectionTemplates[slide.kind] ? currentTemplate.name : "Assembly default"}</span>
                  </>}
                  items={[
                    { value: "", label: "Assembly default" },
                    ...TEMPLATES.map((template) => ({
                      value: template.id,
                      label: template.name,
                      render: <>
                        <span className="w-12 shrink-0">
                          <SlideView slide={{ id: `template-preview-${template.id}`, kind: slide.kind, title: "", body: "", layout: slide.layout }} template={presentationTemplate(template.id, a.backgroundColor)} font={a.font} className="!rounded-md !shadow-none" />
                        </span>
                        <span className="truncate">{template.name}</span>
                      </>,
                    })),
                  ]}
                />
              </div>
              <div className="min-w-0">
                <span className="mb-1 block text-xs text-stone-500">Slide font</span>
                <Dropdown
                  label="Slide font"
                  selectedValue={slide.font ?? ""}
                  onSelect={(font) => {
                    if (font !== (slide.font ?? "")) setPendingFont({ slideId: slide.id, font });
                  }}
                  items={[
                    { value: "", label: "Presentation default" },
                    ...FONTS.map((font) => ({ value: font, label: font, render: <span style={{ fontFamily: font }}>{font}</span> })),
                  ]}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {currentTemplate.backgrounds?.length ? <label className="flex items-center gap-2 text-sm text-stone-500">Text color
                <input type="color" aria-label="Slide text color" value={`#${slide.textColor ?? currentTemplate.fg}`} onChange={(e) => patch({ textColor: e.target.value.slice(1).toUpperCase()})} />
                {slide.textColor && <button className="btn btn-ghost" onClick={() => patch({ textColor: undefined })}>Reset</button>}
              </label> : null}
              {slides.filter((item) => item.kind === slide.kind).length > 1 && <button className="btn btn-ghost" onClick={() => setSlides(slides.map((item) => item.kind === slide.kind ? { ...item, layout: slide.layout, background: slide.background, backgroundImage: slide.backgroundImage, font: slide.font, textColor: slide.textColor } : item))}>Apply design to all {slide.kind} slides</button>}
            </div>
            </div>
            <div hidden={activePanel !== "layout"} className="space-y-4">
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
            </div>
            <div hidden={activePanel !== "background"} className="space-y-4">
            {hasBackgrounds ? (
              <section className="space-y-4" aria-label="Slide backgrounds">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="display text-2xl">Background</h3>
                    <p className="text-sm text-stone-500">Choose artwork independently of the content layout.</p>
                    {slide.background && (slide.background.templateId !== currentTemplate.id || !currentTemplate.backgrounds?.some((b) => b.id === slide.background?.id)) && <p className="text-sm text-amber-700">The saved background is unavailable for this template; the automatic background is shown.</p>}
                  </div>
                  <button className="btn btn-ghost" onClick={() => patch({ background: undefined })}>Use automatic</button>
                </div>
                <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
                  {currentTemplate.backgrounds?.map((background) => (
                    <button key={background.id} type="button" aria-label={`Use ${background.name} background`} aria-pressed={currentBackground?.id === background.id} onClick={() => patch({ background: { templateId: currentTemplate.id, id: background.id } })} className={`min-w-0 h-full rounded-xl p-1 text-left ${currentBackground?.id === background.id ? "ring-2 ring-accent" : "ring-1 ring-stone-200 hover:ring-accent"}`}>
                      <span className="relative block aspect-video overflow-hidden rounded-lg">
                        <Image src={`${currentTemplate.dir}/${background.src}`} alt="" fill sizes={GALLERY_IMAGE_SIZES} className="object-cover" />
                      </span>
                      <span className="line-clamp-2 h-10 break-words p-1 text-xs text-stone-600">{background.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <div className="py-8 text-center text-stone-500">
                <p className="text-base font-medium text-stone-700">No background artwork</p>
                <p className="mt-1 text-sm text-stone-500">
                  The &ldquo;{currentTemplate.name}&rdquo; template uses a solid theme color and does not include background artwork variants. You can add a photo background in the Media tab.
                </p>
              </div>
            )}
            </div>
            <div hidden={activePanel !== "media"} className="space-y-4">
            <section className="card min-w-0 space-y-4 p-4 sm:p-6" aria-label="Photo backgrounds">
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
                <Dropdown
                  label="Photo source"
                  className="w-full sm:w-48"
                  selectedValue={imageProvider}
                  items={imageProviders.map((provider) => ({ value: provider.id, label: provider.label }))}
                  onSelect={(provider) => {
                    imageSearchId.current++;
                    setImageProvider(provider);
                    setImageResults([]);
                    setImageNextCursor(null);
                    setImageError("");
                  }}
                />
                {imageProvider === "library" ? (
                  <Dropdown
                    label="Photo category"
                    className="w-full sm:w-40"
                    selectedValue={libraryCategory}
                    onSelect={setLibraryCategory}
                    items={libraryCategories.map((category) => ({ value: category, label: category[0].toUpperCase() + category.slice(1) }))}
                  />
                ) : (
                  <input
                    className="input min-w-0 flex-1"
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
                <ul className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
                  {imageResults.map((image) => (
                    <li key={image.id} className="min-w-0">
                      <button
                        type="button"
                        disabled={!!imageDownloading}
                        onClick={() => void selectImage(image)}
                        className="w-full rounded-xl border border-stone-200 p-2 text-left transition hover:border-accent disabled:opacity-60"
                      >
                        {image.provider === "library" ? (
                          <span className="relative block aspect-video overflow-hidden rounded-lg">
                            <Image src={image.thumbnailUrl} alt="" fill sizes={GALLERY_IMAGE_SIZES} className="object-cover" />
                          </span>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image.thumbnailUrl} alt="" loading="lazy" className="aspect-video w-full rounded-lg object-cover" />
                        )}
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
            <section className="card min-w-0 space-y-4 p-4 sm:p-6" aria-label="Images">
              <div>
                <h3 className="display text-2xl">Image</h3>
                <p className="text-sm text-stone-500">Add your own picture and place it anywhere on the slide. Drag to move it and drag its corner to resize.</p>
              </div>
              {!currentLayout?.image && (slide.image || slide.image2) && <p className="text-xs text-stone-500">Images are preserved but hidden in this layout.</p>}
              {currentLayout?.image && !currentLayout.image2 && slide.image2 && <p className="text-xs text-stone-500">Image 2 is preserved but hidden in this layout.</p>}
              {[{ field: "image" as const, rect: currentLayout?.image, label: "Image 1" }, { field: "image2" as const, rect: currentLayout?.image2, label: "Image 2" }].filter((item) => item.rect).map(({ field, label }) => (
                <div key={field} className="flex flex-wrap items-center gap-3 text-sm text-stone-600">
                  <label className="btn cursor-pointer">
                    {slide[field] ? `Replace ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}
                    <input type="file" accept="image/*" aria-label={`Upload ${label.toLowerCase()}`} className="sr-only" onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void upload(file, field, slide.id);
                      event.target.value = "";
                    }} />
                  </label>
                  {slide[field] && <button className="btn btn-ghost" onClick={() => patch({ [field]: undefined })}>Remove</button>}
                </div>
              ))}
              <ImagePicker
                key={slide.id}
                picture={slide.picture}
                busy={pictureBusy}
                error={pictureError}
                onFile={(file) => void attachPicture(file, slide.id)}
                onRemove={() => setPicture(slide.id, undefined)}
              />
            </section>
            <div className="card min-w-0 p-4 sm:p-6">
              <VideoPicker
                key={slide.id}
                video={slide.video}
                busy={videoBusy}
                error={videoError}
                onFile={(file) => void attachVideoFile(file, slide.id)}
                onLink={(url) => attachVideoLink(url, slide.id)}
                onRemove={() => removeVideo(slide.id)}
              />
            </div>
            </div>
          </div>
          <div className="my-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="btn"
              onClick={() => {
                const s: Slide = { id: uid(), kind: "custom", title: "Custom", body: "" };
                setSlides([...slides.slice(0, idx + 1), s, ...slides.slice(idx + 1)]);
                setCur(idx + 1);
              }}
            >
              <Icon name="plus" className="h-4 w-4" />
              Add custom slide after this
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={slides.length <= 1}
              title={slides.length <= 1 ? "An assembly must have at least one slide." : undefined}
              onClick={() => setDeleteSlide(slide)}
            >
              <Icon name="trash" className="h-4 w-4" />Remove slide
            </button>
          </div>
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
      {!layout.hideTitle && <span className="absolute rounded-sm bg-stone-500/70" style={position(layout.title)} />}
      {!layout.hideBody && <span className="absolute rounded-sm border border-stone-400 bg-stone-300/50" style={position(layout.body)} />}
      {layout.image && <span className="absolute grid place-items-center rounded-sm bg-accent/30 text-xs text-accent" style={position(layout.image)}>▧</span>}
      {layout.image2 && <span className="absolute grid place-items-center rounded-sm bg-accent/30 text-xs text-accent" style={position(layout.image2)}>▧</span>}
    </span>
  );
}
