# PowerPoint backgrounds and content layouts

## Import a presentation

1. Put a 16:9 `.pptx` file in the project's `templates/` folder. Optionally add the markers below
   to slide speaker notes to select the automatic backgrounds.
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

## Built-in designs

Assembly includes the **Atelier**, **Nocturne**, **Olive**, **Pilgrim**, **Lumen**, and **Stillwater**
design sets, with composed title, lyric, text, and image layouts. Pilgrim, Lumen, and Stillwater
include photo-oriented color overlays and gradient treatments. They are built in and do not require
importing a PowerPoint file. New assemblies start with Atelier. Choose a design in the Assembly
**Details** tab, then choose a slide layout in **Review**.

Choose **Blank** for a solid-color slide with no template artwork. In **Details**, choose a common
color or open the color picker for any background color. The color applies to every slide in the
assembly, and text color adjusts automatically for contrast. Blank slides export with a native
PowerPoint background fill; uploaded images and slide text remain editable.

## Add logos and free photo backgrounds

Upload a PNG, JPEG, or WebP logo in **Details**. It is included across the deck; adjust its size
there, then drag it in the **Review** slide preview to set its position for every slide. Keyboard
arrow keys move the focused logo, and Shift+Arrow moves it farther.

In **Review**, choose **Local photo library** to browse the downloaded category images, or search
Wikimedia Commons to choose a photo background for the selected slide. Use **Show more photos** to
page through additional results. To enable live Unsplash or Pexels search, create
an API key with that provider and set `UNSPLASH_ACCESS_KEY` or `PEXELS_API_KEY` in the server's
environment (for local development, use `.env.local`; never expose these as `NEXT_PUBLIC_*`
variables). Configured sources appear in the photo source menu. Unsplash downloads are registered
through its API as required by its guidelines.

The app stores a resized copy of each selected photo and its author, source, provider and license
details in the assembly, so previews and exports do not depend on a remote image staying online.
Photo-focused designs such as **Pilgrim**, **Lumen**, and **Stillwater** layer typography, gradients,
and soft-focus panels over the chosen photo. Check the linked license before redistributing an
export; terms and attribution requirements differ by provider and image. Search requires an
internet connection.

## Create a local background library

The one-time library script targets 20 relevant, unique landscape photos for each of
`worship`, `prayer`, `family`, `bible`, `light`, `community`, `mountains`, `sunrise`, `christmas`,
and `easter` into `assets/backgrounds/<category>/` and stops with an error if it cannot find 20
qualifying photos for a category. It accepts only source photos at least
1920×1080, saves JPEGs at the source dimensions, and writes a `metadata.json` with photographer,
Unsplash, and license attribution links in every category. Existing indexed images are retained,
so rerunning the command safely fills any incomplete categories.

Use this workflow only with Unsplash authorization that permits downloading and local storage.
The script registers each selected photo with Unsplash's download endpoint. Set the server-side
`UNSPLASH_ACCESS_KEY`, then run `npm run backgrounds:download`. For example, in PowerShell:

```powershell
$env:UNSPLASH_ACCESS_KEY = "your-access-key"
npm run backgrounds:download
```

The script is intentionally separate from development and production builds; it is not a runtime
image integration. To make the local library available in the app, keep the generated
`assets/backgrounds/` folders and `metadata.json` files in the project when building or deploying;
the image API includes them in its server output.

## Choose automatic backgrounds with speaker notes

In PowerPoint, open **View > Notes** (or the Notes pane at the bottom of the slide), and put each
marker on its own line in the notes of the slide whose artwork you want to use:

| Speaker note | Used for |
| --- | --- |
| `layout:cover` | Welcome and closing prayer slides |
| `layout:song` | Song lyrics |
| `layout:song1` | First song's background |
| `layout:song2` | Second song's background |
| `layout:song3` | Third song's background |
| `layout:content` | Prayer, theme, announcements, birthdays, anniversaries and other content |
| `layout:image` | Slides that contain an uploaded image |

These are all the supported automatic background markers. They are case-insensitive, and normal
speaker notes may appear on other lines. A slide may have more than one marker, each on a separate
line; each marker must be assigned to only one slide. Unknown markers or duplicates stop the import
with an error so they can be corrected. Save and close the PowerPoint file, then run `npm run templates`.
Notes do not become part of the background image.

If numbered song markers are present, songs cycle through them in numeric order: with all three,
song 4 uses `song1`, song 5 uses `song2`, and so on. Every lyric slide belonging to a song uses the
same background. If only some numbered markers are present, the available ones cycle in numeric order.
If there are no numbered markers, `layout:song` (or its default) is used for every song. A standalone
song preview or export uses the first numbered song background. Existing slides created before song
identities were added are grouped by consecutive matching song titles; regenerate to distinguish
consecutive copies of the same song. Changing song order in the assembly updates the sequence.

Without a marker, the importer uses the existing `.template.json` setting for that role, if present;
otherwise it uses slide 1 for cover, slide 2 for song, slide 3 for content and slide 4 for images.
For shorter presentations, each role beyond the last slide uses the last available slide. If an
existing JSON configuration has no image role, it continues to use its content background. A marker takes precedence
over an existing JSON setting for its role. For example, Ocean currently has a JSON setting for
content and image; add both markers if you want to override both. A marker selects artwork, not the
text-and-image layout: layouts remain independently selectable in Review. Existing explicit
background choices are preserved; select **Use automatic** in Review to return a slide to the
template's automatic background.

## Choose slide designs

In **Review** (called **Review & Export** on desktop), select a slide and choose a background from its template. Content layouts
are independent of backgrounds: choose a title slide, song lyrics, title and text, centered text,
title only, text with an image on either side, title with one image, or title with two images.
There is also a layout for a title, text and two images.
Add images using the upload buttons shown for that layout. Content hidden by a layout is preserved
if you switch back. Custom slides initially use the content layout and its automatic background.

Changing a slide's content layout does not replace an explicitly selected background. Section
template overrides are set in Review.

Calibri is the default presentation font. Change it in the assembly's Details tab to remember it
for new assemblies and song exports in this browser, or override it per slide in Review. Existing
assemblies retain their saved font. Install the selected font on the computer that opens the
exported PowerPoint.
The slide text color can also be adjusted to improve contrast against the selected background.
Use **Apply design to all** to copy a slide's layout, background, font and text color to other
slides of the same kind without changing their text or images.

Existing assemblies that used a removed template automatically display the first available
template; select a new template in Details to update the saved choice. Uploaded images and
assemblies are stored in the browser, so very large images or many slides can exhaust its storage.
