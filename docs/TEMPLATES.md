# Making a PowerPoint template

Drop a `.pptx` into the `templates/` folder (project root) and run `npm run templates`
(this also runs automatically before `npm run dev` and `npm run build`). It appears in the app's
template list. Commit the generated `public/templates/<name>/` folder so Vercel serves it.

Start from `templates/starter/starter-template.pptx` (regenerate with `node scripts/make-starter.mjs`).
The file name becomes the template name (`warm-advent.pptx` → "Warm Advent").

## Slides

| Slide | Layout | Used for |
|-------|--------|----------|
| 1 | `cover` | Welcome, theme and closing slides |
| 2 | `song` | Every song slide |
| 3 | `content` | Prayer, announcements, birthdays, anniversaries, scripture, custom slides, and any page missing from the template |
| 4 | `image` | Slides with an uploaded picture (optional) |

Only `content` is required. To use another order, add a small text box `layout:cover` (or `song`,
`content`, `image`) to a slide; it is removed on import.

In the editor, **Page layout** on each slide picks one of these (Auto picks by slide type), so
"+ Add custom slide" gives a `content` page unless you choose another layout or add an image.

## Placeholders

Each slide needs two text boxes with exactly this text. Set the font, size, colour, alignment and position in PowerPoint;
those are imported.

- `{{title}}`: song title, slide heading
- `{{body}}`: lyrics or text. The text shrinks automatically if long, so leave plenty of room (a 4-line song at 36pt is the target).
- `{{image}}` (image slide only): a box marking where the uploaded picture goes (it is not drawn).

## What is imported

- Slide background: solid colour, gradient (linear), or a picture (Format Background → Picture)
- Rectangles, rounded rectangles and ellipses with a solid or gradient fill (transparency works)
- Pictures (PNG/JPG), drawn in place, cropped to fit. Put a photo behind a semi-transparent shape for readability
- Use plain RGB colours (no "lighter 40%" tints) and set a fill explicitly on every shape

Not imported: outlines/borders, shadows, text other than the placeholders, grouped shapes (ungroup), SVG/EMF
pictures, WordArt, animations. The import prints a warning for anything skipped.

## Design guide

Keep slides minimal: a background, at most a couple of soft shapes, lots of free space for text,
and good contrast (projected rooms are bright). Use fonts installed on the projecting computer
(Georgia, Calibri, Arial…). 16:9 slide size.

## Alternative: hand-made pack

A folder `public/templates/<id>/template.json` (same JSON the importer writes, see `public/templates/glory/`)
plus any images works too.
