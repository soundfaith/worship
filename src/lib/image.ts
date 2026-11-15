import { blobToDataUrl } from "./video";

export async function shrinkImage(file: Blob, max = 1280, format: "image/jpeg" | "image/png" = "image/jpeg"): Promise<string> {
  // Redrawing on a canvas keeps only the first GIF frame, so GIFs are stored as they are to keep their animation.
  if (file.type === "image/gif") return blobToDataUrl(file);
  const bmp = await createImageBitmap(file);
  try {
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Cannot process this image.");
    context.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(format, format === "image/jpeg" ? 0.82 : undefined);
  } finally {
    bmp.close();
  }
}
