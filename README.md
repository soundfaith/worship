# CFC Assembly Slide Generator

Next.js (App Router) + TypeScript + Tailwind. Assemblies and custom songs persist in the browser (localStorage); PowerPoint export uses PptxGenJS.

```
npm install
npm run dev
```

- `data/songs.json` – song library (563 songs), served by `/api/songs`. `data/report.json` – import report.
- `docs/TEMPLATES.md` – how to add PowerPoint templates (drop a `.pptx` in `templates/`, run `npm run templates`).
- `scripts/templates.mjs` – imports `templates/*.pptx` and indexes the packs in `public/templates/`.
- `tools/song-import/` – Python scripts that regenerated the library from the source PPTX (`python build_library.py <file.pptx>`; output goes to `data/`).
- `src/lib` – types, slide generation, lyric splitting, templates, export. `src/components` – editor tabs.
