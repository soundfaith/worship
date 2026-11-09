import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
nextEnv.loadEnvConfig(ROOT);
const OUTPUT_DIR = path.join(ROOT, "assets", "backgrounds");
const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_API = "https://api.unsplash.com";
const UNSPLASH_REFERRAL = "https://unsplash.com/?utm_source=assembly&utm_medium=referral";
const TARGET_PER_CATEGORY = 20;
const PER_PAGE = 30;
const MAX_PAGES = 10;
const MIN_WIDTH = 1920;
const MIN_HEIGHT = 1080;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const REQUEST_HEADERS = {
  Authorization: `Client-ID ${ACCESS_KEY ?? ""}`,
  "Accept-Version": "v1",
};

const CATEGORIES = [
  ["worship", "church worship congregation praise"],
  ["prayer", "prayer hands church"],
  ["family", "family together home"],
  ["bible", "open bible scripture"],
  ["light", "church light beams"],
  ["community", "church community people"],
  ["mountains", "mountains landscape"],
  ["sunrise", "sunrise landscape"],
  ["christmas", "christmas nativity church"],
  ["easter", "easter cross resurrection"],
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withReferral(value) {
  const url = new URL(value);
  url.searchParams.set("utm_source", "assembly");
  url.searchParams.set("utm_medium", "referral");
  return url.href;
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("Downloaded image is not a JPEG.");
  }
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  throw new Error("Could not read the downloaded JPEG dimensions.");
}

async function unsplashRequest(url, description) {
  const target = new URL(url);
  if (target.protocol !== "https:" || !["api.unsplash.com", "images.unsplash.com"].includes(target.hostname)) {
    throw new Error(`${description} returned an unsupported Unsplash URL.`);
  }
  for (;;) {
    const response = await fetch(target, {
      headers: target.hostname === "api.unsplash.com" ? REQUEST_HEADERS : {},
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    const detail = response.ok ? "" : await response.text();
    const rateLimited = response.status === 429 ||
      (response.status === 403 && /rate limit exceeded/i.test(detail));
    if (rateLimited) {
      const reset = Number(response.headers.get("x-ratelimit-reset"));
      if (!Number.isFinite(reset) || reset <= 0) {
        throw new Error("Unsplash rate limit exceeded. The reset time was not provided; rerun after the limit window resets. Downloaded images and metadata have been saved.");
      }
      const waitMs = Math.max(1000, reset * 1000 - Date.now() + 1000);
      console.warn(`Unsplash rate limit reached. Retrying in ${Math.ceil(waitMs / 1000)} seconds.`);
      await sleep(waitMs);
      continue;
    }
    if (!response.ok) {
      throw new Error(`${description} failed (HTTP ${response.status}): ${detail.slice(0, 500)}`);
    }
    return response;
  }
}

async function searchPhotos(query, page) {
  const url = new URL(`${UNSPLASH_API}/search/photos`);
  url.search = new URLSearchParams({
    query,
    page: String(page),
    per_page: String(PER_PAGE),
    orientation: "landscape",
    order_by: "relevant",
    content_filter: "high",
  }).toString();
  const response = await unsplashRequest(url, `Search for "${query}"`);
  const data = await response.json();
  return data.results ?? [];
}

async function recordDownload(photo) {
  const response = await unsplashRequest(photo.links.download_location, `Download tracking for ${photo.id}`);
  await response.arrayBuffer();
}

function photoMetadata(photo, category, filename, dimensions) {
  const photographer = photo.user?.name?.trim() || "Unknown photographer";
  return {
    id: photo.id,
    category,
    file: filename,
    title: photo.alt_description || photo.description || "",
    photographer,
    photographerUrl: withReferral(photo.user.links.html),
    unsplashUrl: withReferral(photo.links.html),
    unsplashReferralUrl: UNSPLASH_REFERRAL,
    license: "Unsplash License",
    licenseUrl: "https://unsplash.com/license",
    width: dimensions.width,
    height: dimensions.height,
    attribution: `Photo by ${photographer} on Unsplash`,
  };
}

async function downloadPhoto(photo, category) {
  const directory = path.join(OUTPUT_DIR, category);
  const filename = `${category}-${photo.id}.jpg`;
  const finalPath = path.join(directory, filename);
  await fs.mkdir(directory, { recursive: true });

  try {
    const existing = await fs.readFile(finalPath);
    if (existing.length > MAX_IMAGE_BYTES) {
      throw new Error(`Existing photo ${filename} is larger than 25 MB.`);
    }
    const dimensions = jpegDimensions(existing);
    if (dimensions.width < MIN_WIDTH || dimensions.height < MIN_HEIGHT) {
      throw new Error(`Existing photo ${filename} is ${dimensions.width}x${dimensions.height}; minimum is 1920x1080.`);
    }
    return photoMetadata(photo, category, filename, dimensions);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const url = new URL(photo.urls.raw);
  url.searchParams.set("w", String(photo.width));
  url.searchParams.set("h", String(photo.height));
  url.searchParams.set("fit", "max");
  url.searchParams.set("fm", "jpg");
  url.searchParams.set("q", "88");

  await recordDownload(photo);
  const response = await unsplashRequest(url, `Download ${photo.id}`);
  const contentType = response.headers.get("content-type")?.split(";")[0].toLowerCase();
  if (contentType !== "image/jpeg") {
    throw new Error(`Unsplash returned ${contentType ?? "an unknown content type"} for ${photo.id}.`);
  }
  const image = Buffer.from(await response.arrayBuffer());
  if (!image.length || image.length > MAX_IMAGE_BYTES) {
    throw new Error(`Downloaded photo ${photo.id} is empty or larger than 25 MB.`);
  }
  const dimensions = jpegDimensions(image);
  if (dimensions.width < MIN_WIDTH || dimensions.height < MIN_HEIGHT) {
    throw new Error(`Downloaded photo ${photo.id} is ${dimensions.width}x${dimensions.height}; minimum is 1920x1080.`);
  }

  const temporaryPath = `${finalPath}.tmp`;
  try {
    await fs.writeFile(temporaryPath, image, { flag: "wx" });
    await fs.rename(temporaryPath, finalPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }

  return photoMetadata(photo, category, filename, dimensions);
}

async function readExistingLibrary() {
  const photosByCategory = new Map();
  const photoIds = new Set();
  for (const [category] of CATEGORIES) {
    const metadataPath = path.join(OUTPUT_DIR, category, "metadata.json");
    let metadata;
    try {
      metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") {
        photosByCategory.set(category, []);
        continue;
      }
      throw new Error(`Could not read ${metadataPath}: ${error.message}`);
    }
    if (!Array.isArray(metadata.photos)) {
      throw new Error(`${metadataPath} must contain a photos array.`);
    }
    for (const photo of metadata.photos) {
      if (!/^[A-Za-z0-9_-]+$/.test(photo.id) || photo.category !== category ||
          photo.file !== `${category}-${photo.id}.jpg` || photoIds.has(photo.id)) {
        throw new Error(`Invalid or duplicate photo metadata in ${metadataPath}.`);
      }
      await fs.access(path.join(OUTPUT_DIR, category, photo.file));
      photoIds.add(photo.id);
    }
    photosByCategory.set(category, metadata.photos);
  }
  return { photosByCategory, photoIds };
}

async function writeMetadata(category, photos) {
  const metadataPath = path.join(OUTPUT_DIR, category, "metadata.json");
  const temporaryPath = `${metadataPath}.tmp`;
  const metadata = {
    provider: "Unsplash",
    generatedAt: new Date().toISOString(),
    photos,
  };
  await fs.writeFile(temporaryPath, `${JSON.stringify(metadata, null, 2)}\n`);
  await fs.rename(temporaryPath, metadataPath);
}

async function createCategory(category, query, photos, photoIds) {
  if (photos.length >= TARGET_PER_CATEGORY) {
    console.log(`${category}: already has ${photos.length} photos; skipping.`);
    return;
  }

  console.log(`${category}: searching Unsplash for "${query}"...`);
  let downloaded = 0;
  for (let page = 1; page <= MAX_PAGES && photos.length < TARGET_PER_CATEGORY; page++) {
    const results = await searchPhotos(query, page);
    if (!results.length) break;
    for (const photo of results) {
      if (photos.length >= TARGET_PER_CATEGORY) break;
      if (!/^[A-Za-z0-9_-]+$/.test(photo.id ?? "") || photoIds.has(photo.id) ||
          !photo.urls?.raw || !photo.links?.download_location ||
          !photo.links?.html || !photo.user?.links?.html ||
          photo.width < MIN_WIDTH || photo.height < MIN_HEIGHT || photo.width < photo.height) {
        continue;
      }
      const metadata = await downloadPhoto(photo, category);
      photos.push(metadata);
      photoIds.add(photo.id);
      downloaded++;
      await writeMetadata(category, photos);
      console.log(`  ${photos.length}/${TARGET_PER_CATEGORY}: ${metadata.file} (${metadata.width}x${metadata.height})`);
      await sleep(250);
    }
    if (results.length < PER_PAGE) break;
  }
  if (photos.length < TARGET_PER_CATEGORY) {
    throw new Error(`${category}: found only ${photos.length}/${TARGET_PER_CATEGORY} qualifying unique images after ${MAX_PAGES} pages.`);
  }
  console.log(`${category}: added ${downloaded} photos.`);
}

async function main() {
  if (!ACCESS_KEY) {
    throw new Error("Set UNSPLASH_ACCESS_KEY before running this script.");
  }
  const { photosByCategory, photoIds } = await readExistingLibrary();
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  for (const [category, query] of CATEGORIES) {
    await createCategory(category, query, photosByCategory.get(category), photoIds);
  }
  console.log(`Background library ready at ${path.relative(ROOT, OUTPUT_DIR)}.`);
}

main().catch((error) => {
  console.error(`Background library download failed: ${error.message}`);
  process.exitCode = 1;
});
