import type { Rect, SlidePicture } from "./types";

// Slides are 10in x 5.625in (16:9).
export const SLIDE_ASPECT = 16 / 9;
const MIN_WIDTH = 0.05;
const MAX_HEIGHT = 0.95;

// Height as a fraction of the slide height.
export function pictureHeight(picture: Pick<SlidePicture, "w" | "ratio">) {
  return (picture.w * SLIDE_ASPECT) / picture.ratio;
}

// Centers a new picture, shrinking it when a tall image would not fit.
export function defaultPicture(data: string, ratio: number): SlidePicture {
  let w = 0.4;
  if ((w * SLIDE_ASPECT) / ratio > MAX_HEIGHT) w = (MAX_HEIGHT * ratio) / SLIDE_ASPECT;
  const picture = { data, ratio, w, x: 0, y: 0 };
  const h = pictureHeight(picture);
  return { ...picture, x: (1 - w) / 2, y: (1 - h) / 2 };
}

// Keeps a free-placed box on the slide at a usable size, keeping its proportions.
export function placeBox(box: Rect, x: number, y: number, w: number): Rect {
  const width = Math.max(MIN_WIDTH, Math.min(1, w));
  const height = Math.min(1, (width * box.h) / box.w);
  return {
    x: Math.max(0, Math.min(1 - width, x)),
    y: Math.max(0, Math.min(1 - height, y)),
    w: width,
    h: height,
  };
}
