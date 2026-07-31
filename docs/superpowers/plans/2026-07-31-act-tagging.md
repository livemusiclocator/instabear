# Act Tagging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tag real Instagram accounts for performing acts in the gig-guide caption text, reusing the existing venue-tagging mechanism (a plain `@handle` in caption text that Instagram auto-links).

**Architecture:** Two new pure functions in `src/instagramgallery.jsx` — `extractInstagramHandle(url)` (validates/parses one Instagram profile URL) and `getValidActHandles(gig)` (walks a gig's `sets[]` and returns deduplicated valid handles) — feed into `generateCaption()`'s existing per-gig caption line, appending act handles after the venue-handle parenthetical.

**Tech Stack:** Plain JS (no new dependencies). No automated test framework exists in this project — verification is `npm run build` / `npx eslint`, throwaway Node scripts for pure-function logic, and a final manual check against real live data.

## Global Constraints

- Instagram only — no Facebook tagging, no changes to Facebook posting code. (spec: "Scope: Instagram only")
- No image/slide changes — `GigPanel` is untouched; only caption text changes. (spec: "What 'tagging' means here")
- `extractInstagramHandle` must make no network calls. (spec: "Validation")
- No changes to `buildCombinedCaption`'s existing mention-cap logic — act handles just join the same `@handle` regex-extraction pool it already scans. (spec: "Mention budget")
- No new fetch — `gig.sets` is already present in data `fetchGigs` retrieves today. (spec: "Data flow")

---

## Reference: full spec

Read `docs/superpowers/specs/2026-07-31-act-tagging-design.md` for full context before starting. Key details repeated here so each task is self-contained.

**Validation rules for `extractInstagramHandle(url)`:**
1. `null`/empty input → `null`.
2. Must parse as a URL (via the `URL` constructor) with hostname `instagram.com` (with or without leading `www.`), case-insensitive.
3. Take the first non-empty path segment as the candidate username.
4. Reject (`null`) if that segment is missing, or is one of: `explore`, `accounts`, `reel`, `reels`, `p`, `tv`, `stories` (case-insensitive).
5. Reject (`null`) if the segment contains any character outside `[A-Za-z0-9._]`.
6. Otherwise return `` `@${username}` ``.

**`getValidActHandles(gig)`:** walks `gig.sets` (default to `[]` if absent), reads `set.act?.instagram_url` for each entry, runs it through `extractInstagramHandle`, returns the deduplicated array of valid `@handle` strings, preserving first-seen order.

**Caption line format** (in `generateCaption`, current code at `src/instagramgallery.jsx:539-559`):
- Venue handle behaves exactly as today: `(${venueHandle})` right after the venue name, only when present.
- Act handles append after that, space-separated, only when non-empty: `` `🎤 ${gig.name} @ ${gig.venue.name} (${venueHandle}) ${actHandles.join(' ')} - ${gig.start_time}` ``.
- Example: `🎤 Jamie Macdowell @ The Toff (@thetoffintown) @jamiemacdowell - 19:30`.
- If there's no venue handle but there are act handles, the act handles still append after the venue name (no parens, since there's nothing to put in them): `🎤 GigName @ VenueName @actHandle - 19:30`.

---

### Task 1: `extractInstagramHandle(url)`

**Files:**
- Modify: `src/instagramgallery.jsx` (insert after line 510, before `function generateCaption` at line 512)

**Interfaces:**
- Produces: `extractInstagramHandle(url: string | null | undefined) => string | null` — returns `` `@username` `` or `null`. Used by Task 2's `getValidActHandles`.

- [ ] **Step 1: Write a throwaway verification script**

Create `/tmp/verify-act-tagging-task1.mjs`:

```js
const INSTAGRAM_NON_PROFILE_PATHS = new Set([
  'explore', 'accounts', 'reel', 'reels', 'p', 'tv', 'stories',
]);

function extractInstagramHandle(url) {
  if (!url) return null;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
  if (hostname !== 'instagram.com') return null;

  const segments = parsed.pathname.split('/').filter(Boolean);
  const username = segments[0];
  if (!username) return null;
  if (INSTAGRAM_NON_PROFILE_PATHS.has(username.toLowerCase())) return null;
  if (!/^[A-Za-z0-9._]+$/.test(username)) return null;

  return `@${username}`;
}

const cases = [
  ['https://www.instagram.com/jamiemacdowell', '@jamiemacdowell'],
  ['https://instagram.com/jamiemacdowell/', '@jamiemacdowell'],
  ['https://www.instagram.com/?hl=en', null],
  ['https://www.instagram.com/', null],
  ['https://www.instagram.com/explore/', null],
  ['https://www.instagram.com/accounts/login/', null],
  ['https://www.instagram.com/p/Cabc123/', null],
  ['https://www.facebook.com/jamiemacdowell', null],
  ['not a url', null],
  ['', null],
  [null, null],
  [undefined, null],
  ['https://www.instagram.com/some.user_123', '@some.user_123'],
];

let failures = 0;
for (const [input, expected] of cases) {
  const actual = extractInstagramHandle(input);
  const pass = actual === expected;
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}: extractInstagramHandle(${JSON.stringify(input)}) = ${JSON.stringify(actual)} (expected ${JSON.stringify(expected)})`);
}
console.log(failures === 0 ? '\nAll cases passed.' : `\n${failures} case(s) failed.`);
```

- [ ] **Step 2: Run it and confirm every case passes**

Run: `node /tmp/verify-act-tagging-task1.mjs`
Expected: every line prints `PASS`, final line is `All cases passed.`. If any `FAIL`, fix the function logic in the script and re-run before moving on.

- [ ] **Step 3: Copy the verified function into `src/instagramgallery.jsx`**

Insert after line 510 (the closing `});` of the `console.log('DEBUG: Loaded venue Instagram handles:'...)` block) and before line 512 (`function generateCaption(...)`):

```js
const INSTAGRAM_NON_PROFILE_PATHS = new Set([
  'explore', 'accounts', 'reel', 'reels', 'p', 'tv', 'stories',
]);

// Validates an act's Instagram URL into a taggable @handle, rejecting
// junk placeholder URLs like https://www.instagram.com/?hl=en that
// api.lml.live sometimes returns instead of a real profile link.
function extractInstagramHandle(url) {
  if (!url) return null;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
  if (hostname !== 'instagram.com') return null;

  const segments = parsed.pathname.split('/').filter(Boolean);
  const username = segments[0];
  if (!username) return null;
  if (INSTAGRAM_NON_PROFILE_PATHS.has(username.toLowerCase())) return null;
  if (!/^[A-Za-z0-9._]+$/.test(username)) return null;

  return `@${username}`;
}
```

- [ ] **Step 4: Lint and build**

Run: `npx eslint src/instagramgallery.jsx && npm run build`
Expected: both succeed with no errors (warnings about the caniuse-lite/browserslist data are pre-existing and expected).

- [ ] **Step 5: Delete the throwaway script and commit**

```bash
rm /tmp/verify-act-tagging-task1.mjs
git add src/instagramgallery.jsx
git commit -m "$(cat <<'EOF'
Add extractInstagramHandle for act-tagging URL validation

Parses an act's instagram_url from api.lml.live into a taggable
@handle, rejecting junk placeholder URLs (e.g.
https://www.instagram.com/?hl=en) and known non-profile paths.
No network calls, so it can't add latency or a failure mode to the
post pipeline. Not wired up to caption generation yet.
EOF
)"
```

---

### Task 2: `getValidActHandles(gig)`

**Files:**
- Modify: `src/instagramgallery.jsx` (insert directly after `extractInstagramHandle`, added in Task 1)

**Interfaces:**
- Consumes: `extractInstagramHandle(url) => string | null` from Task 1.
- Produces: `getValidActHandles(gig: { sets?: Array<{ act?: { instagram_url?: string } }> }) => string[]` — deduplicated, first-seen order. Used by Task 3's `generateCaption`.

- [ ] **Step 1: Write a throwaway verification script**

Create `/tmp/verify-act-tagging-task2.mjs` (duplicates `extractInstagramHandle` from Task 1 verbatim, since this is a standalone throwaway script with no import access to the JSX file):

```js
const INSTAGRAM_NON_PROFILE_PATHS = new Set([
  'explore', 'accounts', 'reel', 'reels', 'p', 'tv', 'stories',
]);

function extractInstagramHandle(url) {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
  if (hostname !== 'instagram.com') return null;
  const segments = parsed.pathname.split('/').filter(Boolean);
  const username = segments[0];
  if (!username) return null;
  if (INSTAGRAM_NON_PROFILE_PATHS.has(username.toLowerCase())) return null;
  if (!/^[A-Za-z0-9._]+$/.test(username)) return null;
  return `@${username}`;
}

function getValidActHandles(gig) {
  const sets = gig.sets || [];
  const handles = [];
  sets.forEach((set) => {
    const handle = extractInstagramHandle(set.act?.instagram_url);
    if (handle && !handles.includes(handle)) {
      handles.push(handle);
    }
  });
  return handles;
}

const cases = [
  [
    { sets: [{ act: { instagram_url: 'https://www.instagram.com/jamiemacdowell' } }] },
    ['@jamiemacdowell'],
  ],
  [{ sets: [] }, []],
  [{}, []],
  [
    {
      sets: [
        { act: { instagram_url: 'https://www.instagram.com/actone' } },
        { act: { instagram_url: 'https://www.instagram.com/?hl=en' } },
        { act: { instagram_url: 'https://www.instagram.com/acttwo' } },
      ],
    },
    ['@actone', '@acttwo'],
  ],
  [
    {
      sets: [
        { act: { instagram_url: 'https://www.instagram.com/actone' } },
        { act: { instagram_url: 'https://www.instagram.com/actone' } },
      ],
    },
    ['@actone'],
  ],
  [{ sets: [{ act: {} }] }, []],
  [{ sets: [{}] }, []],
];

let failures = 0;
for (const [input, expected] of cases) {
  const actual = getValidActHandles(input);
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}: getValidActHandles(${JSON.stringify(input)}) = ${JSON.stringify(actual)} (expected ${JSON.stringify(expected)})`);
}
console.log(failures === 0 ? '\nAll cases passed.' : `\n${failures} case(s) failed.`);
```

- [ ] **Step 2: Run it and confirm every case passes**

Run: `node /tmp/verify-act-tagging-task2.mjs`
Expected: every line prints `PASS`, final line is `All cases passed.`.

- [ ] **Step 3: Copy the verified function into `src/instagramgallery.jsx`**

Insert directly after the `extractInstagramHandle` function added in Task 1:

```js
// Support acts share a gig, so tag every act with a valid handle, not
// just the first - valid act data is already rare (~14% of gigs in one
// sample), so this doesn't meaningfully lengthen captions.
function getValidActHandles(gig) {
  const sets = gig.sets || [];
  const handles = [];
  sets.forEach((set) => {
    const handle = extractInstagramHandle(set.act?.instagram_url);
    if (handle && !handles.includes(handle)) {
      handles.push(handle);
    }
  });
  return handles;
}
```

- [ ] **Step 4: Lint and build**

Run: `npx eslint src/instagramgallery.jsx && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 5: Delete the throwaway script and commit**

```bash
rm /tmp/verify-act-tagging-task2.mjs
git add src/instagramgallery.jsx
git commit -m "$(cat <<'EOF'
Add getValidActHandles for per-gig act handle lookup

Walks a gig's sets[].act.instagram_url, validates each with
extractInstagramHandle, and returns the deduplicated valid handles.
Not wired up to caption generation yet.
EOF
)"
```

---

### Task 3: Wire act handles into `generateCaption`

**Files:**
- Modify: `src/instagramgallery.jsx:539-559` (the `.map(gig => {...})` inside `generateCaption`)

**Interfaces:**
- Consumes: `getValidActHandles(gig) => string[]` from Task 2.

- [ ] **Step 1: Write a throwaway verification script for the exact caption-line output**

Create `/tmp/verify-act-tagging-task3.mjs` (duplicates both prior functions plus the new caption-line logic, since this is a standalone script):

```js
const INSTAGRAM_NON_PROFILE_PATHS = new Set([
  'explore', 'accounts', 'reel', 'reels', 'p', 'tv', 'stories',
]);

function extractInstagramHandle(url) {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
  if (hostname !== 'instagram.com') return null;
  const segments = parsed.pathname.split('/').filter(Boolean);
  const username = segments[0];
  if (!username) return null;
  if (INSTAGRAM_NON_PROFILE_PATHS.has(username.toLowerCase())) return null;
  if (!/^[A-Za-z0-9._]+$/.test(username)) return null;
  return `@${username}`;
}

function getValidActHandles(gig) {
  const sets = gig.sets || [];
  const handles = [];
  sets.forEach((set) => {
    const handle = extractInstagramHandle(set.act?.instagram_url);
    if (handle && !handles.includes(handle)) {
      handles.push(handle);
    }
  });
  return handles;
}

// Mirrors the new per-gig line inside generateCaption's .map(gig => {...})
function buildCaptionLine(gig, venueHandle) {
  const actHandles = getValidActHandles(gig);
  const actSuffix = actHandles.length > 0 ? ` ${actHandles.join(' ')}` : '';
  const base = venueHandle
    ? `🎤 ${gig.name} @ ${gig.venue.name} (${venueHandle})`
    : `🎤 ${gig.name} @ ${gig.venue.name}`;
  return `${base}${actSuffix} - ${gig.start_time}`;
}

const cases = [
  [
    {
      name: 'Jamie Macdowell',
      venue: { name: 'The Toff' },
      start_time: '19:30',
      sets: [{ act: { instagram_url: 'https://www.instagram.com/jamiemacdowell' } }],
    },
    '@thetoffintown',
    '🎤 Jamie Macdowell @ The Toff (@thetoffintown) @jamiemacdowell - 19:30',
  ],
  [
    {
      name: 'No Act Data Gig',
      venue: { name: 'The Toff' },
      start_time: '20:00',
      sets: [],
    },
    '@thetoffintown',
    '🎤 No Act Data Gig @ The Toff (@thetoffintown) - 20:00',
  ],
  [
    {
      name: 'No Venue Handle Gig',
      venue: { name: 'Unknown Venue' },
      start_time: '21:00',
      sets: [{ act: { instagram_url: 'https://www.instagram.com/someact' } }],
    },
    '',
    '🎤 No Venue Handle Gig @ Unknown Venue @someact - 21:00',
  ],
  [
    {
      name: 'Neither',
      venue: { name: 'Unknown Venue' },
      start_time: '22:00',
      sets: [],
    },
    '',
    '🎤 Neither @ Unknown Venue - 22:00',
  ],
  [
    {
      name: 'Two Acts',
      venue: { name: 'The Toff' },
      start_time: '18:00',
      sets: [
        { act: { instagram_url: 'https://www.instagram.com/actone' } },
        { act: { instagram_url: 'https://www.instagram.com/acttwo' } },
      ],
    },
    '@thetoffintown',
    '🎤 Two Acts @ The Toff (@thetoffintown) @actone @acttwo - 18:00',
  ],
];

let failures = 0;
for (const [gig, venueHandle, expected] of cases) {
  const actual = buildCaptionLine(gig, venueHandle);
  const pass = actual === expected;
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${actual}`);
  if (!pass) console.log(`  expected: ${expected}`);
}
console.log(failures === 0 ? '\nAll cases passed.' : `\n${failures} case(s) failed.`);
```

- [ ] **Step 2: Run it and confirm every case passes**

Run: `node /tmp/verify-act-tagging-task3.mjs`
Expected: every line prints `PASS`, final line is `All cases passed.`.

- [ ] **Step 3: Apply the same change to `generateCaption` in `src/instagramgallery.jsx`**

Replace the `.map` callback currently at lines 539-559:

```js
  caption += slideGigs
    .map(gig => {
      // Check if we have an Instagram handle for this venue - ONLY exact ID match
      const venueId = gig.venue.id;
      const venueHandle = venueHandles[venueId] || '';
      
      // Debug log each caption line generation
      console.log(`DEBUG: Caption for ${gig.name} @ ${gig.venue.name}:`, {
        venueId,
        exactMatch: venueId in venueHandles,
        handleResult: venueHandle
      });
      
      // Format the caption line with handle if available
      if (venueHandle) {
        return `🎤 ${gig.name} @ ${gig.venue.name} (${venueHandle}) - ${gig.start_time}`;
      } else {
        return `🎤 ${gig.name} @ ${gig.venue.name} - ${gig.start_time}`;
      }
    })
    .join('\n');
```

with:

```js
  caption += slideGigs
    .map(gig => {
      // Check if we have an Instagram handle for this venue - ONLY exact ID match
      const venueId = gig.venue.id;
      const venueHandle = venueHandles[venueId] || '';
      const actHandles = getValidActHandles(gig);

      // Debug log each caption line generation
      console.log(`DEBUG: Caption for ${gig.name} @ ${gig.venue.name}:`, {
        venueId,
        exactMatch: venueId in venueHandles,
        handleResult: venueHandle,
        actHandles
      });

      const actSuffix = actHandles.length > 0 ? ` ${actHandles.join(' ')}` : '';

      // Format the caption line with venue/act handles if available
      if (venueHandle) {
        return `🎤 ${gig.name} @ ${gig.venue.name} (${venueHandle})${actSuffix} - ${gig.start_time}`;
      } else {
        return `🎤 ${gig.name} @ ${gig.venue.name}${actSuffix} - ${gig.start_time}`;
      }
    })
    .join('\n');
```

- [ ] **Step 4: Lint and build**

Run: `npx eslint src/instagramgallery.jsx && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 5: Delete the throwaway script and commit**

```bash
rm /tmp/verify-act-tagging-task3.mjs
git add src/instagramgallery.jsx
git commit -m "$(cat <<'EOF'
Wire act handles into gig-guide caption lines

Each caption line now appends every act's validated @handle after the
existing venue-handle parenthetical, e.g. "Jamie Macdowell @ The Toff
(@thetoffintown) @jamiemacdowell - 19:30". No changes to venue
tagging, image rendering, or the existing mention-cap logic in
buildCombinedCaption, which already regex-extracts every @handle
regardless of source.
EOF
)"
```

---

### Task 4: Manual live verification against real data

No code changes in this task — this is the manual acceptance gate the spec requires before relying on this in a live scheduled post ("Testing" section).

**Files:** none.

- [ ] **Step 1: Find a real gig with valid act data via the live API**

Run (adjust the date to today, in `YYYY-MM-DD` form, and `location` to `melbourne` or `geelong`):

```bash
curl -s "https://api.lml.live/gigs/query?location=melbourne&date_from=<TODAY>&date_to=<TODAY>" | python3 -c "
import json,sys
data = json.load(sys.stdin)
for g in data:
    for s in (g.get('sets') or []):
        act = s.get('act') or {}
        ig = act.get('instagram_url')
        if ig:
            print(g['name'], '|', g['venue']['name'], '|', ig)
"
```

If today has no gigs with `instagram_url` set at all, try `date_to` a few days out, or fall back to visually confirming via the site (Step 2) with whatever real gig data is available that day — the goal is confirming the code path fires correctly on real data at least once, not a specific date.

- [ ] **Step 2: Generate images on the live/deployed site and read the console-logged caption**

1. Open the deployed site (check `pi-automation/pi-automation.js` for `GITHUB_PAGES_URL`, currently `https://instabear.lml.live/`) in a browser, or run `npm run dev` and open `http://localhost:5173/`.
2. Open the browser console.
3. Click "Generate Images" for the location that had the gig found in Step 1.
4. In the console, find the `DEBUG: Generated caption:` log line(s) and locate the caption line for that specific gig.
5. Confirm it reads `🎤 <gig name> @ <venue name> [(<venue handle>)] <act handle(s)> - <time>` with the act handle(s) matching what Step 1 found (accounting for junk URLs being correctly excluded, if any were present for that gig).

- [ ] **Step 3: Confirm no regression for gigs without act data**

In the same console output, spot-check at least one caption line for a gig with no `sets` or no valid `instagram_url` and confirm it reads exactly as it did before this feature (no trailing space, no stray `@`, i.e. matches the "Neither" case format verified in Task 3).

- [ ] **Step 4: Report result**

If both checks in Steps 2-3 look correct, this plan is complete — no further commit needed (Task 3's commit already shipped the change). If something looks wrong, treat it as a bug: reopen Task 3, fix, and re-run this task from Step 1.
