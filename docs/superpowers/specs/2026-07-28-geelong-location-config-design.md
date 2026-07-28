# Add Geelong carousel + centralize location config

## Goal

Add a third Instagram carousel location — "Geelong & The Bellarine" — to the
posting pipeline, and stop hardcoding/duplicating location data (postcodes,
display names, DOM/button-ID slugs) across three places.

## Scope

In scope:
- `src/instagramgallery.jsx` — the self-contained file that actually drives
  the live posting pipeline (has its own local `Carousel`, `LocationTitleSlide`,
  and gig-filtering logic; does not import from `src/components/` or
  `src/constants/common.js`)
- `src/constants/common.js` — exports `ST_KILDA_POSTCODES` /
  `FITZROY_RICHMOND_POSTCODES`, consumed by `src/instagramstories.jsx`
- `pi-automation/pi-automation.js` — the Puppeteer script the Pi's cron job
  runs, which drives `instagramgallery.jsx`'s buttons by hardcoded ID
  (`#generate-images-btn-stkilda` etc.)

Out of scope:
- `src/components/Carousel.jsx` / `src/components/LocationTitleSlide.jsx` /
  `src/instagramstories.jsx` (the separate "Stories Generator" feature) —
  already generic per-location via props, not part of the posting pipeline
  `pi-automation.js` drives, not asked for
- De-duplicating `instagramgallery.jsx`'s other self-contained utils
  (`measureTextWidth`, `toTitleCase`, `getPostcode`, `formatPrice`,
  `generateCaption`, `GigPanel`) against their `src/utils/`/`src/components/`
  equivalents — real duplication, but unrelated to this task and risky to
  touch on a script we just spent a night stabilizing
- Facebook cross-posting (separate feature, to be brainstormed separately)

## New location data

Third location: **Geelong & The Bellarine** (slug: `geelong`)

Postcodes (union of Greater Geelong + Borough of Queenscliffe, including the
partial-overlap postcodes per user instruction to include them):
`3211, 3212, 3213, 3214, 3215, 3216, 3217, 3218, 3219, 3220, 3221, 3222, 3223,
3224, 3225, 3226, 3227, 3340`

## Design

### 1. New file: `src/constants/locations.js`

Plain ES module (no JSX) — the single source of truth:

```js
export const LOCATIONS = [
  {
    slug: 'stkilda',
    displayName: 'St Kilda',
    postcodes: ['3182', '3183', '3185'],
  },
  {
    slug: 'fitzroy',
    displayName: 'Fitzroy, Collingwood and Richmond',
    postcodes: ['3065', '3066', '3067', '3068', '3121'],
  },
  {
    slug: 'geelong',
    displayName: 'Geelong & The Bellarine',
    postcodes: [
      '3211', '3212', '3213', '3214', '3215', '3216', '3217', '3218',
      '3219', '3220', '3221', '3222', '3223', '3224', '3225', '3226',
      '3227', '3340',
    ],
  },
]
```

Both `src/instagramgallery.jsx` (bundled by Vite into the browser build) and
`pi-automation/pi-automation.js` (run directly by Node on the Pi) can import
this file with a plain relative `import` — confirmed both `package.json`s
have `"type": "module"`, so this works without a build step on the Pi side.

### 2. `src/constants/common.js`

`ST_KILDA_POSTCODES` / `FITZROY_RICHMOND_POSTCODES` stay exported (so
`instagramstories.jsx` doesn't need to change), but become thin derivations
from `LOCATIONS` instead of a separately hardcoded copy.

### 3. `src/instagramgallery.jsx`

- Import `LOCATIONS` from `./constants/locations`; remove the local
  `ST_KILDA_POSTCODES` / `FITZROY_RICHMOND_POSTCODES` consts (currently
  hardcoded and not even reading from `common.js`).
- Replace the two separate `useMemo` gig-filters with one that produces
  gigs-by-slug for every entry in `LOCATIONS`.
- Replace the two hardcoded `<Carousel>` JSX blocks with a `.map()` over
  `LOCATIONS`, passing `title={`${loc.displayName} Gigs`}`,
  `location={loc.displayName}`, `gigs={gigsBySlug[loc.slug]}`, `id={loc.slug}`.
- Rewrite the local `LocationTitleSlide` component's hardcoded
  `location === 'St Kilda' ? <one line> : <three hardcoded lines>` ternary
  with a generic auto-fit renderer: try the display name as one line at the
  largest font size, shrinking through a few preset sizes, and falling back
  to a greedy word-wrap into multiple lines at the smallest size if it still
  doesn't fit. Uses the file's existing local `measureTextWidth` util
  (already present, currently unused for this purpose).

### 4. `pi-automation/pi-automation.js`

- Import `LOCATIONS` from `../src/constants/locations.js`.
- Extract the per-location Puppeteer sequence (wait for generate button →
  click → screenshot → 90s delay → wait for post button → click →
  screenshot → 90s delay) into `async function postLocationCarousel(page, location)`,
  using `location.slug` for selectors/screenshot filenames and
  `location.displayName` in log messages.
- Extract the success-check DOM evaluation into
  `async function checkCarouselSuccess(page, titleText)`, parameterized by
  the heading text to search for (currently hardcoded per-location twice).
- In `automate()`: replace the two duplicated inline blocks with
  `for (const location of LOCATIONS) { await postLocationCarousel(page, location); }`,
  then after the existing final 10-minute wait, loop over `LOCATIONS` again
  calling `checkCarouselSuccess` for each and require all to succeed
  (production) / any to succeed (local test mode) — same logic as today,
  generalized from 2 to N locations.
- No change to timing behavior for St Kilda/Fitzroy — same waits, same
  screenshot names, same log message shapes (just driven by `displayName`
  instead of literal strings).

## Testing

- `node --check` both changed `.js`/`.jsx` files for syntax validity.
- Visual check of the new title-slide auto-fit logic isn't practical without
  a browser; will rely on code review of the algorithm plus how it degrades
  (still renders *something* readable even if the estimate is imperfect).
- **Will not trigger a live `node pi-automation.js` run against the real
  Instagram account unsupervised.** Given tonight's history of subtle
  failures in this exact script, a live end-to-end test should happen with
  the user present (or let Wednesday's cron run naturally) rather than
  posting live content to a real account with no one watching.

## Rollout

Same as tonight's other pi-automation.js fixes: push to `main` (triggers
GitHub Pages redeploy for the `instagramgallery.jsx` changes), then `scp`
the updated `pi-automation.js` to the Pi (raw.githubusercontent.com's CDN
cache makes `wget` unreliable for fast-follow changes).
