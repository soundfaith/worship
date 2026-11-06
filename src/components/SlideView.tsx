"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { renderArt } from "@/lib/art";
import { fitSize } from "@/lib/layout";
import { backgroundFor, layoutFor } from "@/lib/templates";
import type { Layout, Rect, Slide, Template, TextBox } from "@/lib/types";

const pct = (r: Rect): CSSProperties => ({
  position: "absolute",
  left: `${r.x * 100}%`,
  top: `${r.y * 100}%`,
  width: `${r.w * 100}%`,
  height: `${r.h * 100}%`,
});

// 1pt on a 10in-wide slide = 100/720 of the slide width.
const cq = (pt: number) => `${(pt * 100) / 720}cqw`;

function Box({ box, text, font, fit }: { box: TextBox; text: string; font: string; fit: boolean }) {
  const size = fit ? fitSize(box, text) : box.size;
  return (
    <div
      className="flex flex-col justify-center whitespace-pre-line"
      style={{
        ...pct(box),
        color: `#${box.color}`,
        fontFamily: font === "Inter" ? "var(--font-inter), sans-serif" : font,
        fontSize: cq(size),
        lineHeight: 1.3,
        textAlign: box.align,
        letterSpacing: box.spacing ? `${box.spacing / 100}em` : undefined,
        textTransform: box.caps ? "uppercase" : undefined,
      }}
    >
      {text}
    </div>
  );
}

function useArt(template: Template, name: string | undefined, layout: Layout | undefined) {
  const key = `${template.id}/${name}`;
  const [art, setArt] = useState<{ key: string; url?: string; error?: string }>();
  useEffect(() => {
    if (!layout || !name) return;
    let live = true;
    renderArt(template, name, layout).then(
      (url) => live && setArt({ key, url }),
      (error: unknown) => live && setArt({ key, error: error instanceof Error ? error.message : "Unable to load slide artwork." }),
    );
    return () => {
      live = false;
    };
  }, [template, name, layout, key]);
  return art?.key === key ? art : undefined;
}

export function SlideView({ slide, template, className = "", font = "Inter" }: { slide: Slide; template: Template; className?: string; font?: string }) {
  const frame = `relative aspect-video w-full overflow-hidden rounded-xl shadow-sm ring-1 ring-black/10 dark:ring-white/10 ${className}`;
  const found = layoutFor(template, slide);
  const background = backgroundFor(template, slide);
  const art = useArt(template, background ? undefined : found?.name, background ? undefined : found?.layout);
  const [failedSrc, setFailedSrc] = useState("");
  const backgroundSrc = background ? `${template.dir}/${background.src}` : undefined;

  if (found) {
    const { layout } = found;
    return (
      <div className={frame} style={{ containerType: "inline-size", background: `#${template.bg}` }}>
        {(backgroundSrc || art?.url) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backgroundSrc ?? art?.url} alt="" className="absolute inset-0 h-full w-full" draggable={false} onError={() => backgroundSrc && setFailedSrc(backgroundSrc)} />
        )}
        {(art?.error || (backgroundSrc && failedSrc === backgroundSrc)) && <span className="absolute inset-0 z-10 grid place-items-center bg-red-900 p-4 text-center text-sm text-white">Unable to load slide background.</span>}
        {slide.image && layout.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.image} alt="" className="object-cover" style={pct(layout.image)} />
        )}
        {slide.image2 && layout.image2 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.image2} alt="" className="object-cover" style={pct(layout.image2)} />
        )}
        <Box box={layout.title} text={slide.title} font={slide.font ?? font} fit={!!layout.fitTitle} />
        {!layout.hideBody && <Box box={layout.body} text={slide.body} font={slide.font ?? font} fit />}
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
          fontFamily: template.fontTitle,
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
        style={{ fontFamily: template.fontBody, fontSize: `${scale}cqw` }}
      >
        {slide.body}
      </div>
    </div>
  );
}
