import type { Fill, Layout, Template } from "./types";

const W = 1920;
const H = 1080;

const rgba = (hex: string, a = 1) => {
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

function paint(ctx: CanvasRenderingContext2D, fill: Fill, x: number, y: number, w: number, h: number): string | CanvasGradient {
  if (fill.type === "solid") return rgba(fill.color, fill.alpha);
  // PowerPoint angles run clockwise from the +x axis (0 = left→right, 90 = top→bottom).
  const rad = (fill.angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const half = (Math.abs(dx * w) + Math.abs(dy * h)) / 2;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  for (const s of fill.stops) g.addColorStop(Math.min(1, Math.max(0, s.pos)), rgba(s.color, s.alpha));
  return g;
}

const loaded = new Map<string, Promise<HTMLImageElement>>();
function loadImage(url: string): Promise<HTMLImageElement> {
  let p = loaded.get(url);
  if (!p) {
    p = new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error(`Cannot load ${url}`));
      img.src = url;
    });
    loaded.set(url, p);
  }
  return p;
}

const rendered = new Map<string, Promise<string>>();

// Draws a layout's background and shapes (no text) to a JPEG data URL, used for both preview and export.
export function renderArt(template: Template, layoutName: string, layout: Layout): Promise<string> {
  const key = `${template.id}/${layoutName}`;
  let p = rendered.get(key);
  if (!p) {
    p = draw(template, layout);
    p.catch(() => rendered.delete(key));
    rendered.set(key, p);
  }
  return p;
}

async function draw(template: Template, layout: Layout): Promise<string> {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = paint(ctx, layout.bg ?? { type: "solid", color: template.bg }, 0, 0, W, H);
  ctx.fillRect(0, 0, W, H);

  for (const s of layout.shapes ?? []) {
    const x = s.x * W;
    const y = s.y * H;
    const w = s.w * W;
    const h = s.h * H;
    ctx.save();
    ctx.globalAlpha = s.opacity ?? 1;
    if (s.rot) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((s.rot * Math.PI) / 180);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }
    if (s.type === "image" && s.src) {
      const img = await loadImage(`${template.dir}/${s.src}`);
      // object-fit: cover
      const k = Math.max(w / img.width, h / img.height);
      const sw = w / k;
      const sh = h / k;
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
    } else if (s.fill) {
      ctx.fillStyle = paint(ctx, s.fill, x, y, w, h);
      ctx.beginPath();
      if (s.type === "ellipse") ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      else if (s.type === "roundRect") ctx.roundRect(x, y, w, h, Math.min(w, h) * 0.16);
      else ctx.rect(x, y, w, h);
      ctx.fill();
    }
    ctx.restore();
  }
  return c.toDataURL("image/jpeg", 0.92);
}
