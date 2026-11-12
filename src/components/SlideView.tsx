"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type KeyboardEvent } from "react";
import { renderArt, renderPhotoBackground } from "@/lib/art";
import { fitSize, readingFontSize } from "@/lib/layout";
import { backgroundFor, BLANK_TEMPLATE_ID, layoutFor } from "@/lib/templates";
import type { Layout, LogoPlacement, Rect, Slide, Template, TextBox } from "@/lib/types";

const pct = (r: Rect): CSSProperties => ({
  position: "absolute",
  left: `${r.x * 100}%`,
  top: `${r.y * 100}%`,
  width: `${r.w * 100}%`,
  height: `${r.h * 100}%`,
});

// 1pt on a 10in-wide slide = 100/720 of the slide width.
const cq = (pt: number) => `${(pt * 100) / 720}cqw`;

function Box({ box, text, font, fit, reading = false }: { box: TextBox; text: string; font: string; fit: boolean; reading?: boolean }) {
  const size = fit ? (reading ? readingFontSize(box, text) : fitSize(box, text)) : box.size;
  return (
    <div
      className={`flex flex-col justify-center ${reading ? "whitespace-pre-wrap" : "whitespace-pre-line"}`}
      style={{
        ...pct(box),
        color: `#${box.color}`,
        fontFamily: font === "Inter" ? "var(--font-inter), sans-serif" : `"${font}", Arial, sans-serif`,
        fontSize: cq(size),
        lineHeight: 1.3,
        overflowWrap: reading ? "anywhere" : undefined,
        textAlign: box.align,
        letterSpacing: box.spacing ? `${box.spacing / 100}em` : undefined,
        textTransform: box.caps ? "uppercase" : undefined,
      }}
    >
      {reading ? text.trim() : text}
    </div>
  );
}

function useArt(template: Template, name: string | undefined, layout: Layout | undefined, photo?: string, photoId?: string) {
  const key = `${template.id}/${name}/${photoId ?? ""}/${layout ? JSON.stringify(layout) : ""}`;
  const [art, setArt] = useState<{ key: string; url?: string; error?: string }>();
  useEffect(() => {
    if (!layout || !name) return;
    let live = true;
    (photo ? renderPhotoBackground(template, name, layout, photo, photoId ?? "photo") : renderArt(template, name, layout)).then(
      (url) => live && setArt({ key, url }),
      (error: unknown) => live && setArt({ key, error: error instanceof Error ? error.message : "Unable to load slide artwork." }),
    );
    return () => {
      live = false;
    };
  }, [template, name, layout, photo, photoId, key]);
  return art?.key === key ? art : undefined;
}

export function SlideView({ slide, template, className = "", font, songIndex = 0, logo, onLogoPositionChange }: {
  slide: Slide;
  template: Template;
  className?: string;
  font?: string;
  songIndex?: number;
  logo?: LogoPlacement;
  onLogoPositionChange?: (position: Pick<LogoPlacement, "x" | "y">) => void;
}) {
  const frame = `relative aspect-video w-full overflow-hidden rounded-xl shadow-sm ring-1 ring-black/10 dark:ring-white/10 ${className}`;
  const found = layoutFor(template, slide);
  const background = slide.backgroundImage ? undefined : backgroundFor(template, slide, songIndex);
  const hasArtwork = template.id !== BLANK_TEMPLATE_ID;
  const photo = slide.backgroundImage?.data;
  const art = useArt(
    template,
    background || (!hasArtwork && !photo) ? undefined : found?.name,
    background || (!hasArtwork && !photo) ? undefined : found?.layout,
    photo,
    slide.backgroundImage?.sourceUrl,
  );
  const [failedSrc, setFailedSrc] = useState("");
  const backgroundSrc = background ? `${template.dir}/${background.src}` : undefined;
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const logoDragRef = useRef<{ clientX: number; clientY: number; x: number; y: number; width: number; height: number } | null>(null);

  const moveLogo = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = logoDragRef.current;
    if (!logo || !drag || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const position = {
      x: Math.max(0.02 - logo.width, Math.min(0.98, drag.x + (event.clientX - drag.clientX) / drag.width)),
      y: Math.max(0.02 - logo.height, Math.min(0.98, drag.y + (event.clientY - drag.clientY) / drag.height)),
    };
    dragPositionRef.current = position;
    setDragPosition(position);
  };
  const finishLogoMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (dragPositionRef.current) onLogoPositionChange?.(dragPositionRef.current);
    logoDragRef.current = null;
    dragPositionRef.current = null;
    setDragPosition(null);
  };
  const nudgeLogo = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!logo || !onLogoPositionChange) return;
    const step = event.shiftKey ? 0.04 : 0.01;
    const positions = {
      ArrowLeft: { x: Math.max(0.02 - logo.width, logo.x - step), y: logo.y },
      ArrowRight: { x: Math.min(0.98, logo.x + step), y: logo.y },
      ArrowUp: { x: logo.x, y: Math.max(0.02 - logo.height, logo.y - step) },
      ArrowDown: { x: logo.x, y: Math.min(0.98, logo.y + step) },
    };
    const position = positions[event.key as keyof typeof positions];
    if (!position) return;
    event.preventDefault();
    onLogoPositionChange(position);
  };

  if (found) {
    const { layout } = found;
    return (
      <div className={frame} style={{ containerType: "inline-size", background: `#${template.bg}` }}>
        {(backgroundSrc || art?.url) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backgroundSrc ?? art?.url} alt="" className="absolute inset-0 h-full w-full" draggable={false} onError={() => backgroundSrc && setFailedSrc(backgroundSrc)} />
        )}
        {(art?.error || (backgroundSrc && failedSrc === backgroundSrc)) && <span className="absolute inset-0 z-10 grid place-items-center bg-red-900 p-4 text-center text-sm text-white">Unable to load slide background.</span>}
        {logo && (
          <button
            type="button"
            aria-label="Move logo; use arrow keys to position"
            title={onLogoPositionChange ? "Drag to move logo; use arrow keys to adjust" : undefined}
            tabIndex={onLogoPositionChange ? 0 : -1}
            onPointerDown={(event) => {
              if (!onLogoPositionChange) return;
              event.preventDefault();
              const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
              if (!bounds) return;
              logoDragRef.current = {
                clientX: event.clientX,
                clientY: event.clientY,
                x: (dragPositionRef.current ?? logo).x,
                y: (dragPositionRef.current ?? logo).y,
                width: bounds.width,
                height: bounds.height,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={moveLogo}
            onPointerUp={finishLogoMove}
            onPointerCancel={finishLogoMove}
            onKeyDown={nudgeLogo}
            className={`absolute z-20 touch-none ${onLogoPositionChange ? "cursor-move rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" : "pointer-events-none"}`}
            style={{
              left: `${(dragPosition ?? logo).x * 100}%`,
              top: `${(dragPosition ?? logo).y * 100}%`,
              width: `${logo.width * 100}%`,
              height: `${logo.height * 100}%`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo.data} alt="" draggable={false} className="h-full w-full object-contain" />
          </button>
        )}
        {slide.image && layout.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.image} alt="" className="object-cover" style={pct(layout.image)} />
        )}
        {slide.image2 && layout.image2 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.image2} alt="" className="object-cover" style={pct(layout.image2)} />
        )}
        <Box box={layout.title} text={slide.title} font={slide.font || font || template.fontTitle} fit={!!layout.fitTitle} />
        {!layout.hideBody && <Box box={layout.body} text={slide.body} font={slide.font || font || template.fontBody} fit reading={slide.kind === "gospel"} />}
      </div>
    );
  }

  const isSong = slide.kind === "song";
  const lines = slide.body.split("\n");
  const longest = Math.max(0, ...lines.map((l) => l.length));
  const scale = Math.max(2.2, Math.min(5.5, 120 / Math.max(lines.length * 1.4, longest / 2.2, 8)));
  return (
    <div
      className={`${frame} flex flex-col items-center px-[6%] py-[4%] text-center`}
      style={{ background: `#${template.bg}`, color: `#${template.fg}`, containerType: "inline-size" }}
    >
      <div
        style={{
          color: `#${template.accent}`,
          fontFamily: slide.font || font || template.fontTitle,
          fontSize: isSong ? "3.2cqw" : "6.5cqw",
          letterSpacing: isSong ? "0.15em" : 0,
          textTransform: isSong ? "uppercase" : "none",
        }}
      >
        {slide.title}
      </div>
      <div className="my-[1.5%] h-px w-[12%]" style={{ background: `#${template.accent}` }} />
      <div
        className="flex flex-1 items-center whitespace-pre-line leading-snug"
        style={{ fontFamily: slide.font || font || template.fontBody, fontSize: `${scale}cqw` }}
      >
        {slide.body}
      </div>
    </div>
  );
}
