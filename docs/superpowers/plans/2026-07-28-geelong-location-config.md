# Geelong Location + Config Centralization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third Instagram carousel location ("Geelong & The Bellarine") to the live posting pipeline, driven by one shared config file instead of data/logic duplicated across three places.

**Architecture:** One new plain-ESM config file (`src/constants/locations.js`) is imported directly by both the Vite-bundled React app and the Node-run Pi automation script (both `package.json`s are `"type": "module"`, so no build step is needed for the Node side to consume it). `common.js` and `instagramgallery.jsx` are updated to read from it instead of their own hardcoded copies; `pi-automation.js`'s duplicated per-location Puppeteer sequence is extracted into reusable functions driven by the same array.

**Tech Stack:** React 18 + Vite (browser app), plain Node.js + Puppeteer 25 (Pi automation script, separate `pi-automation/` package). No test framework in this repo — verification uses `npm run build`, `npm run lint`, `node --check`/smoke-import checks, and manual code review, matching existing project conventions.

## Global Constraints

- New location: slug `geelong`, displayName `Geelong & The Bellarine`, postcodes `3211, 3212, 3213, 3214, 3215, 3216, 3217, 3218, 3219, 3220, 3221, 3222, 3223, 3224, 3225, 3226, 3227, 3340` (per approved spec)
- Do not modify `src/components/Carousel.jsx`, `src/components/LocationTitleSlide.jsx`, or `src/instagramstories.jsx` — out of scope (separate Stories feature, already generic)
- Do not modify `instagramgallery.jsx`'s other self-contained utils (`measureTextWidth`, `toTitleCase`, `getPostcode`, `formatPrice`, `generateCaption`, `GigPanel`) beyond what's needed to consume `LOCATIONS`
- Do **not** run `node pi-automation.js` (with or without `LOCAL_TEST=true`) at any point in this plan — both modes make real Instagram posts to the live account; live verification must happen with the user present, or via the natural Wednesday cron run
- Commit after every task; push to `origin/main` after every commit (matches this session's established workflow — `git pull --rebase origin main` before push in case automated commits landed)

---

## File Structure

- **Create** `src/constants/locations.js` — single source of truth: `LOCATIONS` array of `{ slug, displayName, postcodes }`
- **Modify** `src/constants/common.js` — `ST_KILDA_POSTCODES`/`FITZROY_RICHMOND_POSTCODES` derived from `LOCATIONS` instead of hardcoded
- **Modify** `src/instagramgallery.jsx` — import `LOCATIONS`; remove local postcode consts; replace two hardcoded `useMemo`/`<Carousel>` blocks with a map over `LOCATIONS`; rewrite `LocationTitleSlide`'s hardcoded ternary with a generic auto-fit-then-wrap renderer
- **Modify** `pi-automation/pi-automation.js` — import `LOCATIONS`; extract `postLocationCarousel(page, location)` and `checkCarouselSuccess(page, titleText)`; replace duplicated per-location blocks with loops over `LOCATIONS`

---

### Task 1: Create the shared locations config

**Files:**
- Create: `src/constants/locations.js`

**Interfaces:**
- Produces: `export const LOCATIONS` — array of `{ slug: string, displayName: string, postcodes: string[] }`, three entries: `stkilda`, `fitzroy`, `geelong`. This exact shape and these exact field names are consumed by Tasks 2, 3, 4, and 5.

- [ ] **Step 1: Write the file**

```js
// src/constants/locations.js
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

- [ ] **Step 2: Verify it loads correctly via Node's ESM loader (the actual risk — not syntax, but that a plain relative import resolves cleanly for both the browser bundle and the Pi script)**

Run: `node -e "import('./src/constants/locations.js').then(m => console.log(m.LOCATIONS.map(l => l.slug)))"`
Expected output: `[ 'stkilda', 'fitzroy', 'geelong' ]`

- [ ] **Step 3: Commit**

```bash
git add src/constants/locations.js
git commit -m "Add shared LOCATIONS config as single source of truth for carousel locations"
git pull --rebase origin main
git push origin main
```

---

### Task 2: Derive common.js postcode exports from LOCATIONS

**Files:**
- Modify: `src/constants/common.js`

**Interfaces:**
- Consumes: `LOCATIONS` from `./locations` (Task 1)
- Produces: `ST_KILDA_POSTCODES`, `FITZROY_RICHMOND_POSTCODES` — same names/shape as before (string arrays), so `src/instagramstories.jsx` (out of scope, unmodified) keeps working unchanged.

- [ ] **Step 1: Edit the file**

Current content of `src/constants/common.js`:
```js
// src/constants/postcodes.js
export const ST_KILDA_POSTCODES = ['3182', '3183', '3185']
export const FITZROY_RICHMOND_POSTCODES = [
  '3065',
  '3066',
  '3067',
  '3068',
  '3121',
]
export const LML_URL_TODAY = 'https://lml.live/?dateRange=today'
export const BRAND_BLUE = '#00B2E3'
export const BRAND_ORANGE = '#FF5C35'
export const INSTAGRAM_HEIGHT = 960
export const HEADER_HEIGHT = 48
export const MIN_BOTTOM_MARGIN = 24
export const CONTAINER_HEIGHT =
  INSTAGRAM_HEIGHT - HEADER_HEIGHT - MIN_BOTTOM_MARGIN - 16
export const TITLE_CAPTION =
  'Live Music Locator is a not-for-profit service designed to make it possible to discover every gig playing at every venue across every genre at any one time. This information will always be verified and free, importantly supporting musicians, our small to medium live music venues, and you the punters. More detailed gig information here: https://lml.live/?dateRange=today'
```

Replace the two postcode consts (only) with:
```js
// src/constants/postcodes.js
import { LOCATIONS } from './locations'

export const ST_KILDA_POSTCODES = LOCATIONS.find(
  (l) => l.slug === 'stkilda'
).postcodes
export const FITZROY_RICHMOND_POSTCODES = LOCATIONS.find(
  (l) => l.slug === 'fitzroy'
).postcodes
```

Leave every other export in the file (`LML_URL_TODAY`, `BRAND_BLUE`, `BRAND_ORANGE`, `INSTAGRAM_HEIGHT`, `HEADER_HEIGHT`, `MIN_BOTTOM_MARGIN`, `CONTAINER_HEIGHT`, `TITLE_CAPTION`) exactly as-is.

- [ ] **Step 2: Verify**

Run: `node -e "import('./src/constants/common.js').then(m => console.log(m.ST_KILDA_POSTCODES, m.FITZROY_RICHMOND_POSTCODES))"`
Expected output: `[ '3182', '3183', '3185' ] [ '3065', '3066', '3067', '3068', '3121' ]` (identical values to before the change)

- [ ] **Step 3: Commit**

```bash
git add src/constants/common.js
git commit -m "Derive common.js postcode exports from shared LOCATIONS config"
git pull --rebase origin main
git push origin main
```

---

### Task 3: Replace instagramgallery.jsx's hardcoded location data and Carousel rendering with a LOCATIONS-driven loop

**Files:**
- Modify: `src/instagramgallery.jsx:17-18` (local postcode consts)
- Modify: `src/instagramgallery.jsx` (gig-filtering `useMemo`s and `<Carousel>` JSX, currently around lines 962-1013 — line numbers will have shifted slightly from earlier reads in this session; locate by content, not exact line number)

**Interfaces:**
- Consumes: `LOCATIONS` from `./constants/locations` (Task 1); the file's own already-generic local `Carousel` function (props: `title`, `location`, `date`, `gigs`, `id` — unchanged, no edits needed to `Carousel` itself); the file's own local `getPostcode` function (unchanged)
- Produces: nothing new consumed elsewhere — this is the rendering leaf

- [ ] **Step 1: Add the import and remove the local postcode consts**

Find near the top of the file:
```js
// Postcode definitions
const ST_KILDA_POSTCODES = ['3182', '3183', '3185'];
const FITZROY_RICHMOND_POSTCODES = ['3065', '3066', '3067', '3068', '3121'];
```

Replace with:
```js
import { LOCATIONS } from './constants/locations';
```

(Place this import alongside the file's other top-of-file imports, e.g. right after the `saveAs` import.)

- [ ] **Step 2: Replace the two hardcoded gig-filter `useMemo`s with one LOCATIONS-driven version**

Find:
```js
  // Filter gigs by location
  const stKildaGigs = useMemo(() => {
    return gigs.filter(gig => {
      const postcode = getPostcode(gig.venue);
      return ST_KILDA_POSTCODES.includes(postcode);
    });
  }, [gigs]);

  const fitzroyRichmondGigs = useMemo(() => {
    return gigs.filter(gig => {
      const postcode = getPostcode(gig.venue);
      return FITZROY_RICHMOND_POSTCODES.includes(postcode);
    });
  }, [gigs]);
```

Replace with:
```js
  // Filter gigs by location, keyed by slug
  const gigsBySlug = useMemo(() => {
    const result = {};
    LOCATIONS.forEach((loc) => {
      result[loc.slug] = gigs.filter((gig) => {
        const postcode = getPostcode(gig.venue);
        return loc.postcodes.includes(postcode);
      });
    });
    return result;
  }, [gigs]);
```

- [ ] **Step 3: Replace the two hardcoded `<Carousel>` blocks with a map over LOCATIONS**

Find:
```js
            {/* St Kilda Carousel */}
            <Carousel
              title="St Kilda Gigs"
              location="St Kilda"
              date={date}
              gigs={stKildaGigs}
              id="stkilda"
            />

            {/* Fitzroy/Collingwood/Richmond Carousel */}
            <Carousel
              title="Fitzroy, Collingwood & Richmond Gigs"
              location="Fitzroy, Collingwood and Richmond"
              date={date}
              gigs={fitzroyRichmondGigs}
              id="fitzroy"
            />
```

Replace with:
```js
            {LOCATIONS.map((loc) => (
              <Carousel
                key={loc.slug}
                title={`${loc.displayName} Gigs`}
                location={loc.displayName}
                date={date}
                gigs={gigsBySlug[loc.slug]}
                id={loc.slug}
              />
            ))}
```

Note: this changes the St Kilda carousel's `title` text from `"St Kilda Gigs"` to `"St Kilda Gigs"` (identical — `displayName` for stkilda is exactly `"St Kilda"`) and Fitzroy's from `"Fitzroy, Collingwood & Richmond Gigs"` to `"Fitzroy, Collingwood and Richmond Gigs"` (was `&`, becomes `and`, matching the existing `location` prop's wording which already said "and"). This is a cosmetic-only text change to the on-page `<h2>` heading, not a behavior change — flag it in the commit message.

- [ ] **Step 4: Verify the app still builds**

Run: `npm run build`
Expected: builds successfully with no errors (warnings about unrelated pre-existing issues are fine — only new errors from this change matter)

- [ ] **Step 5: Verify lint**

Run: `npx eslint src/instagramgallery.jsx`
Expected: no new errors introduced by this change (pre-existing warnings in the file, if any, are out of scope)

- [ ] **Step 6: Commit**

```bash
git add src/instagramgallery.jsx
git commit -m "Drive instagramgallery.jsx carousel rendering from shared LOCATIONS config"
git pull --rebase origin main
git push origin main
```

---

### Task 4: Replace the hardcoded title-slide ternary with a generic auto-fit renderer

**Files:**
- Modify: `src/instagramgallery.jsx` (the local `LocationTitleSlide` function, currently around lines 560-596 — locate by content)

**Interfaces:**
- Consumes: the file's own local `measureTextWidth(text, fontSize, fontWeight)` function (already defined earlier in the file, returns a pixel width number — unchanged, no edits needed)
- Produces: nothing new consumed elsewhere

**Context:** The card is `w-[540px]` with `px-12` (48px each side in Tailwind's default rem scale), so the available text width is `540 - 96 = 444px`.

- [ ] **Step 1: Add the fitting helper function directly above `LocationTitleSlide`**

Find the `LocationTitleSlide` function definition (starts `function LocationTitleSlide({ date, location, className = '' }) {`) and insert this new function immediately before it:

```js
// Fits a location display name into the title slide: tries progressively
// smaller single-line font sizes first, then falls back to greedy word-wrap
// at the smallest size if it still doesn't fit on one line.
function fitLocationTitle(displayName) {
  const AVAILABLE_WIDTH = 444; // 540px card minus px-12 (48px) padding each side
  const SIZES_PX = [56, 40, 35]; // 3.5rem, 2.5rem, 2.2rem

  for (const fontSize of SIZES_PX) {
    if (measureTextWidth(displayName, `${fontSize}px`, 'bold') <= AVAILABLE_WIDTH) {
      return { lines: [displayName], fontSize };
    }
  }

  // Doesn't fit as one line even at the smallest size - wrap into multiple lines
  const fontSize = SIZES_PX[SIZES_PX.length - 1];
  const words = displayName.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (measureTextWidth(candidate, `${fontSize}px`, 'bold') <= AVAILABLE_WIDTH) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);

  return { lines, fontSize };
}
```

- [ ] **Step 2: Replace the hardcoded ternary inside `LocationTitleSlide`**

Find:
```js
      <div className="text-center px-12">
        {location === "St Kilda" ? (
          <h1 className="text-white text-[3.5rem] font-bold mb-6">St Kilda</h1>
        ) : (
          <div className="-space-y-5">
            <h1 className="text-white text-[2.2rem] font-bold">Fitzroy</h1>
            <h1 className="text-white text-[2.2rem] font-bold mb-2">Collingwood</h1>
            <h1 className="text-white text-[2.2rem] font-bold mb-2">Richmond</h1>
          </div>
        )}
```

Replace with:
```js
      <div className="text-center px-12">
        {(() => {
          const { lines, fontSize } = fitLocationTitle(location);
          return (
            <div className={lines.length > 1 ? '-space-y-5' : ''}>
              {lines.map((line, i) => (
                <h1
                  key={i}
                  className={`text-white font-bold ${
                    lines.length === 1 ? 'mb-6' : 'mb-2'
                  }`}
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {line}
                </h1>
              ))}
            </div>
          );
        })()}
```

This is a client-side-only render (calls `document.createElement` inside `measureTextWidth`), which matches how this component already runs — it's only ever rendered in the browser (Vite/React), never server-rendered, so this is safe.

- [ ] **Step 3: Verify the app still builds**

Run: `npm run build`
Expected: builds successfully

- [ ] **Step 4: Verify lint**

Run: `npx eslint src/instagramgallery.jsx`
Expected: no new errors

- [ ] **Step 5: Manual visual sanity check (best available without a live browser test)**

Run: `npm run dev`, then in a browser open the local dev URL and visually confirm the title slide reads sensibly for all three locations ("St Kilda" single large line, "Fitzroy, Collingwood and Richmond" multi-line as before, and the new "Geelong & The Bellarine" renders as readable text that doesn't overflow the card). Stop the dev server afterward (Ctrl+C) — this is a local preview only, does not touch the live site or trigger any posting.

- [ ] **Step 6: Commit**

```bash
git add src/instagramgallery.jsx
git commit -m "Replace hardcoded title-slide line-breaks with generic auto-fit renderer"
git pull --rebase origin main
git push origin main
```

---

### Task 5: Refactor pi-automation.js to drive per-location posting from LOCATIONS

**Files:**
- Modify: `pi-automation/pi-automation.js`

**Interfaces:**
- Consumes: `LOCATIONS` from `../src/constants/locations.js` (Task 1) — cross-directory relative import, confirmed viable in Task 1 since both `package.json`s are `"type": "module"`
- Produces: `postLocationCarousel(page, location)` and `checkCarouselSuccess(page, titleText)` — internal to this file, not consumed elsewhere

- [ ] **Step 1: Add the import**

At the top of `pi-automation/pi-automation.js`, after the existing imports:
```js
import { LOCATIONS } from '../src/constants/locations.js';
```

- [ ] **Step 2: Extract the per-location Puppeteer sequence into a reusable function**

Add this function after the existing `delay(ms)` function (and before `automate()`):

```js
async function postLocationCarousel(page, location) {
    log(`Processing ${location.displayName} carousel...`);
    await page.waitForSelector(`#generate-images-btn-${location.slug}`, { timeout: 120000 });

    log(`Clicking generate button for ${location.displayName}`);
    await page.click(`#generate-images-btn-${location.slug}`);

    const generateScreenshot = IS_LOCAL_TEST
        ? `./${location.slug}-generate-click.png`
        : `${location.slug}-generate-click.png`;
    await page.screenshot({ path: generateScreenshot });
    log(`Took screenshot after clicking generate button for ${location.displayName}: ${generateScreenshot}`);

    log(`Waiting 90 seconds after ${location.displayName} generate click...`);
    await delay(90000);

    log(`Waiting for post button to appear for ${location.displayName}`);
    await page.waitForSelector(`#post-instagram-btn-${location.slug}`, { timeout: 120000 });

    log(`Clicking post button for ${location.displayName}`);
    await page.click(`#post-instagram-btn-${location.slug}`);

    const postScreenshot = IS_LOCAL_TEST
        ? `./${location.slug}-post-click.png`
        : `${location.slug}-post-click.png`;
    await page.screenshot({ path: postScreenshot });
    log(`Took screenshot after clicking post button for ${location.displayName}: ${postScreenshot}`);

    log(`Waiting 90 seconds after ${location.displayName} post click...`);
    await delay(90000);
}
```

- [ ] **Step 3: Extract the success-check DOM evaluation into a reusable function**

Add this function directly after `postLocationCarousel`:

```js
async function checkCarouselSuccess(page, titleText) {
    return page.evaluate((searchText) => {
        const headings = Array.from(document.querySelectorAll('h2'));
        const heading = headings.find((h) => h.textContent.includes(searchText));
        if (!heading) return false;

        let section = heading.parentElement;
        while (section && !section.classList.contains('mb-16')) {
            section = section.parentElement;
        }
        if (!section) return false;

        const statusDiv = section.querySelector('div.text-sm.text-gray-600');
        return statusDiv && statusDiv.textContent.includes('Successfully posted to Instagram');
    }, titleText);
}
```

- [ ] **Step 4: Replace the two hardcoded per-location blocks in `automate()` with a loop**

Find (the block starting after "Waiting for page to be ready" and ending right before "Wait for posting to complete - increased to 10 minutes"):
```js
        // Wait for any necessary elements and perform actions
        log('Waiting for page to be ready');
        
        // Process St Kilda carousel
        log('Processing St Kilda carousel...');
        await page.waitForSelector('#generate-images-btn-stkilda', { timeout: 120000 });
        
        // Click generate button for St Kilda
        log('Clicking generate button for St Kilda');
        await page.click('#generate-images-btn-stkilda');
        
        // Take a screenshot after clicking generate button for St Kilda
        const stKildaScreenshot = IS_LOCAL_TEST ? './stkilda-generate-click.png' : 'stkilda-generate-click.png';
        await page.screenshot({ path: stKildaScreenshot });
        log(`Took screenshot after clicking generate button for St Kilda: ${stKildaScreenshot}`);
        
        // Wait for 90 seconds (increased from 45 seconds)
        log('Waiting 90 seconds after St Kilda generate click...');
        await delay(90000);
        
        // Wait for post button to appear for St Kilda
        log('Waiting for post button to appear for St Kilda');
        await page.waitForSelector('#post-instagram-btn-stkilda', { timeout: 120000 });
        
        // Click post button for St Kilda
        log('Clicking post button for St Kilda');
        await page.click('#post-instagram-btn-stkilda');
        
        // Take a screenshot after clicking post button for St Kilda
        const stKildaPostScreenshot = IS_LOCAL_TEST ? './stkilda-post-click.png' : 'stkilda-post-click.png';
        await page.screenshot({ path: stKildaPostScreenshot });
        log(`Took screenshot after clicking post button for St Kilda: ${stKildaPostScreenshot}`);
        
        // Wait for 90 seconds (increased from 45 seconds)
        log('Waiting 90 seconds after St Kilda post click...');
        await delay(90000);
        
        // Process Fitzroy carousel
        log('Processing Fitzroy carousel...');
        await page.waitForSelector('#generate-images-btn-fitzroy', { timeout: 120000 });
        
        // Click generate button for Fitzroy
        log('Clicking generate button for Fitzroy');
        await page.click('#generate-images-btn-fitzroy');
        
        // Take a screenshot after clicking generate button for Fitzroy
        const fitzroyScreenshot = IS_LOCAL_TEST ? './fitzroy-generate-click.png' : 'fitzroy-generate-click.png';
        await page.screenshot({ path: fitzroyScreenshot });
        log(`Took screenshot after clicking generate button for Fitzroy: ${fitzroyScreenshot}`);
        
        // Wait for 90 seconds (increased from 45 seconds)
        log('Waiting 90 seconds after Fitzroy generate click...');
        await delay(90000);
        
        // Wait for post button to appear for Fitzroy
        log('Waiting for post button to appear for Fitzroy');
        await page.waitForSelector('#post-instagram-btn-fitzroy', { timeout: 120000 });
        
        // Click post button for Fitzroy
        log('Clicking post button for Fitzroy');
        await page.click('#post-instagram-btn-fitzroy');
        
        // Take a screenshot after clicking post button for Fitzroy
        const fitzroyPostScreenshot = IS_LOCAL_TEST ? './fitzroy-post-click.png' : 'fitzroy-post-click.png';
        await page.screenshot({ path: fitzroyPostScreenshot });
        log(`Took screenshot after clicking post button for Fitzroy: ${fitzroyPostScreenshot}`);
```

Replace with:
```js
        // Wait for any necessary elements and perform actions
        log('Waiting for page to be ready');

        // Process each location's carousel in turn
        for (const location of LOCATIONS) {
            await postLocationCarousel(page, location);
        }
```

- [ ] **Step 5: Replace the two hardcoded success-check blocks with a loop**

Find:
```js
        // Check for success messages for both carousels
        log('Checking for success messages...');
        
        // Look for success message for St Kilda carousel using standard DOM methods
        const stKildaSuccess = await page.evaluate(() => {
            // Find all h2 elements on the page
            const headings = Array.from(document.querySelectorAll('h2'));
            
            // Find the one containing "St Kilda Gigs"
            const stKildaHeading = headings.find(h => h.textContent.includes('St Kilda Gigs'));
            if (!stKildaHeading) return false;
            
            // Get parent div (container)
            let stKildaSection = stKildaHeading.parentElement;
            // Sometimes need to go up another level to find the right container
            while (stKildaSection && !stKildaSection.classList.contains('mb-16')) {
                stKildaSection = stKildaSection.parentElement;
            }
            
            if (!stKildaSection) return false;
            
            // Find status div
            const statusDiv = stKildaSection.querySelector('div.text-sm.text-gray-600');
            return statusDiv && statusDiv.textContent.includes('Successfully posted to Instagram');
        });
        
        // Look for success message for Fitzroy carousel using standard DOM methods
        const fitzroySuccess = await page.evaluate(() => {
            // Find all h2 elements on the page
            const headings = Array.from(document.querySelectorAll('h2'));
            
            // Find the one containing "Fitzroy"
            const fitzroyHeading = headings.find(h => h.textContent.includes('Fitzroy'));
            if (!fitzroyHeading) return false;
            
            // Get parent div (container)
            let fitzroySection = fitzroyHeading.parentElement;
            // Sometimes need to go up another level to find the right container
            while (fitzroySection && !fitzroySection.classList.contains('mb-16')) {
                fitzroySection = fitzroySection.parentElement;
            }
            
            if (!fitzroySection) return false;
            
            // Find status div
            const statusDiv = fitzroySection.querySelector('div.text-sm.text-gray-600');
            return statusDiv && statusDiv.textContent.includes('Successfully posted to Instagram');
        });
        
        // In local test mode, be more forgiving about success
        if (IS_LOCAL_TEST) {
            // For local testing, count as success if any carousel posted successfully
            if (stKildaSuccess || fitzroySuccess) {
                if (stKildaSuccess && fitzroySuccess) {
                    log('Both carousels were successfully posted to Instagram');
                } else if (stKildaSuccess) {
                    log('St Kilda carousel posted successfully, but Fitzroy failed or status not found', true);
                } else {
                    log('Fitzroy carousel posted successfully, but St Kilda failed or status not found', true);
                }
            } else {
                if (!stKildaSuccess) log('St Kilda carousel posting failed or status not found', true);
                if (!fitzroySuccess) log('Fitzroy carousel posting failed or status not found', true);
                throw new Error('Instagram posting was not successful - no carousels posted');
            }
        } else {
            // In production mode on the Pi, require both to succeed
            if (stKildaSuccess && fitzroySuccess) {
                log('Both carousels were successfully posted to Instagram');
            } else {
                if (!stKildaSuccess) log('St Kilda carousel posting failed or status not found', true);
                if (!fitzroySuccess) log('Fitzroy carousel posting failed or status not found', true);
                throw new Error('Instagram posting was not fully successful');
            }
        }
```

Replace with:
```js
        // Check for success messages for all carousels
        log('Checking for success messages...');

        const results = [];
        for (const location of LOCATIONS) {
            const success = await checkCarouselSuccess(page, `${location.displayName} Gigs`);
            results.push({ location, success });
            if (success) {
                log(`${location.displayName} carousel was successfully posted to Instagram`);
            } else {
                log(`${location.displayName} carousel posting failed or status not found`, true);
            }
        }

        const anySuccess = results.some((r) => r.success);
        const allSuccess = results.every((r) => r.success);

        if (IS_LOCAL_TEST) {
            // For local testing, count as success if any carousel posted successfully
            if (!anySuccess) {
                throw new Error('Instagram posting was not successful - no carousels posted');
            }
        } else {
            // In production mode on the Pi, require all to succeed
            if (!allSuccess) {
                throw new Error('Instagram posting was not fully successful');
            }
        }
```

- [ ] **Step 6: Verify syntax**

Run: `node --check pi-automation/pi-automation.js`
Expected: no output (success)

- [ ] **Step 7: Manual review checklist (no live run — verify by reading, not executing)**

Confirm each of these by reading the diff:
- [ ] `postLocationCarousel` preserves the exact same sequence of operations, timeouts (120000ms for selectors), and delay durations (90000ms) as the original two hardcoded blocks
- [ ] Screenshot filenames match the old pattern exactly for `stkilda`/`fitzroy` (`stkilda-generate-click.png`, `fitzroy-post-click.png`, etc.) so nothing downstream that might reference these filenames breaks
- [ ] The final 10-minute `delay(600000)` and final screenshot (`after-waiting.png` / `page-loaded.png` etc.) — everything *after* the per-location loop and *after* the success-check loop — is untouched
- [ ] The temp-images cleanup block (Octokit `deleteFile` loop) — untouched
- [ ] `checkCarouselSuccess('${location.displayName} Gigs')` will search for `"St Kilda Gigs"` (unchanged) and `"Fitzroy, Collingwood and Richmond Gigs"` (was searching for the substring `"Fitzroy"` before — the new search string still contains `"Fitzroy"` as a substring of `"Fitzroy, Collingwood and Richmond Gigs"`, so `textContent.includes(searchText)` behaves the same for an exact substring match against the heading's actual text, which per Task 3 will be `"Fitzroy, Collingwood and Richmond Gigs"`) — confirm this reasoning holds by re-reading Task 3's final heading text before considering this task done

- [ ] **Step 8: Commit**

```bash
git add pi-automation/pi-automation.js
git commit -m "Refactor pi-automation.js to drive per-location posting from shared LOCATIONS config"
git pull --rebase origin main
git push origin main
```

---

### Task 6: Deploy to the Pi (data-only step, still no live run)

**Files:** none (deployment step)

- [ ] **Step 1: Copy the updated pi-automation.js to the Pi**

This step requires the Pi's SSH password and should be run by the user, or by Claude with the user present (not part of unsupervised autonomous execution — flag this as the handoff point back to the user).

```bash
scp /Users/nicholasthorpe/Documents/Personal/hacks/MANGROVES_2023/insta/pi-automation/pi-automation.js insta@192.168.0.140:~/instabear_pi/pi-automation.js
```

- [ ] **Step 2: Do NOT run `node pi-automation.js` on the Pi as part of this plan.**

Verification of the actual end-to-end behavior (all three carousels, including the new Geelong one, actually posting) should happen either:
- With the user present and explicitly choosing to trigger a manual run, or
- By letting the next scheduled cron run (7:45am, Wed–Sun) happen naturally and checking `automation.log` afterward

---

## Self-Review

**Spec coverage:**
- New `locations.js` config ✓ (Task 1)
- `common.js` derives from it ✓ (Task 2)
- `instagramgallery.jsx` location data + Carousel rendering ✓ (Task 3)
- `instagramgallery.jsx` title-slide auto-fit ✓ (Task 4)
- `pi-automation.js` extraction + loop ✓ (Task 5)
- No live run without user present ✓ (explicit constraint in Task 5 Step 7, Task 6 Step 2, and Global Constraints)
- Out-of-scope items (Stories feature, other duplicated utils) explicitly left untouched ✓ (Global Constraints)

**Placeholder scan:** No TBD/TODO; every step has literal code to write, not a description of code to write.

**Type/name consistency:** `LOCATIONS`, `slug`, `displayName`, `postcodes` used identically across Tasks 1, 2, 3, 5. `postLocationCarousel`/`checkCarouselSuccess` signatures match between their definition (Task 5 Steps 2-3) and their call sites (Task 5 Steps 4-5).

**Scope:** Single cohesive change, not decomposed further — appropriately sized for one plan.
