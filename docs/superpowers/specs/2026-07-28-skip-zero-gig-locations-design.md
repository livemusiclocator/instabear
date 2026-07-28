# Skip posting for zero-gig locations

## Goal

When a location has zero gigs on a given day, the automated posting
pipeline must not attempt to post anything for it — no Instagram API
calls, no error, no partial "title-slide-only" post. Builds on the
location-config centralization from earlier tonight
(`docs/superpowers/specs/2026-07-28-geelong-location-config-design.md`).

## Why this matters now

A third location (Geelong & The Bellarine) was just added and, unlike
St Kilda/Fitzroy, may realistically have zero gigs on many days. Without
this fix: the app would still render a title-slide-only "carousel" (1
image), and if posted, Instagram's Graph API would likely reject it
(carousel media type requires ≥2 children) — or worse, if the button is
simply hidden for 0 gigs without the Pi knowing, `pi-automation.js`'s
`postLocationCarousel()` would time out after 120s waiting for a button
that will never appear and abort the *entire* run over one empty location.

## Design

### 1. `src/instagramgallery.jsx` — expose gig count as data attributes

The Carousel component already renders `{gigs.length} gigs found for
{location}` in a `<div>` as soon as gig data loads (well before any
button click). Add `data-location-slug` and `data-gig-count` attributes
to that same div so the count is machine-readable without parsing prose
text (location display names contain `&` and commas, which makes text
parsing fragile):

```jsx
<div className="text-gray-700 mb-2" data-location-slug={id} data-gig-count={gigs.length}>
  {gigs.length} gigs found for {location}
  ...
</div>
```

### 2. `src/instagramgallery.jsx` — hide action buttons at zero gigs

Wrap the existing Generate/Post/Download button block in a
`gigs.length > 0` check; render a plain "No gigs found today" message
instead when there's nothing to post. This is a safety net for a human
manually using the page — it can't stop the *automated* pipeline from
attempting to post (that's handled in the Pi script below), but it
keeps the manual UI honest and prevents a human from triggering an
Instagram API call that would just fail.

### 3. `pi-automation/pi-automation.js` — pre-check gig counts, skip cleanly

Immediately after page load (same point as the existing "page-loaded"
screenshot, before the per-location posting loop), read all three gig
counts in one `page.evaluate()` call using the new data attributes,
producing `{ [slug]: count }`.

In the posting loop: for each location, if its count is 0, log a clear
skip message (`"Skipping {displayName} - no gigs today"`) and `continue`
— never call `postLocationCarousel` for it, so there's no
`waitForSelector` wait and no timeout risk.

Track which locations were actually attempted (count > 0) separately
from which were skipped. In the success-check phase, only run
`checkCarouselSuccess` for attempted locations — skipped locations are
excluded entirely from the success tally, not counted as either success
or failure.

**Edge case: every location has zero gigs.** `results` would be an empty
array; requiring "all succeed" over an empty set is vacuously true,
which is correct behavior (nothing failed), but the existing local-test
"at least one success" check would incorrectly throw. Explicitly handle
this: if the attempted list is empty, log "No locations had gigs today -
nothing to post" and treat the run as complete successfully, skipping
both the local-test and production success-requirement branches.

The temp-images cleanup step at the end is unaffected — since skipped
locations never call `renderSlidesToImages`, no images for them ever
land in `temp-images/` in the first place.

## Out of scope

- Facebook cross-posting (separate feature, queued up next, own
  brainstorm)
- Any change to what counts as a "gig" or how gigs are fetched/filtered
  — this only affects whether a post is *attempted* once the count is
  known

## Testing

Same constraints as tonight's other pi-automation.js work: `npm run
build` + `npx eslint` for the React changes, `node --check` for the Pi
script, manual trace-through of the loop/skip/tally logic. No live
`node pi-automation.js` run without the user present — this can be
verified live in the test we're about to run together (today's real
gig data will exercise the "has gigs" path for whichever locations have
listings; the "zero gigs" path itself may need a dry mental walk-through
or a deliberately empty date unless one of today's three locations
happens to have none).
