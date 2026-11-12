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
- Photo and background galleries lazy-load previews. Local photo and template previews are resized and cached by Next.js and the browser; selected photos are saved with the slide, so reopening an assembly does not require downloading them again. Browser caches may be cleared or expire.
- Each song begins with a title slide. The Content tab can insert a daily Gospel reading based on the assembly date, select another date, or use edited text. Long readings are split into editable slides; opening and closing prayer text remains available.
- In Edit & Present, a font change can apply to the current slide or every slide. Choosing Presentation default removes the selected slide font overrides.
- Gospel slides keep paragraphs together when possible, using 22–30 pt text in the default reading layout. Oversized paragraphs split across slides; a warning appears in Review if edits or a different layout exceed the readable minimum.
- Existing presentations keep their saved slides. Use **Regenerate** in Review to apply updated pagination; this replaces manual slide edits.
- Existing saved slide decks are not changed automatically. Use **Regenerate** in Review to add Gospel and song title slides; regeneration replaces manual slide edits.
- `data/gospel/` contains the four Gospel books from the World English Bible (Updated) and the Gospel references from the [SoundFaith Bible project's Catholic Mass reading index](https://github.com/cpbjr/catholic-readings-api). Daily readings use source paragraph breaks without verse numbers. The copied index covers August 25, 2025–December 31, 2027, and uses US Catholic Mass readings; September 18, 2025 is missing from the source. When no reading is available, enter one manually. References with alternatives use the first option; partial-verse references show the whole verse. The interface flags skipped verse numbers in the source.
- `docs/TEMPLATES.md` – how to import every slide of a PowerPoint as a background and choose independent content layouts. Presentations are prepared locally with Windows PowerPoint and committed as generated assets for Vercel.
- `scripts/templates.mjs` – imports `templates/*.pptx` and indexes the packs in `public/templates/`.
- `tools/song-import/` – Python scripts that regenerated the library from the source PPTX (`python build_library.py <file.pptx>`; output goes to `data/`).
- `src/lib` – types, slide generation, lyric splitting, templates, export. `src/components` – editor tabs.
