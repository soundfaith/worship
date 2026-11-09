import type { Fill, Layout, Template, TemplateBackground } from "./types";

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

export function renderBackground(template: Template, background: TemplateBackground): Promise<string> {
  const key = `${template.id}/background/${background.id}`;
  let result = rendered.get(key);
  if (!result) {
    result = (async () => {
      const image = await loadImage(`${template.dir}/${background.src}`);
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Cannot create a canvas to export the background.");
      context.drawImage(image, 0, 0, W, H);
      return canvas.toDataURL("image/jpeg", 0.92);
    })();
    result.catch(() => rendered.delete(key));
    rendered.set(key, result);
  }
  return result;
}

export function renderPhotoBackground(template: Template, layoutName: string, layout: Layout, src: string, photoId: string): Promise<string> {
  const key = `${template.id}/${layoutName}/photo/${photoId}/${JSON.stringify(layout)}`;
  let result = rendered.get(key);
  if (!result) {
    result = drawPhoto(template, layout, src);
    result.catch(() => rendered.delete(key));
    rendered.set(key, result);
  }
  return result;
}

async function draw(template: Template, layout: Layout): Promise<string> {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = paint(ctx, layout.bg ?? { type: "solid", color: template.bg }, 0, 0, W, H);
  ctx.fillRect(0, 0, W, H);
  await drawShapes(ctx, template, layout.shapes ?? []);
  return c.toDataURL("image/jpeg", 0.92);
}

async function drawPhoto(template: Template, layout: Layout, src: string): Promise<string> {
  const image = await loadImage(src);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Cannot create a canvas to render the photo background.");
  const scale = Math.max(W / image.width, H / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (W - width) / 2;
  const y = (H - height) / 2;
  ctx.drawImage(image, x, y, width, height);

  const blurred = document.createElement("canvas");
  blurred.width = W;
  blurred.height = H;
  const blurContext = blurred.getContext("2d");
  if (!blurContext) throw new Error("Cannot create a canvas to blur the photo background.");
  blurContext.filter = "blur(26px)";
  blurContext.drawImage(c, 0, 0);
  blurContext.filter = "none";

  const textColor = layout.title.color;
  const red = parseInt(textColor.slice(0, 2), 16);
  const green = parseInt(textColor.slice(2, 4), 16);
  const blue = parseInt(textColor.slice(4, 6), 16);
  const lightText = red * 0.2126 + green * 0.7152 + blue * 0.0722 > 140;
  const overlay = lightText ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.38)";
  for (const box of [layout.title, ...(layout.hideBody ? [] : [layout.body])]) {
    const padX = W * 0.018;
    const padY = H * 0.025;
    const left = box.x * W - padX;
    const top = box.y * H - padY;
    const width = box.w * W + padX * 2;
    const height = box.h * H + padY * 2;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(left, top, width, height, Math.min(34, height * 0.12));
    ctx.clip();
    ctx.drawImage(blurred, 0, 0);
    ctx.fillStyle = overlay;
    ctx.fillRect(left, top, width, height);
    ctx.restore();
  }
  await drawShapes(ctx, template, layout.shapes ?? []);
  return c.toDataURL("image/jpeg", 0.92);
}

async function drawShapes(ctx: CanvasRenderingContext2D, template: Template, shapes: Layout["shapes"] = []) {
  for (const s of shapes) {
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
}
