# Act tagging

## Goal

Tag real Instagram accounts for performing acts in the gig-guide caption
text, the same way venues are already tagged — reusing the pattern, not
building a parallel system.

## Background

`api.lml.live`'s gig data carries `sets[].act.instagram_url` /
`facebook_url` for a minority of gigs (~14% in one sample). Confirmed via
live API sampling: some values are junk placeholder URLs (e.g.
`https://www.instagram.com/?hl=en`), not real act-specific handles, so
they need filtering before use. This was parked in the Facebook
cross-posting spec until that feature was verified working — it now is.

## What "tagging" means here

Neither this feature nor the existing venue tagging touches the slide
*image*. `GigPanel` renders gig name, venue name, suburb, time, and
price — no handles. The tag lives entirely in the **caption text**
posted alongside the image: Instagram auto-links a plain `@username` in
caption text into a real, clickable, notifying tag if that account
exists. Act tagging follows the identical mechanism.

## Scope: Instagram only

Facebook plain-text `@mentions` are already confirmed inert (no blue
link, no notification) — the same limitation venue tagging accepted.
Real Facebook tagging needs each act's Facebook Page ID via the Graph
API's tagging mechanism, which isn't available from `act.facebook_url`
alone. Not solved here, same as venues.

## Validation: `extractInstagramHandle(url)`

New pure function, lightweight heuristic, no network calls (so it can
never add latency or a failure mode to the post pipeline):

1. Must parse as a URL on `instagram.com`.
2. Take the first non-empty path segment as the candidate username.
3. Reject if that segment is empty, or matches a blocklist of known
   non-profile paths: `explore`, `accounts`, `reel`, `reels`, `p`, `tv`,
   `stories`. Catches the `?hl=en`-style junk pattern seen in real data.
4. Reject if the segment contains characters outside `[A-Za-z0-9._]`.
5. Return `@username` on success, otherwise `null`.

This won't catch every possible bad handle (e.g. a real-looking but
nonexistent username), but it catches the placeholder pattern actually
observed, without adding any live verification dependency.

## Data flow: `getValidActHandles(gig)`

New pure function: walks `gig.sets`, reads `set.act.instagram_url` for
each entry, runs it through `extractInstagramHandle`, returns the array
of valid `@handle` strings (deduplicated). No new fetch — `sets` is
already present in the gig data `fetchGigs` retrieves today.

Gigs can have multiple acts (support acts etc.). All acts with a valid
handle are tagged, not just the first — acts with valid data are already
rare, so this doesn't meaningfully lengthen captions.

## Caption format

In `generateCaption()`, each gig's line currently is:

```
🎤 ${gig.name} @ ${gig.venue.name} (${venueHandle}) - ${gig.start_time}
```

Act handles append after the venue parenthetical, space-separated, only
present when non-empty:

```
🎤 Jamie Macdowell @ The Toff (@thetoffintown) @jamiemacdowell - 19:30
```

Multiple acts: `... (@thetoffintown) @act1 @act2 - 19:30`.

## Mention budget

No change to `buildCombinedCaption`. It already regex-extracts every
`@handle` from all slide captions and applies the existing fairness cap
(max 19 mentions) — act handles just join that same pool as more
`@handle` matches. Given acts are rare today, this won't meaningfully
crowd out venue mentions.

## Out of scope

- Facebook act tagging (see Scope above).
- Live account-existence verification (see Validation above).
- Using an act's own image in the carousel, or any visual change to
  slides — raised during earlier brainstorming as a future idea, not
  designed here.
- A hand-curated fallback mapping (like `venueInstagramHandles.json`)
  for acts without usable API social URLs — explicitly not worth the
  manual effort per earlier discussion ("hard to automate... hard to be
  sure you have the right performers").

## Testing

No automated test framework in this project. Verify with `npm run
build` / `npx eslint`. Before relying on this in a live scheduled post,
manually generate captions for at least one real gig with known-valid
act data (e.g. today's "Jamie Macdowell @ The Toff" case) and read the
output caption text before posting, consistent with how the other
recent fixes this session were verified.
