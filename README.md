# Assembly by SoundFaith

Next.js (App Router) + TypeScript + Tailwind. Assemblies and custom songs persist in the browser (localStorage); PowerPoint export uses PptxGenJS.

```
npm install
npm run dev
```

For development on a phone on the same trusted network, open the computer's LAN
address on port 3000. Next.js permits the address `192.168.1.133` in
`allowedDevOrigins` in `next.config.ts`; update that entry if the computer's
address changes, and restart the development server. Only add addresses you
trust. Assemblies and custom songs are stored separately per browser and origin,
so data created on the computer is not automatically shared with the phone or
the deployed app.

- `data/songs.json` – song library (563 songs), served by `/api/songs`. `data/report.json` – import report.
- Export a song directly from its library preview with a chosen template and lines per slide.
- The song library and assembly song picker filter by language, tempo, energy, and themes. English-only is the default; enable “Show other languages” to include songs with other or unspecified languages, including newly imported songs. Multiple themes match any selected theme; missing metadata does not match a specific tempo, energy, or theme.
- Photo and background galleries lazy-load previews. Local photo and template previews are resized and cached by Next.js and the browser; selected photos are saved with the slide, so reopening an assembly does not require downloading them again. Browser caches may be cleared or expire.
- Each song begins with a title slide. The Content tab can insert a daily Gospel reading based on the assembly date, select another date, or use edited text. Long readings are split into editable slides; opening and closing prayer text remains available.
- In Edit & Present, a font change can apply to the current slide or every slide. Choosing Presentation default removes the selected slide font overrides.
- Present directly from an assembly card without opening the editor. In presentation mode, use arrow keys or swipe left and right to change slides; close the presentation to return to where you started. If browser fullscreen is unavailable, the presentation fills the current window.
- Gospel slides keep paragraphs together when possible, using 22–30 pt text in the default reading layout. Oversized paragraphs split across slides; a warning appears in Review if edits or a different layout exceed the readable minimum.
- Long content (for example, a story) is added in the Content tab under **Long content**. Each item splits across slides the same way as the Gospel reading, and is placed after the announcements. Use the up/down arrows in Review to reposition it.
- In Review, the up/down arrows beside the preview move the selected slide. When the slide belongs to a song, the Gospel reading, or a long content item, you can choose to move only that slide or the whole section.
- The Review tab's **Media** panel has three cards: **Photo background** (a full-slide photo), **Image** (one free-placed picture per slide: drag it to move, drag the corner handle to resize, and it is exported at the same position), and **Video**. Local video files (up to 300 MB, MP4 recommended) are stored in this browser's IndexedDB, not in the assembly data, so they are not uploaded anywhere; a poster frame is kept with the slide. The video frame can be moved and resized like an image, and it fills the slide by default; it plays full slide in the preview and Presentation. In PPTX export, a local video is embedded at its frame. A YouTube link is exported as a full-frame thumbnail that links to the video, not as an embedded player, because embedded online videos show as empty placeholders in PowerPoint. Deleting an assembly does not remove its stored videos from this browser. GIF images keep their animation in the preview and in the exported PPTX.
- The layout list includes **Blank**, which hides the title and body text. The text is kept on the slide, so switching back to another layout restores it.

- Existing presentations keep their saved slides. Use **Regenerate** in Review to apply updated pagination; this replaces manual slide edits.
- Changing content in Step 2 keeps your work. Slides you edited keep their text and position, unedited text refreshes from the source, and slides you added by hand are kept. A slide you deleted can reappear if its source (song, Gospel, story, or announcement) still exists in the assembly.
- Existing saved slide decks are not changed automatically. Use **Regenerate** in Review to add Gospel and song title slides; regeneration replaces manual slide edits.
- `data/gospel/` contains the four Gospel books from the World English Bible (Updated) and the Gospel references from the [SoundFaith Bible project's Catholic Mass reading index](https://github.com/cpbjr/catholic-readings-api). Daily readings use source paragraph breaks without verse numbers. The copied index covers August 25, 2025–December 31, 2027, and uses US Catholic Mass readings; September 18, 2025 is missing from the source. When no reading is available, enter one manually. References with alternatives use the first option; partial-verse references show the whole verse. The interface flags skipped verse numbers in the source.
- `docs/TEMPLATES.md` – how to import every slide of a PowerPoint as a background and choose independent content layouts. Presentations are prepared locally with Windows PowerPoint and committed as generated assets for Vercel.
- `scripts/templates.mjs` – imports `templates/*.pptx` and indexes the packs in `public/templates/`.
- `tools/song-import/` – Python scripts that regenerated the library from the source PPTX (`python build_library.py <file.pptx>`; output goes to `data/`).
- `src/lib` – types, slide generation, lyric splitting, templates, export. `src/components` – editor tabs.
