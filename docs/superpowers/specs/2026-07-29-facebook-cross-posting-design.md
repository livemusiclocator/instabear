# Facebook cross-posting

## Goal

When a location's carousel is posted to Instagram, also post it to the
linked Facebook Page — by default, but configurable per location, reusing
the same images and caption rather than generating anything new.

## Config: `src/constants/locations.js`

Each `LOCATIONS` entry gains a `channels` field:

```js
{
  slug: 'stkilda',
  displayName: 'St Kilda',
  postcodes: [...],
  channels: ['instagram', 'facebook'],
}
```

Default for all three current locations: both channels. To exclude a
location from a channel (e.g. skip Instagram for one location on one day,
per the user's "hard to automate" call on this — it's not a recurring
pattern, so no date/day-of-week logic is needed), hand-edit the array
before that day's run, the same way `locations.js` is already edited
directly for other changes.

## Trigger and flow

No new button, no new user action. The existing "Post to Instagram" click
handler in `src/instagramgallery.jsx` (`handleInstagramPost`) does the
following, per location:

1. If `'instagram'` is in the location's `channels`, post to Instagram
   exactly as today (unchanged).
2. If `'facebook'` is in the location's `channels`, also post to Facebook,
   reusing:
   - The same image URLs already uploaded to GitHub for the Instagram
     carousel (`uploadedImages.urls` — no new rendering, no new upload).
   - The same combined caption (`uploadedImages.captions` /
     `combinedCaption`) used for the Instagram carousel container.
     Instagram-style `@handle` venue mentions in the caption will render
     as inert plain text on Facebook (not broken, just non-functional as
     tags) — accepted for v1, not solved.

Because this rides the same button click, **`pi-automation/pi-automation.js`
needs no changes at all** — it already just clicks
`#post-instagram-btn-${slug}` once per location; that handler doing more
internally is invisible to Puppeteer.

## Facebook Graph API mechanics

At post time (not stored/cached):
1. `GET /me/accounts` using the existing `VITE_INSTAGRAM_ACCESS_TOKEN`
   user token to get the Facebook Page ID and a Page Access Token. No
   second token to provision or refresh independently — it's derived from
   the token already being kept alive by the existing refresh automation.
2. For each image URL: `POST /{page-id}/photos` with `url=<image-url>`,
   `published=false`, the Page Access Token — returns a photo ID without
   publishing it as a standalone post.
3. One `POST /{page-id}/feed` with `attached_media=[{"media_fbid": id},
   ...]` for all photo IDs, `message=<combined caption>`, the Page Access
   Token — produces a single native multi-photo Facebook post.

## Prerequisite (operational, not a code task)

The current access token (regenerated earlier tonight with
`pages_show_list`, `business_management`, `instagram_basic`,
`instagram_manage_insights`, `instagram_content_publish`,
`pages_read_engagement`) does **not** include `pages_manage_posts` — the
scope required to actually create Page posts. Before this feature can
post for real, the token needs regenerating via Graph API Explorer with
`pages_manage_posts` added, same process used for tonight's Instagram
token. This blocks live testing, not implementation/code-review.

## Error handling and success tracking

Facebook post result (success or failure) is appended to the same
`uploadStatus` UI text already used for Instagram's status, so a human
looking at the page can see both outcomes.

The Pi's `checkCarouselSuccess`/success-tally logic is **not** extended to
verify Facebook — it continues checking Instagram's status only, unchanged.
Reasoning: that DOM-scraping success-check has already proven fragile once
tonight (a confirmed false negative for Fitzroy with an unresolved root
cause). Adding a second, similarly fragile detection path for a second
platform increases the surface area for exactly that failure mode, for a
channel that isn't gating anything today. Facebook posting is best-effort
from the Pi automation's perspective for v1 — a Facebook failure does not
fail the overall run.

## Out of scope (parked for future brainstorms, not designed here)

Surfaced during this conversation, deliberately not addressed in this spec:
- **Reels/short-form video** — likely the single biggest lever for actual
  follower growth (both Instagram and Facebook algorithmically favor Reels
  reach to non-followers over static carousels), but a substantial new
  feature, not a config change.
- **Reviving/finishing `src/instagramstories.jsx`** — an existing,
  seemingly-unused Stories generator already in the codebase; unclear if
  it's wired to real posting. Worth investigating before building anything
  new for Stories, since it may already be most of the way there.
- **AI-generated caption "editorial texture"** — using an LLM to add voice
  to captions (currently a plain data dump) as a lighter-weight substitute
  for full editorial opinion content, which the team doesn't have the
  staffing for.
- **Artist tagging** (in addition to existing venue tagging) — valuable in
  principle (artist followings can dwarf venue followings). Update: confirmed
  after this spec was written that `api.lml.live`'s gig data does carry act
  social URLs (`sets[].act.instagram_url`/`facebook_url`) for a minority of
  gigs (~14% in one sample), which removes the original blocker (no reliable
  name→handle matching) - see the parked act-tagging brainstorm. Still not
  designed/built.
- **Hashtag strategy** — cheap, could ride along with a future caption
  change, not designed here.
- **Real Facebook Page tagging for venues** — confirmed live (screenshot,
  2026-07-29) that the `@handle` venue mentions reused from the Instagram
  caption render as inert plain text on Facebook, not real tags (no blue
  link, no notification to the venue). This was an accepted trade-off when
  designing this feature (reuse the same caption as-is), not a bug. Real
  Facebook tagging would need each venue's Facebook Page ID (not Instagram
  username) and Facebook's own mention syntax - a separate lookup from the
  existing `venueInstagramHandles.json`, not designed here.

## Testing

Same project-wide constraints as tonight's other work: no automated test
framework. Verify with `npm run build` / `npx eslint` for the React
changes. Do not trigger a live post (Instagram or Facebook) without the
user present — this is doubly true here since Facebook posting is new and
unverified, and a live test cannot happen at all until the token is
regenerated with `pages_manage_posts`.
