"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { renderArt } from "@/lib/art";
import { fitSize } from "@/lib/layout";
import { layoutFor } from "@/lib/templates";
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
        fontFamily: font,
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
  const [art, setArt] = useState<{ key: string; url: string }>();
  useEffect(() => {
    if (!layout || !name) return;
    let live = true;
    renderArt(template, name, layout).then((url) => live && setArt({ key, url }), () => {});
    return () => {
      live = false;
    };
  }, [template, name, layout, key]);
  return art?.key === key ? art.url : undefined;
}

export function SlideView({ slide, template, className = "" }: { slide: Slide; template: Template; className?: string }) {
  const frame = `relative aspect-video w-full overflow-hidden rounded-xl shadow-sm ring-1 ring-black/10 dark:ring-white/10 ${className}`;
  const found = layoutFor(template, slide);
  const art = useArt(template, found?.name, found?.layout);

  if (found) {
    const { layout } = found;
    return (
      <div className={frame} style={{ containerType: "inline-size", background: `#${template.bg}` }}>
        {art && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art} alt="" className="absolute inset-0 h-full w-full" draggable={false} />
        )}
        {slide.image && layout.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.image} alt="" className="object-cover" style={pct(layout.image)} />
        )}
        <Box box={layout.title} text={slide.title} font={template.fontTitle} fit={false} />
        <Box box={layout.body} text={slide.body} font={template.fontBody} fit />
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
