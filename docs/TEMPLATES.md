# PowerPoint backgrounds and content layouts

## Import a presentation

1. Put a 16:9 `.pptx` file in the project's `templates/` folder.
2. On Windows with desktop Microsoft PowerPoint installed, close that presentation in PowerPoint
   and run `npm run templates`. This also runs before `npm run dev` and `npm run build`.
3. Choose the new template in the assembly editor. Each source slide becomes a selectable background.
4. Commit the source PPTX, generated `public/templates/<name>/` folder, and
   `src/lib/templates.generated.json` together before deploying to Vercel. PowerPoint is not needed
   on Vercel when the generated assets match the source.

The importer removes editable slide text before rendering the artwork. Each background is flattened
to a PNG: original shapes, animations and text formatting are not editable in the output.
Text embedded in an image cannot be removed, and text inherited from slide masters or layouts may
remain. Review each background before use. Only use presentations and images you have permission
to include in your repository.

Use `npm run templates -- --force` to regenerate everything. If a source file changes, prepare it
again on Windows before deploying; the build fails if it cannot prepare missing or stale assets.

## Choose slide designs

In **Review & Export**, select a slide and choose a background from its template. Content layouts
are independent of backgrounds: choose a title slide, song lyrics, title and text, centered text,
title only, text with an image on either side, title with one image, or title with two images.
There is also a layout for a title, text and two images.
Add images using the upload buttons shown for that layout. Content hidden by a layout is preserved
if you switch back. Custom slides initially use the content layout and its automatic background.

The automatic background uses slide 1 for cover slides, slide 2 for songs and slide 3 for content
(or the last available slide for short decks). Ocean uses slide 7 for content and image slides.
To change Ocean's defaults, edit the `slide` numbers in
`templates/Ocean.template.json` and run the importer again. Changing a slide's content layout does
not replace an explicitly selected background. Section template overrides are set in Review.

Inter is the default presentation font. Change it in the assembly's Details tab or override it
per slide in Review. Install the selected font on the computer that opens the exported PowerPoint.
The slide text color can also be adjusted to improve contrast against the selected background.
Use **Apply design to all** to copy a slide's layout, background, font and text color to other
slides of the same kind without changing their text or images.

Existing assemblies that used a removed template automatically display the first available
template; select a new template in Details to update the saved choice. Uploaded images and
assemblies are stored in the browser, so very large images or many slides can exhaust its storage.
