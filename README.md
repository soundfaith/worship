# CFC Assembly Slide Generator

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
- `docs/TEMPLATES.md` – how to import every slide of a PowerPoint as a background and choose independent content layouts. Presentations are prepared locally with Windows PowerPoint and committed as generated assets for Vercel.
- `scripts/templates.mjs` – imports `templates/*.pptx` and indexes the packs in `public/templates/`.
- `tools/song-import/` – Python scripts that regenerated the library from the source PPTX (`python build_library.py <file.pptx>`; output goes to `data/`).
- `src/lib` – types, slide generation, lyric splitting, templates, export. `src/components` – editor tabs.
