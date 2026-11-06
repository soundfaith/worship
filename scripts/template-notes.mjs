import path from "node:path";
import { DOMParser } from "@xmldom/xmldom";

const PRESENTATION = "http://schemas.openxmlformats.org/presentationml/2006/main";
const DRAWING = "http://schemas.openxmlformats.org/drawingml/2006/main";
const OFFICE_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
export const LAYOUTS = ["cover", "song", "content", "image"];
export const SONG_MARKERS = ["song1", "song2", "song3"];
const MARKERS = [...LAYOUTS, ...SONG_MARKERS];

export function defaultLayouts(slideCount) {
  return {
    cover: { slide: 1 },
    song: { slide: Math.min(2, slideCount) },
    content: { slide: Math.min(3, slideCount) },
    image: { slide: Math.min(4, slideCount) },
  };
}

function elements(node, namespace, name) {
  return Array.from(node.getElementsByTagNameNS(namespace, name));
}

async function readXml(zip, name, optional = false) {
  const file = zip.file(name);
  if (!file) {
    if (optional) return null;
    throw new Error(`Missing PowerPoint part: ${name}.`);
  }
  const errors = [];
  const document = new DOMParser({ onError: (level, message) => errors.push(`${level}: ${message}`) })
    .parseFromString(await file.async("string"), "application/xml");
  if (errors.length) throw new Error(`Invalid XML in ${name}: ${errors[0]}`);
  return document;
}

function relationshipsPath(part) {
  return path.posix.join(path.posix.dirname(part), "_rels", `${path.posix.basename(part)}.rels`);
}

function targetPath(part, relationship) {
  if (!relationship || relationship.getAttribute("TargetMode")?.toLowerCase() === "external") {
    throw new Error(`Invalid relationship in ${part}.`);
  }
  const target = relationship.getAttribute("Target");
  if (!target || target.includes("\\") || target.includes("#") || target.includes("?")) {
    throw new Error(`Invalid relationship target in ${part}.`);
  }
  const resolved = target.startsWith("/")
    ? path.posix.normalize(target.slice(1))
    : path.posix.normalize(path.posix.join(path.posix.dirname(part), target));
  if (resolved === ".." || resolved.startsWith("../")) throw new Error(`Invalid relationship target in ${part}.`);
  return resolved;
}

function paragraphText(paragraph) {
  let text = "";
  function visit(node) {
    if (node.namespaceURI === DRAWING && node.localName === "t") {
      text += node.textContent;
    } else if (node.namespaceURI === DRAWING && node.localName === "br") {
      text += "\n";
    } else {
      for (let child = node.firstChild; child; child = child.nextSibling) visit(child);
    }
  }
  visit(paragraph);
  return text;
}

export async function readTemplateNotes(zip) {
  const presentationPath = "ppt/presentation.xml";
  const presentation = await readXml(zip, presentationPath);
  const relations = await readXml(zip, relationshipsPath(presentationPath));
  const byId = new Map(elements(relations, PACKAGE_REL, "Relationship").map((r) => [r.getAttribute("Id"), r]));
  const slides = elements(presentation, PRESENTATION, "sldId");
  if (!slides.length) throw new Error("The presentation has no slides.");
  const markers = {};

  for (const [index, slide] of slides.entries()) {
    const number = index + 1;
    const relation = byId.get(slide.getAttributeNS(OFFICE_REL, "id"));
    if (!relation || relation.getAttribute("Type") !== `${OFFICE_REL}/slide`) {
      throw new Error(`Missing slide relationship for slide ${number}.`);
    }
    const slidePath = targetPath(presentationPath, relation);
    const slideRelations = await readXml(zip, relationshipsPath(slidePath), true);
    if (!slideRelations) continue;
    const notesRelations = elements(slideRelations, PACKAGE_REL, "Relationship")
      .filter((r) => r.getAttribute("Type") === `${OFFICE_REL}/notesSlide`);
    if (notesRelations.length > 1) throw new Error(`Slide ${number} has multiple notes relationships.`);
    if (!notesRelations.length) continue;
    const notes = await readXml(zip, targetPath(slidePath, notesRelations[0]));
    const shapes = elements(notes, PRESENTATION, "sp").filter((shape) =>
      elements(shape, PRESENTATION, "ph").some((placeholder) => placeholder.getAttribute("type") === "body"));
    for (const shape of shapes) {
      for (const paragraph of elements(shape, DRAWING, "p")) {
        for (const line of paragraphText(paragraph).split(/\r\n|\r|\n/)) {
          const match = /^\s*layout\s*:\s*(.*?)\s*$/i.exec(line);
          if (!match) continue;
          const role = match[1].toLowerCase();
          if (!MARKERS.includes(role)) {
            throw new Error(`Unknown layout marker on slide ${number}. Use layout:cover, layout:song, layout:song1, layout:song2, layout:song3, layout:content, or layout:image.`);
          }
          if (markers[role] && markers[role] !== number) {
            throw new Error(`Duplicate layout:${role} markers on slides ${markers[role]} and ${number}. Assign each role to one slide.`);
          }
          markers[role] = number;
        }
      }
    }
  }
  return { markers, slideCount: slides.length };
}
