"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import { presentationTemplate, songIndexes } from "@/lib/templates";
import { presentationIndexForSwipe } from "@/lib/presentation";
import type { Assembly, Slide } from "@/lib/types";
import { Icon } from "./Icon";
import { SlideView } from "./SlideView";

export function Presentation({ assembly, slides, onClose, error }: {
  assembly: Assembly;
  slides: Slide[];
  onClose: () => void;
  error?: string;
}) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const songPositions = songIndexes(slides);
  const photoCredits = [...new Map(
    slides.flatMap((slide) => slide.backgroundImage?.sourceUrl
      ? [[slide.backgroundImage.sourceUrl, slide.backgroundImage] as const]
      : []),
  ).values()];
  const slideCount = slides.length + (photoCredits.length ? 1 : 0);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        if (document.fullscreenElement) void document.exitFullscreen().catch((error: unknown) => console.error("Could not exit fullscreen:", error));
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        setIndex((current) => Math.min(current + 1, slideCount - 1));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((current) => Math.max(current - 1, 0));
      } else if (event.key === "Home") {
        event.preventDefault();
        setIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setIndex(slideCount - 1);
      }
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [onClose, slideCount]);

  const endTouch = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || event.changedTouches.length !== 1) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    setIndex((current) => presentationIndexForSwipe(current, slideCount, dx, dy));
  };
  const close = () => {
    onClose();
    if (document.fullscreenElement) void document.exitFullscreen().catch((error: unknown) => console.error("Could not exit fullscreen:", error));
  };
  const slide = slides[index];
  const template = presentationTemplate(slide ? assembly.sectionTemplates[slide.kind] ?? assembly.templateId : assembly.templateId, assembly.backgroundColor);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Presentation"
      className="fixed inset-0 z-[100] grid h-[100dvh] w-screen place-items-center overflow-hidden bg-black text-white"
      style={{ touchAction: "pan-y" }}
      onTouchStart={(event) => {
        const target = event.target;
        if (event.touches.length !== 1 || (target instanceof Element && target.closest("a, button"))) {
          touchStart.current = null;
          return;
        }
        touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }}
      onTouchEnd={endTouch}
      onTouchCancel={() => { touchStart.current = null; }}
    >
      <button type="button" aria-label="Close presentation" onClick={close} className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
        <Icon name="close" className="h-6 w-6" />
      </button>
      {error && <p role="status" className="absolute left-4 top-4 z-10 max-w-[75%] rounded-lg bg-black/70 p-2 text-sm text-white">{error}</p>}
      <div className="grid h-full w-full place-items-center">
        <div style={{ width: "min(100vw, calc(100dvh * 1.7778))" }}>
          {slide ? (
            <SlideView
              slide={slide}
              template={template}
              font={assembly.font}
              songIndex={songPositions[index]}
              logo={assembly.showLogo === false ? undefined : assembly.logo}
              className="!rounded-none !shadow-none !ring-0"
            />
          ) : (
            <div className="relative aspect-video w-full overflow-hidden p-[5%]" style={{ backgroundColor: `#${template.bg}`, containerType: "inline-size" }}>
              <h2 className="mb-[3%] text-center text-[3cqw] font-semibold text-stone-900" style={{ color: `#${template.fg}` }}>Photo credits</h2>
              <ul className={`grid h-[78%] gap-x-[4%] gap-y-[1%] ${photoCredits.length > 10 ? "grid-flow-col grid-rows-10 grid-cols-2" : "grid-cols-1"}`}>
                {photoCredits.map((credit) => (
                  <li key={credit.sourceUrl} className="min-w-0 overflow-hidden text-[1.3cqw] leading-tight">
                    <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: `#${template.fg}` }}>
                      {credit.providerLabel?.includes("Unsplash")
                        ? `Photo by ${credit.artist} on Unsplash · "${credit.title}" · ${credit.license}`
                        : `"${credit.title}" by ${credit.artist} · ${credit.providerLabel ?? "Wikimedia Commons"} · ${credit.license}`}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
