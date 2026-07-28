# Skip Zero-Gig Locations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The automated posting pipeline must never attempt to post for a location with zero gigs — no button clicks, no Instagram API calls, no timeout, no run-ending failure.

**Architecture:** The React app exposes each location's gig count as a `data-gig-count` attribute on an element that already renders as soon as gig data loads (well before any button click). `pi-automation.js` reads all three counts in one `page.evaluate()` immediately after page load, then skips any zero-gig location entirely in its per-location loop — never calling `postLocationCarousel` for it and excluding it from the success tally.

**Tech Stack:** Same as the prior plan this builds on (`docs/superpowers/plans/2026-07-28-geelong-location-config.md`) — React 18 + Vite, plain Node + Puppeteer 25. No test framework in this repo.

## Global Constraints

- Do not change how gigs are fetched or filtered by location — only whether a post is *attempted* once the count is known
- Do not trigger a live `node pi-automation.js` run as part of this plan — the user will run a supervised live test separately after deployment
- Preserve all existing behavior for locations with ≥1 gig exactly as-is

---

## File Structure

- **Modify** `src/instagramgallery.jsx` — add `data-location-slug`/`data-gig-count` to the existing gig-count div; wrap the action-buttons block in a `gigs.length > 0` check
- **Modify** `pi-automation/pi-automation.js` — add a gig-count pre-check after page load; skip zero-gig locations in the posting loop; adjust the success-check phase to exclude skipped locations from the tally, with an explicit all-skipped early exit

---

### Task 1: Expose gig counts and hide buttons at zero gigs in the React app

**Files:**
- Modify: `src/instagramgallery.jsx:867-868` (gig-count div)
- Modify: `src/instagramgallery.jsx:875-910` (action buttons block)

**Interfaces:**
- Produces: a DOM element matching `[data-location-slug="<slug>"]` with a `data-gig-count` attribute holding the gig count as a string (HTML attributes are always strings) — consumed by Task 2's `page.evaluate()`

- [ ] **Step 1: Add data attributes to the gig-count div**

Find:
```jsx
        <div className="text-gray-700 mb-2">
          {gigs.length} gigs found for {location}
          {slides.length > 9 && (
            <div className="text-red-500 font-bold">
              Warning: Only showing 9 of {slides.length} slides due to Instagram limitations
            </div>
          )}
        </div>
```

Replace with:
```jsx
        <div
          className="text-gray-700 mb-2"
          data-location-slug={id}
          data-gig-count={gigs.length}
        >
          {gigs.length} gigs found for {location}
          {slides.length > 9 && (
            <div className="text-red-500 font-bold">
              Warning: Only showing 9 of {slides.length} slides due to Instagram limitations
            </div>
          )}
        </div>
```

- [ ] **Step 2: Wrap the action buttons in a zero-gigs check**

Find (the button block immediately after the div from Step 1, through the closing of the `uploadedImages &&` block):
```jsx
        <button
          id={`generate-images-btn-${id}`}
          onClick={renderSlidesToImages}
          disabled={isPosting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Generate Images
        </button>

        {uploadedImages && (
          <div>
            <div className="flex space-x-2 justify-center">
              <button
                id={`post-instagram-btn-${id}`}
                onClick={handleInstagramPost}
                disabled={isPosting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Post to Instagram
              </button>
              
              {/* Download Images Button */}
              <button
                id={`download-images-btn-${id}`}
                onClick={handleDownloadImages}
                disabled={isPosting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Download Images
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Review the images above before posting or downloading
            </p>
          </div>
        )}
```

Replace with:
```jsx
        {gigs.length > 0 ? (
          <>
            <button
              id={`generate-images-btn-${id}`}
              onClick={renderSlidesToImages}
              disabled={isPosting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Generate Images
            </button>

            {uploadedImages && (
              <div>
                <div className="flex space-x-2 justify-center">
                  <button
                    id={`post-instagram-btn-${id}`}
                    onClick={handleInstagramPost}
                    disabled={isPosting}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Post to Instagram
                  </button>

                  {/* Download Images Button */}
                  <button
                    id={`download-images-btn-${id}`}
                    onClick={handleDownloadImages}
                    disabled={isPosting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Download Images
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Review the images above before posting or downloading
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500 italic">No gigs found today</p>
        )}
```

Note: this changes button `id`s from always-present to conditionally-present based on `gigs.length`. This is intentional and is exactly what Task 2's pre-check is designed around — the Pi must never attempt `waitForSelector` on a button that this change may cause to not exist.

- [ ] **Step 3: Verify the app still builds**

Run: `npm run build`
Expected: builds successfully

- [ ] **Step 4: Verify lint**

Run: `npx eslint src/instagramgallery.jsx`
Expected: no new errors

- [ ] **Step 5: Manual visual check for both states**

Run: `npm run dev`, open the local dev URL. Today's real gig data will show the "≥1 gig" path for whichever locations have listings (buttons present, `data-gig-count` visible in browser devtools Elements panel). To check the zero-gig path, temporarily test in devtools console: `document.querySelector('[data-location-slug="geelong"]')` (or whichever location has 0 gigs today) and confirm its `data-gig-count` is `"0"` and that location's section shows "No gigs found today" with no buttons. Stop the dev server afterward (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add src/instagramgallery.jsx
git commit -m "Expose gig counts as data attributes; hide post buttons at zero gigs"
git pull --rebase origin main
git push origin main
```

---

### Task 2: Pre-check gig counts and skip zero-gig locations in pi-automation.js

**Files:**
- Modify: `pi-automation/pi-automation.js:162-177` (insert pre-check after page load, before the posting loop)
- Modify: `pi-automation/pi-automation.js:184-210` or thereabouts (success-check phase — locate by content, exact lines may have shifted after Step 1's insertion)

**Interfaces:**
- Consumes: `data-location-slug`/`data-gig-count` attributes from Task 1
- Consumes: `LOCATIONS` (already imported), `postLocationCarousel(page, location)`, `checkCarouselSuccess(page, titleText)` (already defined, from the prior plan)

- [ ] **Step 1: Add the gig-count pre-check and skip logic in the posting loop**

Find:
```js
        // Take a screenshot for debugging
        const screenshotPath = IS_LOCAL_TEST ? './page-loaded.png' : 'page-loaded.png';
        await page.screenshot({ path: screenshotPath });
        log(`Took screenshot of loaded page: ${screenshotPath}`);

        // Wait for any necessary elements and perform actions
        log('Waiting for page to be ready');

        // Process each location's carousel in turn
        for (const location of LOCATIONS) {
            await postLocationCarousel(page, location);
        }

        // Wait for posting to complete - increased to 10 minutes
```

Replace with:
```js
        // Take a screenshot for debugging
        const screenshotPath = IS_LOCAL_TEST ? './page-loaded.png' : 'page-loaded.png';
        await page.screenshot({ path: screenshotPath });
        log(`Took screenshot of loaded page: ${screenshotPath}`);

        // Wait for any necessary elements and perform actions
        log('Waiting for page to be ready');

        // Read gig counts for all locations before attempting any clicks -
        // locations with zero gigs render no buttons at all, so we must
        // know this in advance rather than risk a waitForSelector timeout
        const gigCounts = await page.evaluate(() => {
            const counts = {};
            document.querySelectorAll('[data-location-slug]').forEach((el) => {
                counts[el.dataset.locationSlug] = parseInt(el.dataset.gigCount, 10);
            });
            return counts;
        });
        log(`Gig counts: ${JSON.stringify(gigCounts)}`);

        // Process each location's carousel in turn, skipping any with zero gigs
        const attemptedLocations = [];
        for (const location of LOCATIONS) {
            if (!gigCounts[location.slug]) {
                log(`Skipping ${location.displayName} - no gigs today`);
                continue;
            }
            attemptedLocations.push(location);
            await postLocationCarousel(page, location);
        }

        if (attemptedLocations.length === 0) {
            log('No locations had gigs today - nothing to post');
        } else {

        // Wait for posting to complete - increased to 10 minutes
```

Note the deliberately unclosed `else {` here — it's closed in Step 2, which wraps the wait/screenshot/success-check phase inside it (so that phase only runs when there was actually something posted).

- [ ] **Step 2: Wrap the wait/success-check phase in the `else` block and use `attemptedLocations` instead of `LOCATIONS`**

Find:
```js
        // Wait for posting to complete - increased to 10 minutes
        log('Waiting for posting to complete (10 minutes)...');
        await delay(600000);
        
        // Take a final screenshot after waiting
        const finalScreenshot = IS_LOCAL_TEST ? './after-waiting.png' : 'after-waiting.png';
        await page.screenshot({ path: finalScreenshot });
        log(`Took final screenshot after waiting: ${finalScreenshot}`);

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

Replace with (note the added indentation and closing brace for the `else` opened in Step 1):
```js
        // Wait for posting to complete - increased to 10 minutes
        log('Waiting for posting to complete (10 minutes)...');
        await delay(600000);

        // Take a final screenshot after waiting
        const finalScreenshot = IS_LOCAL_TEST ? './after-waiting.png' : 'after-waiting.png';
        await page.screenshot({ path: finalScreenshot });
        log(`Took final screenshot after waiting: ${finalScreenshot}`);

        // Check for success messages, only for locations that were actually attempted
        log('Checking for success messages...');

        const results = [];
        for (const location of attemptedLocations) {
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
            // In production mode on the Pi, require all attempted locations to succeed
            if (!allSuccess) {
                throw new Error('Instagram posting was not fully successful');
            }
        }
        }
```

- [ ] **Step 3: Verify syntax**

Run: `node --check pi-automation/pi-automation.js`
Expected: no output (success)

- [ ] **Step 4: Manual review checklist (no live run)**

Confirm by reading the diff:
- [ ] The `else {` opened after `if (attemptedLocations.length === 0) { ... }` in Step 1 is closed by the final `}` added at the very end of Step 2's replacement — brace balance holds (run `node --check` again after any manual touch-up to be sure)
- [ ] `gigCounts[location.slug]` correctly evaluates falsy for both `0` and `undefined` (the latter covers the case where a location's div somehow isn't in the DOM at all — treated the same as zero gigs, i.e. skipped, rather than crashing)
- [ ] `attemptedLocations` (not `LOCATIONS`) is used in the success-check loop — a location skipped for zero gigs must never appear in `results`
- [ ] Existing behavior for a day where all three locations have gigs is unchanged: `gigCounts` all non-zero, `attemptedLocations` equals `LOCATIONS`, identical to pre-this-task behavior
- [ ] The temp-images cleanup block after this section (unchanged, not touched by this task) still runs after the `else` block closes, for both the "something posted" and "nothing to post" paths — confirm it doesn't error when nothing new was uploaded (it deletes whatever's in `temp-images/`, if anything, regardless of what this run added)

- [ ] **Step 5: Commit**

```bash
git add pi-automation/pi-automation.js
git commit -m "Skip zero-gig locations in the posting pipeline instead of failing"
git pull --rebase origin main
git push origin main
```

---

### Task 3: Deploy to the Pi (handoff to user)

**Files:** none (deployment step)

- [ ] **Step 1: Copy the updated pi-automation.js to the Pi**

```bash
scp /Users/nicholasthorpe/Documents/Personal/hacks/MANGROVES_2023/insta/pi-automation/pi-automation.js insta@192.168.0.140:~/instabear_pi/pi-automation.js
```

- [ ] **Step 2: Live supervised test with the user**, not part of unsupervised execution — this is the same live test already pending from the prior plan (all three carousels posting for real, including confirming zero-gig skip behavior for whichever location has none today, if any).

---

## Self-Review

**Spec coverage:**
- Data attributes for gig count ✓ (Task 1 Step 1)
- Hide buttons at zero gigs ✓ (Task 1 Step 2)
- Pi pre-checks gig counts before any clicks ✓ (Task 2 Step 1)
- Skip zero-gig locations, no timeout risk ✓ (Task 2 Step 1)
- Exclude skipped locations from success tally ✓ (Task 2 Step 2, uses `attemptedLocations`)
- All-skipped edge case handled without throwing ✓ (Task 2 Step 1's `if (attemptedLocations.length === 0)` branch)
- No live run in the plan itself ✓ (Task 3 explicitly hands off to user)

**Placeholder scan:** No TBD/TODO; every step has literal code.

**Type/name consistency:** `gigCounts`, `attemptedLocations`, `location.slug`, `location.displayName` used identically across Task 2's two steps. `data-location-slug`/`data-gig-count` names match exactly between Task 1 (producer) and Task 2 (consumer) — note the JS-side `dataset.locationSlug`/`dataset.gigCount` camelCase conversion from the HTML kebab-case attributes is standard DOM behavior, not a naming inconsistency.

**Scope:** Single cohesive change, appropriately sized for one plan.
