import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
const PEXELS_KEY = process.env.PEXELS_API_KEY;
const LIBRARY_DIR = path.join(process.cwd(), "assets", "backgrounds");
const LIBRARY_CATEGORIES = ["worship", "prayer", "family", "bible", "light", "community", "mountains", "sunrise", "christmas", "easter"] as const;

type LibraryCategory = typeof LIBRARY_CATEGORIES[number];
type ImageProvider = "library" | "commons" | "unsplash" | "pexels";
type ImageResult = {
  id: string;
  title: string;
  artist: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  thumbnailUrl: string;
  provider: ImageProvider;
  providerLabel: string;
  downloadUrl?: string;
};
type LibraryPhoto = {
  id: string;
  category: LibraryCategory;
  file: string;
  title: string;
  photographer: string;
  photographerUrl: string;
  unsplashUrl: string;
  license: string;
  licenseUrl: string;
  width: number;
  height: number;
};
type CommonsPage = {
  pageid: number;
  title: string;
  imageinfo?: {
    thumburl?: string;
    descriptionurl?: string;
    mime?: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
};

function plainText(value: string | undefined, fallback: string): string {
  return (value ?? fallback)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function safeHttpsUrl(value: string | undefined): string {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function responseBody(image: Uint8Array): ArrayBuffer {
  const body = new ArrayBuffer(image.byteLength);
  new Uint8Array(body).set(image);
  return body;
}

function configuredProviders() {
  return [
    { id: "commons", label: "Wikimedia Commons" },
    ...(UNSPLASH_KEY ? [{ id: "unsplash", label: "Unsplash" }] : []),
    ...(PEXELS_KEY ? [{ id: "pexels", label: "Pexels" }] : []),
  ];
}

function validLibraryCategory(value: string | null): value is LibraryCategory {
  return LIBRARY_CATEGORIES.includes(value as LibraryCategory);
}

async function availableLibraryCategories(): Promise<LibraryCategory[]> {
  const categories: LibraryCategory[] = [];
  for (const category of LIBRARY_CATEGORIES) {
    try {
      await fs.access(path.join(LIBRARY_DIR, category, "metadata.json"));
      categories.push(category);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return categories;
}

async function readLibraryPhotos(category: LibraryCategory): Promise<LibraryPhoto[]> {
  const metadataPath = path.join(LIBRARY_DIR, category, "metadata.json");
  const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8")) as { photos?: LibraryPhoto[] };
  if (!Array.isArray(metadata.photos)) throw new Error(`The ${category} photo library metadata is invalid.`);
  for (const photo of metadata.photos) {
    if (!/^[A-Za-z0-9_-]+$/.test(photo.id) ||
        photo.category !== category ||
        photo.file !== `${category}-${photo.id}.jpg` ||
        typeof photo.title !== "string" ||
        typeof photo.photographer !== "string" ||
        typeof photo.photographerUrl !== "string" ||
        typeof photo.unsplashUrl !== "string" ||
        typeof photo.license !== "string" ||
        typeof photo.licenseUrl !== "string") {
      throw new Error(`The ${category} photo library contains invalid metadata.`);
    }
  }
  return metadata.photos;
}

async function readLibraryImage(category: string, id: string): Promise<Uint8Array | null> {
  if (!validLibraryCategory(category) || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
  const photos = await readLibraryPhotos(category);
  const photo = photos.find((entry) => entry.id === id);
  if (!photo) return null;
  return fs.readFile(path.join(LIBRARY_DIR, category, photo.file));
}

async function searchLibrary(category: string | null, cursor: string | null): Promise<{ images: ImageResult[]; nextCursor: string | null }> {
  if (!validLibraryCategory(category)) throw new Error("Choose a local photo library category.");
  const photos = await readLibraryPhotos(category);
  const page = Math.max(1, Number(cursor) || 1);
  const pageSize = 12;
  const start = (page - 1) * pageSize;
  const images = photos.slice(start, start + pageSize).map((photo) => ({
    id: `${category}:${photo.id}`,
    title: photo.title || "Unsplash photo",
    artist: photo.photographer || "Unknown photographer",
    license: photo.license,
    licenseUrl: photo.licenseUrl,
    sourceUrl: photo.unsplashUrl,
    thumbnailUrl: `/api/images?asset=${encodeURIComponent(`${category}/${photo.id}`)}`,
    provider: "library" as const,
    providerLabel: "Local library · Unsplash",
  }));
  return {
    images,
    nextCursor: start + pageSize < photos.length ? String(page + 1) : null,
  };
}

function providerFrom(value: string | null): ImageProvider | undefined {
  if (value === "library" || value === "commons" || value === "unsplash" || value === "pexels") return value;
  return undefined;
}

async function searchCommons(query: string, cursor: string | null): Promise<{ images: ImageResult[]; nextCursor: string | null }> {
  const apiUrl = new URL(COMMONS_API);
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "12",
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "720",
    format: "json",
  });
  if (cursor) params.set("gsroffset", cursor);
  apiUrl.search = params.toString();
  const response = await fetch(apiUrl, {
    headers: { "User-Agent": "AssemblyBySoundFaith/1.0 (Wikimedia Commons image search)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Wikimedia Commons returned HTTP ${response.status}.`);
  const data = await response.json() as {
    continue?: { gsroffset?: number };
    query?: { pages?: Record<string, CommonsPage> };
  };
  const images = Object.values(data.query?.pages ?? []).flatMap((page) => {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl || !info.mime || !ALLOWED_TYPES.has(info.mime)) return [];
    const metadata = info.extmetadata ?? {};
    return [{
      id: String(page.pageid),
      title: plainText(page.title.replace(/^File:/, ""), "Untitled image"),
      artist: plainText(metadata.Artist?.value, "Unknown author"),
      license: plainText(metadata.LicenseShortName?.value, "License details"),
      licenseUrl: safeHttpsUrl(metadata.LicenseUrl?.value),
      sourceUrl: safeHttpsUrl(info.descriptionurl),
      thumbnailUrl: info.thumburl,
      provider: "commons" as const,
      providerLabel: "Wikimedia Commons",
    }];
  });
  return { images, nextCursor: data.continue?.gsroffset?.toString() ?? null };
}

async function searchUnsplash(query: string, cursor: string | null): Promise<{ images: ImageResult[]; nextCursor: string | null }> {
  if (!UNSPLASH_KEY) throw new Error("Unsplash is not configured on this server.");
  const page = Math.max(1, Number(cursor) || 1);
  const url = new URL("https://api.unsplash.com/search/photos");
  url.search = new URLSearchParams({ query, page: String(page), per_page: "12", content_filter: "high" }).toString();
  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Unsplash returned HTTP ${response.status}.`);
  const data = await response.json() as {
    total_pages?: number;
    results?: {
      id: string;
      alt_description?: string;
      description?: string;
      user?: { name?: string; links?: { html?: string } };
      links?: { html?: string; download_location?: string };
      urls?: { small?: string; regular?: string };
    }[];
  };
  const images = (data.results ?? []).flatMap((photo) => {
    if (!photo.urls?.small || !photo.urls.regular || !photo.links?.html || !photo.links.download_location) return [];
    return [{
      id: photo.id,
      title: plainText(photo.description ?? photo.alt_description, "Unsplash photo"),
      artist: plainText(photo.user?.name, "Unknown photographer"),
      license: "Unsplash License",
      licenseUrl: "https://unsplash.com/license",
      sourceUrl: safeHttpsUrl(photo.links.html),
      thumbnailUrl: photo.urls.small,
      provider: "unsplash" as const,
      providerLabel: "Unsplash",
      downloadUrl: photo.links.download_location,
    }];
  });
  return { images, nextCursor: page < (data.total_pages ?? page) ? String(page + 1) : null };
}

async function searchPexels(query: string, cursor: string | null): Promise<{ images: ImageResult[]; nextCursor: string | null }> {
  if (!PEXELS_KEY) throw new Error("Pexels is not configured on this server.");
  const page = Math.max(1, Number(cursor) || 1);
  const url = new URL("https://api.pexels.com/v1/search");
  url.search = new URLSearchParams({ query, page: String(page), per_page: "12", orientation: "landscape" }).toString();
  const response = await fetch(url, {
    headers: { Authorization: PEXELS_KEY },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Pexels returned HTTP ${response.status}.`);
  const data = await response.json() as {
    next_page?: string;
    photos?: {
      id: number;
      alt?: string;
      photographer?: string;
      photographer_url?: string;
      url?: string;
      src?: { medium?: string; large?: string };
    }[];
  };
  const images = (data.photos ?? []).flatMap((photo) => {
    if (!photo.src?.medium || !photo.src.large || !photo.url) return [];
    return [{
      id: String(photo.id),
      title: plainText(photo.alt, "Pexels photo"),
      artist: plainText(photo.photographer, "Unknown photographer"),
      license: "Pexels License",
      licenseUrl: "https://www.pexels.com/license/",
      sourceUrl: safeHttpsUrl(photo.url),
      thumbnailUrl: photo.src.medium,
      provider: "pexels" as const,
      providerLabel: "Pexels",
    }];
  });
  return { images, nextCursor: data.next_page ? String(page + 1) : null };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("providers") === "1") {
    try {
      const categories = await availableLibraryCategories();
      return NextResponse.json({
        providers: [...(categories.length ? [{ id: "library", label: "Local photo library" }] : []), ...configuredProviders()],
        libraryCategories: categories,
      }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return NextResponse.json({
        error: `Could not load local photo libraries: ${error instanceof Error ? error.message : "unknown error"}`,
      }, { status: 500 });
    }
  }
  const asset = searchParams.get("asset");
  if (asset) {
    const [category, id, ...extra] = asset.split("/");
    if (!category || !id || extra.length) return NextResponse.json({ error: "Invalid local photo." }, { status: 400 });
    try {
      const image = await readLibraryImage(category, id);
      if (!image) return NextResponse.json({ error: "Local photo not found." }, { status: 404 });
      return new Response(responseBody(image), {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(image.byteLength),
          "Cache-Control": "public, max-age=86400, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      return NextResponse.json({
        error: `Could not read local photo: ${error instanceof Error ? error.message : "unknown error"}`,
      }, { status: 500 });
    }
  }
  const provider = providerFrom(searchParams.get("provider"));
  if (!provider || (provider !== "library" && !configuredProviders().some((item) => item.id === provider))) {
    return NextResponse.json({ error: "Choose an available image provider." }, { status: 400 });
  }
  const query = searchParams.get("q")?.trim() ?? "";
  if (provider !== "library" && (query.length < 2 || query.length > 100)) {
    return NextResponse.json({ error: "Enter a search term between 2 and 100 characters." }, { status: 400 });
  }

  try {
    const cursor = searchParams.get("cursor");
    const result = provider === "library"
      ? await searchLibrary(searchParams.get("category"), cursor)
      : provider === "commons"
        ? await searchCommons(query, cursor)
        : provider === "unsplash"
          ? await searchUnsplash(query, cursor)
          : await searchPexels(query, cursor);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (error) {
    return NextResponse.json({
      error: `Image search failed: ${error instanceof Error ? error.message : "unknown error"}`,
    }, { status: 502 });
  }
}

async function readBoundedImage(response: Response): Promise<Uint8Array> {
  if (!response.ok) throw new Error(`Image provider returned HTTP ${response.status}.`);
  const contentType = response.headers.get("content-type")?.split(";")[0].toLowerCase() ?? "";
  if (!ALLOWED_TYPES.has(contentType)) throw new Error("The selected file is not a supported image format.");
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_IMAGE_BYTES) throw new Error("The selected image is larger than 5 MB.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The selected image could not be read.");
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("The selected image is larger than 5 MB.");
    }
    chunks.push(value);
  }
  if (bytesRead === 0) throw new Error("The selected image is empty.");
  const image = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    image.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return image;
}

export async function POST(request: Request) {
  let body: { provider?: string; id?: string; url?: string; downloadUrl?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid image request." }, { status: 400 });
  }
  if (body.provider === "library") {
    const [category, id, ...extra] = (body.id ?? "").split(":");
    if (!category || !id || extra.length) return NextResponse.json({ error: "Invalid local photo." }, { status: 400 });
    try {
      const image = await readLibraryImage(category, id);
      if (!image) return NextResponse.json({ error: "Local photo not found." }, { status: 404 });
      return new Response(responseBody(image), {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(image.byteLength),
          "Cache-Control": "private, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      return NextResponse.json({
        error: `Could not read local photo: ${error instanceof Error ? error.message : "unknown error"}`,
      }, { status: 500 });
    }
  }
  let url: URL;
  try {
    url = new URL(body.url ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid image URL." }, { status: 400 });
  }
  if (url.protocol !== "https:" || url.port) {
    return NextResponse.json({ error: "Only HTTPS image URLs are supported." }, { status: 400 });
  }

  const provider = providerFrom(body.provider ?? "commons");
  if (!provider || provider === "library") {
    return NextResponse.json({ error: "Choose an available image provider." }, { status: 400 });
  }
  const isCommonsUrl = provider === "commons" && url.hostname === "thumb.wikimedia.org" && url.pathname.startsWith("/wikipedia/commons/thumb/");
  const isUnsplashUrl = provider === "unsplash" && url.hostname === "images.unsplash.com" && url.pathname.startsWith("/photo-");
  const isPexelsUrl = provider === "pexels" && url.hostname === "images.pexels.com" && url.pathname.startsWith("/photos/");
  if (!isCommonsUrl && !isUnsplashUrl && !isPexelsUrl) {
    return NextResponse.json({ error: "The image URL does not match the selected provider." }, { status: 400 });
  }
  if (provider === "unsplash" && !UNSPLASH_KEY) {
    return NextResponse.json({ error: "Unsplash is not configured on this server." }, { status: 503 });
  }
  if (provider === "pexels" && !PEXELS_KEY) {
    return NextResponse.json({ error: "Pexels is not configured on this server." }, { status: 503 });
  }

  try {
    if (provider === "unsplash") {
      let downloadUrl: URL;
      try {
        downloadUrl = new URL(body.downloadUrl ?? "");
      } catch {
        return NextResponse.json({ error: "Unsplash download metadata is missing." }, { status: 400 });
      }
      if (downloadUrl.protocol !== "https:" || downloadUrl.hostname !== "api.unsplash.com" || !/^\/photos\/[A-Za-z0-9_-]+\/download$/.test(downloadUrl.pathname)) {
        return NextResponse.json({ error: "Invalid Unsplash download URL." }, { status: 400 });
      }
      const tracked = await fetch(downloadUrl, {
        headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!tracked.ok) throw new Error(`Unsplash download tracking returned HTTP ${tracked.status}.`);
    }
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15000) });
    const image = await readBoundedImage(response);
    return new Response(responseBody(image), {
      headers: {
        "Content-Type": response.headers.get("content-type")?.split(";")[0].toLowerCase() ?? "application/octet-stream",
        "Content-Length": String(image.byteLength),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: `Image download failed: ${error instanceof Error ? error.message : "unknown error"}`,
    }, { status: 502 });
  }
}
