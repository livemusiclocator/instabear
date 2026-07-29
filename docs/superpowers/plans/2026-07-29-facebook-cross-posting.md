# Facebook Cross-Posting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a location's carousel is posted, also post the same images and caption to its linked Facebook Page, gated by a per-location `channels` config, with zero changes to the Pi automation script.

**Architecture:** `locations.js` gains a `channels` array per location. The venue-mention caption-building logic already inside `postToInstagram` gets extracted into a standalone `buildCombinedCaption` helper (pure refactor, no behavior change) so it can be reused. A new `postToFacebook` function, following the same shape as `postToInstagram`, uploads the already-generated images to the linked Facebook Page and creates one native multi-photo post. `handleInstagramPost` is extended to check `channels` and call each platform's function conditionally, reusing Instagram's exact caption for Facebook when both run (avoiding two different random venue-mention selections for the same post).

**Tech Stack:** React 18 + Vite, Meta Graph API v18.0. No test framework in this repo.

## Global Constraints

- Do not modify `pi-automation/pi-automation.js` — it already just clicks the existing "Post to Instagram" button; this feature must be invisible to it
- Do not modify `checkCarouselSuccess` or the Pi's success-tally logic — Facebook posting is best-effort, not gating
- Do not trigger a live post (Instagram or Facebook) as part of this plan
- Facebook posting cannot work live until the user regenerates their access token via Graph API Explorer with `pages_manage_posts` added — this is a manual prerequisite outside this plan, not a blocker for writing/reviewing the code
- Reuse the exact same images and caption for Facebook as Instagram — no new rendering, no separate Facebook-specific content

---

## File Structure

- **Modify** `src/constants/locations.js` — add `channels` field per location
- **Modify** `src/instagramgallery.jsx` — extract `buildCombinedCaption`, add `postToFacebook`, thread `channels` through `Carousel`, extend `handleInstagramPost`

---

### Task 1: Add `channels` config to locations.js

**Files:**
- Modify: `src/constants/locations.js`

**Interfaces:**
- Produces: each `LOCATIONS` entry gains `channels: string[]` (values `'instagram'` and/or `'facebook'`) — consumed by Task 3's `Carousel` invocation

- [ ] **Step 1: Edit the file**

Current content:
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

Replace with (adds `channels: ['instagram', 'facebook']` to each entry, no other changes):
```js
export const LOCATIONS = [
  {
    slug: 'stkilda',
    displayName: 'St Kilda',
    postcodes: ['3182', '3183', '3185'],
    channels: ['instagram', 'facebook'],
  },
  {
    slug: 'fitzroy',
    displayName: 'Fitzroy, Collingwood and Richmond',
    postcodes: ['3065', '3066', '3067', '3068', '3121'],
    channels: ['instagram', 'facebook'],
  },
  {
    slug: 'geelong',
    displayName: 'Geelong & The Bellarine',
    postcodes: [
      '3211', '3212', '3213', '3214', '3215', '3216', '3217', '3218',
      '3219', '3220', '3221', '3222', '3223', '3224', '3225', '3226',
      '3227', '3340',
    ],
    channels: ['instagram', 'facebook'],
  },
]
```

- [ ] **Step 2: Verify**

Run: `node -e "import('./src/constants/locations.js').then(m => console.log(m.LOCATIONS.map(l => l.channels)))"`
Expected: `[ [ 'instagram', 'facebook' ], [ 'instagram', 'facebook' ], [ 'instagram', 'facebook' ] ]`

- [ ] **Step 3: Commit**

```bash
git add src/constants/locations.js
git commit -m "Add per-location channels config for Facebook cross-posting"
git pull --rebase origin main
git push origin main
```

---

### Task 2: Extract buildCombinedCaption (pure refactor, no behavior change)

**Files:**
- Modify: `src/instagramgallery.jsx` (inside `postToInstagram`, around lines 90-164 — locate by content, other edits tonight may have shifted line numbers slightly)

**Interfaces:**
- Produces: `function buildCombinedCaption(captions)` — takes the same `captions` array `postToInstagram` already receives (array of strings, `captions[0]` is the title slide caption, `captions[1..]` are per-slide captions with `@handle` venue mentions), returns a single combined caption string. Module-level function, defined before `postToInstagram` in the same file. Consumed by Task 3's `postToFacebook` call site and `handleInstagramPost`.

- [ ] **Step 1: Add the extracted function directly before `postToInstagram`**

Find (near the top of the file):
```js
// Instagram posting function
async function postToInstagram(imageUrls, captions) {
```

Insert immediately before it:
```js
// Builds the combined caption used for both Instagram and Facebook posts:
// title slide caption plus a fair, randomized selection of up to 19 venue
// @handle mentions pulled from the per-slide captions (Instagram caps
// mentions around 20-30; kept well under that limit).
function buildCombinedCaption(captions) {
  let combinedCaption = captions[0]; // Start with title slide caption

  // Extract venue handles from all other captions
  const venueHandleMatches = [];
  for (let i = 1; i < captions.length; i++) {
    const matches = captions[i].match(/@[a-zA-Z0-9_.]+/g) || [];
    matches.forEach(match => {
      if (!venueHandleMatches.includes(match)) {
        venueHandleMatches.push(match);
      }
    });
  }

  // Instagram has a limit on mentions (around 20-30)
  // Implement a fair, randomized selection algorithm with maximum of 19 venues
  const MAX_VENUE_MENTIONS = 19;
  let mentionedVenues = [];

  if (venueHandleMatches.length <= MAX_VENUE_MENTIONS) {
    // If we're under the limit, use all venues
    mentionedVenues = venueHandleMatches;
  } else {
    console.log(`WARNING: Found ${venueHandleMatches.length} venues but Instagram has a limit of ${MAX_VENUE_MENTIONS}.`);

    // Create a mapping of venues by slide/caption
    const venuesBySlide = {};
    for (let i = 1; i < captions.length; i++) {
      const slideMatches = captions[i].match(/@[a-zA-Z0-9_.]+/g) || [];
      venuesBySlide[i] = slideMatches.filter(match => !mentionedVenues.includes(match));
    }

    // Step 1: Ensure at least one venue from each slide (if possible)
    // This maintains fairness across different locations/slides
    const slideIndices = Object.keys(venuesBySlide);
    // Shuffle the slide order for randomness
    slideIndices.sort(() => Math.random() - 0.5);

    slideIndices.forEach(slideIndex => {
      if (mentionedVenues.length < MAX_VENUE_MENTIONS && venuesBySlide[slideIndex].length > 0) {
        // Randomly select one venue from this slide
        const randomIndex = Math.floor(Math.random() * venuesBySlide[slideIndex].length);
        const venueToAdd = venuesBySlide[slideIndex][randomIndex];

        if (!mentionedVenues.includes(venueToAdd)) {
          mentionedVenues.push(venueToAdd);
        }
      }
    });

    // Step 2: Fill remaining slots with randomly selected venues
    if (mentionedVenues.length < MAX_VENUE_MENTIONS) {
      // Create a flat list of remaining handles that haven't been added yet
      const remainingHandles = venueHandleMatches.filter(handle => !mentionedVenues.includes(handle));

      // Shuffle the remaining handles for randomness
      remainingHandles.sort(() => Math.random() - 0.5);

      // Add as many as possible until we hit the limit
      while (mentionedVenues.length < MAX_VENUE_MENTIONS && remainingHandles.length > 0) {
        mentionedVenues.push(remainingHandles.shift());
      }
    }

    console.log(`DEBUG: Fair random venue selection - chosen ${mentionedVenues.length} venues from ${venueHandleMatches.length} total`);
  }

  // Add venue handles to the caption with updated text
  if (mentionedVenues.length > 0) {
    combinedCaption += '\n\nShoutout to a random selection of today\'s venues (often there are too many to @ here): ' + mentionedVenues.join(' ');
    console.log(`DEBUG: Added ${mentionedVenues.length} venue handles to caption`);
  }

  return combinedCaption;
}

// Instagram posting function
async function postToInstagram(imageUrls, captions) {
```

- [ ] **Step 2: Replace the now-duplicated logic inside `postToInstagram` with a call to the helper**

Find, inside `postToInstagram` (after the media upload loop, at the start of "Step 2: Create carousel container"):
```js
    // Step 2: Create carousel container
    console.log('Creating carousel container with media IDs:', mediaIds);
    
    // Create a combined caption that includes venue handles from all slides
    let combinedCaption = captions[0]; // Start with title slide caption
    
    // Extract venue handles from all other captions
    const venueHandleMatches = [];
    for (let i = 1; i < captions.length; i++) {
      const matches = captions[i].match(/@[a-zA-Z0-9_.]+/g) || [];
      matches.forEach(match => {
        if (!venueHandleMatches.includes(match)) {
          venueHandleMatches.push(match);
        }
      });
    }
    
    // Instagram has a limit on mentions (around 20-30)
    // Implement a fair, randomized selection algorithm with maximum of 19 venues
    const MAX_VENUE_MENTIONS = 19;
    let mentionedVenues = [];
    
    if (venueHandleMatches.length <= MAX_VENUE_MENTIONS) {
      // If we're under the limit, use all venues
      mentionedVenues = venueHandleMatches;
    } else {
      console.log(`WARNING: Found ${venueHandleMatches.length} venues but Instagram has a limit of ${MAX_VENUE_MENTIONS}.`);
      
      // Create a mapping of venues by slide/caption
      const venuesBySlide = {};
      for (let i = 1; i < captions.length; i++) {
        const slideMatches = captions[i].match(/@[a-zA-Z0-9_.]+/g) || [];
        venuesBySlide[i] = slideMatches.filter(match => !mentionedVenues.includes(match));
      }
      
      // Step 1: Ensure at least one venue from each slide (if possible)
      // This maintains fairness across different locations/slides
      const slideIndices = Object.keys(venuesBySlide);
      // Shuffle the slide order for randomness
      slideIndices.sort(() => Math.random() - 0.5);
      
      slideIndices.forEach(slideIndex => {
        if (mentionedVenues.length < MAX_VENUE_MENTIONS && venuesBySlide[slideIndex].length > 0) {
          // Randomly select one venue from this slide
          const randomIndex = Math.floor(Math.random() * venuesBySlide[slideIndex].length);
          const venueToAdd = venuesBySlide[slideIndex][randomIndex];
          
          if (!mentionedVenues.includes(venueToAdd)) {
            mentionedVenues.push(venueToAdd);
          }
        }
      });
      
      // Step 2: Fill remaining slots with randomly selected venues
      if (mentionedVenues.length < MAX_VENUE_MENTIONS) {
        // Create a flat list of remaining handles that haven't been added yet
        const remainingHandles = venueHandleMatches.filter(handle => !mentionedVenues.includes(handle));
        
        // Shuffle the remaining handles for randomness
        remainingHandles.sort(() => Math.random() - 0.5);
        
        // Add as many as possible until we hit the limit
        while (mentionedVenues.length < MAX_VENUE_MENTIONS && remainingHandles.length > 0) {
          mentionedVenues.push(remainingHandles.shift());
        }
      }
      
      console.log(`DEBUG: Fair random venue selection - chosen ${mentionedVenues.length} venues from ${venueHandleMatches.length} total`);
    }
    
    // Add venue handles to the caption with updated text
    if (mentionedVenues.length > 0) {
      combinedCaption += '\n\nShoutout to a random selection of today\'s venues (often there are too many to @ here): ' + mentionedVenues.join(' ');
      console.log(`DEBUG: Added ${mentionedVenues.length} venue handles to caption`);
    }
    
    const carouselParams = new URLSearchParams({
```

Replace with:
```js
    // Step 2: Create carousel container
    console.log('Creating carousel container with media IDs:', mediaIds);

    const combinedCaption = buildCombinedCaption(captions);

    const carouselParams = new URLSearchParams({
```

- [ ] **Step 3: Verify the app still builds**

Run: `npm run build`
Expected: builds successfully

- [ ] **Step 4: Verify lint**

Run: `npx eslint src/instagramgallery.jsx`
Expected: no new errors

- [ ] **Step 5: Verify zero behavior change by reading, not running**

Confirm by re-reading both the new `buildCombinedCaption` function and the new one-line call site: every variable name, every line of logic, and the final `combinedCaption` value construction is byte-for-byte identical to what was removed — only extracted into its own function with a `return` instead of leaving the value in an outer scope. This task must not change what caption text Instagram posts.

- [ ] **Step 6: Commit**

```bash
git add src/instagramgallery.jsx
git commit -m "Extract buildCombinedCaption from postToInstagram (no behavior change)

Pure refactor to make the caption-building logic reusable for the
upcoming Facebook cross-posting feature. postToInstagram's output is
unchanged - same captions array in, same combined caption string out."
git pull --rebase origin main
git push origin main
```

---

### Task 3: Add postToFacebook and wire it into the posting flow

**Files:**
- Modify: `src/instagramgallery.jsx` (add `postToFacebook` after `postToInstagram`; modify `postToInstagram`'s return value; add `channels` prop to `Carousel`; modify `handleInstagramPost`; add `channels` to the `Carousel` invocation)

**Interfaces:**
- Consumes: `buildCombinedCaption(captions)` from Task 2; `LOCATIONS[].channels` from Task 1
- Produces: `async function postToFacebook(imageUrls, caption)` returning `{ success: true, postId } | { success: false, error, details }` — same shape as `postToInstagram`

- [ ] **Step 1: Add `postToFacebook` as a new module-level function, directly after `postToInstagram`'s closing brace**

Find the end of `postToInstagram`:
```js
    console.log('Carousel posted successfully:', publishData);
    return { success: true, postId: publishData.id };

  } catch (error) {
    console.error('Error posting carousel:', error);
    return { 
      success: false, 
      error: error.message,
      details: error.response?.data || error 
    };
  }
}
```

Change the success return to also include the caption used (needed so `handleInstagramPost` can reuse the exact same caption for Facebook, rather than building a second, differently-randomized one):
```js
    console.log('Carousel posted successfully:', publishData);
    return { success: true, postId: publishData.id, caption: combinedCaption };

  } catch (error) {
    console.error('Error posting carousel:', error);
    return { 
      success: false, 
      error: error.message,
      details: error.response?.data || error 
    };
  }
}
```

Then add `postToFacebook` immediately after that closing `}`:
```js
// Facebook posting function - reuses the same images and caption already
// prepared for Instagram. Uses the same access token (VITE_INSTAGRAM_ACCESS_TOKEN)
// since the Facebook Page and Instagram Business Account share one app/token.
async function postToFacebook(imageUrls, caption) {
  const INSTAGRAM_ACCESS_TOKEN = import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN;

  try {
    if (!INSTAGRAM_ACCESS_TOKEN) {
      throw new Error('Missing Instagram access token (also used for Facebook)');
    }

    // Step 1: Get the Facebook Page ID and Page Access Token
    console.log('Fetching Facebook Page access token...');
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${INSTAGRAM_ACCESS_TOKEN}`
    );
    const accountsData = await accountsResponse.json();
    console.log('Facebook accounts response:', accountsData);

    if (!accountsData.data || accountsData.data.length === 0) {
      throw new Error(`No Facebook Pages found for this account. Response: ${JSON.stringify(accountsData)}`);
    }

    const page = accountsData.data[0];
    const pageId = page.id;
    const pageAccessToken = page.access_token;

    // Step 2: Upload each image, unpublished, to get photo IDs
    const photoIds = [];
    for (const imageUrl of imageUrls) {
      console.log(`Uploading image to Facebook: ${imageUrl}`);

      const params = new URLSearchParams({
        url: imageUrl,
        published: 'false',
        access_token: pageAccessToken
      });

      const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/photos`, {
        method: 'POST',
        body: params
      });

      const data = await response.json();
      console.log('Facebook photo upload response:', data);

      if (!data.id) {
        throw new Error(`Failed to upload image to Facebook: ${imageUrl}. Response: ${JSON.stringify(data)}`);
      }

      photoIds.push(data.id);
      console.log(`Image uploaded to Facebook successfully. Photo ID: ${data.id}`);
    }

    // Step 3: Create the feed post with all photos attached
    console.log('Creating Facebook feed post...');
    const feedParams = new URLSearchParams({
      message: caption,
      attached_media: JSON.stringify(photoIds.map(id => ({ media_fbid: id }))),
      access_token: pageAccessToken
    });

    const feedResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
      method: 'POST',
      body: feedParams
    });

    const feedData = await feedResponse.json();
    console.log('Facebook feed post response:', feedData);

    if (!feedData.id) {
      throw new Error(`Failed to create Facebook post. Response: ${JSON.stringify(feedData)}`);
    }

    console.log('Facebook post created successfully:', feedData);
    return { success: true, postId: feedData.id };

  } catch (error) {
    console.error('Error posting to Facebook:', error);
    return {
      success: false,
      error: error.message,
      details: error.response?.data || error
    };
  }
}
```

Note: this takes `accountsData.data[0]` as *the* Facebook Page, with no multi-page selection logic — correct for this project's setup (one Page linked to one Instagram Business Account). If a second Page is ever added to the same account, this would need revisiting, but do not add speculative multi-page handling now.

- [ ] **Step 2: Add `channels` to the `Carousel` component's props**

Find:
```js
function Carousel({
  title,
  location,
  date,
  gigs,
  id
}) {
```

Replace with:
```js
function Carousel({
  title,
  location,
  date,
  gigs,
  id,
  channels
}) {
```

- [ ] **Step 3: Pass `channels` at the `Carousel` invocation site**

Find:
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
                channels={loc.channels}
              />
            ))}
```

- [ ] **Step 4: Rewrite `handleInstagramPost` to post to whichever channels this location has**

Find:
```js
  const handleInstagramPost = async () => {
    if (!uploadedImages) return;

    // Removed confirmation dialog for automation
    setIsPosting(true);
    setUploadStatus('Posting to Instagram...');

    try {
      console.log('DEBUG: Preparing to post to Instagram');
      
      // Extract all venue handles from captions for debugging
      const allHandles = [];
      uploadedImages.captions.forEach((caption, index) => {
        const handleMatches = caption.match(/@[a-zA-Z0-9_.]+/g) || [];
        console.log(`DEBUG: Caption ${index + 1} contains ${handleMatches.length} venue handles:`, handleMatches);
        
        handleMatches.forEach(handle => {
          if (!allHandles.includes(handle)) {
            allHandles.push(handle);
          }
        });
      });
      
      console.log('DEBUG: Found total of', allHandles.length, 'unique venue handles:', allHandles);
      console.log('DEBUG: These handles should appear in the Instagram post caption');
      
      const result = await postToInstagram(uploadedImages.urls, uploadedImages.captions);
      if (result.success) {
        setUploadStatus('Successfully posted to Instagram!');
      } else {
        setUploadStatus(`Instagram posting failed: ${result.error}`);
      }
    } catch (err) {
      setUploadStatus(`Instagram posting failed: ${err.message}`);
    } finally {
      setIsPosting(false);
    }
  };
```

Replace with:
```js
  const handleInstagramPost = async () => {
    if (!uploadedImages) return;

    // Removed confirmation dialog for automation
    setIsPosting(true);
    setUploadStatus('Posting...');

    try {
      console.log('DEBUG: Preparing to post');

      // Extract all venue handles from captions for debugging
      const allHandles = [];
      uploadedImages.captions.forEach((caption, index) => {
        const handleMatches = caption.match(/@[a-zA-Z0-9_.]+/g) || [];
        console.log(`DEBUG: Caption ${index + 1} contains ${handleMatches.length} venue handles:`, handleMatches);
        
        handleMatches.forEach(handle => {
          if (!allHandles.includes(handle)) {
            allHandles.push(handle);
          }
        });
      });
      
      console.log('DEBUG: Found total of', allHandles.length, 'unique venue handles:', allHandles);
      console.log('DEBUG: These handles should appear in the post captions');

      const statusParts = [];
      let sharedCaption = null;

      if (channels.includes('instagram')) {
        const result = await postToInstagram(uploadedImages.urls, uploadedImages.captions);
        if (result.success) {
          sharedCaption = result.caption;
          statusParts.push('Successfully posted to Instagram!');
        } else {
          statusParts.push(`Instagram posting failed: ${result.error}`);
        }
      }

      if (channels.includes('facebook')) {
        // Reuse Instagram's exact caption if it just ran (same randomized
        // venue mentions on both platforms); otherwise build it fresh -
        // this location may be configured for Facebook only.
        const caption = sharedCaption ?? buildCombinedCaption(uploadedImages.captions);
        const fbResult = await postToFacebook(uploadedImages.urls, caption);
        if (fbResult.success) {
          statusParts.push('Successfully posted to Facebook!');
        } else {
          statusParts.push(`Facebook posting failed: ${fbResult.error}`);
        }
      }

      setUploadStatus(statusParts.join(' | '));
    } catch (err) {
      setUploadStatus(`Posting failed: ${err.message}`);
    } finally {
      setIsPosting(false);
    }
  };
```

Note: the status text `'Successfully posted to Instagram!'` is preserved verbatim (still the first entry in the joined string when Instagram runs) — this must not change, since the Pi's `checkCarouselSuccess` does `statusDiv.textContent.includes('Successfully posted to Instagram')`, an unchanged substring match. Appending `' | Successfully posted to Facebook!'` after it does not break that check.

- [ ] **Step 5: Verify the app still builds**

Run: `npm run build`
Expected: builds successfully

- [ ] **Step 6: Verify lint**

Run: `npx eslint src/instagramgallery.jsx`
Expected: no new errors

- [ ] **Step 7: Manual review checklist (no live post - verify by reading)**

Confirm by reading the diff:
- [ ] `postToInstagram`'s only behavior change is the added `caption` field on its success return — the `carouselParams`/`media_publish` calls, polling loop, and error handling are all untouched
- [ ] When `channels` is `['instagram', 'facebook']` (today's default for all locations) and Instagram succeeds: Facebook reuses `result.caption`, `buildCombinedCaption` is NOT called a second time (avoiding a second, differently-randomized venue selection)
- [ ] When `channels` is `['facebook']` only: Instagram is skipped entirely, `sharedCaption` stays `null`, `buildCombinedCaption(uploadedImages.captions)` is called directly for Facebook
- [ ] When `channels` is `['instagram']` only: Facebook block is skipped entirely, `postToFacebook` is never called
- [ ] The literal substring `'Successfully posted to Instagram'` still appears in `uploadStatus` exactly when Instagram posting succeeds, unchanged from before this task (verify against `pi-automation/pi-automation.js`'s `checkCarouselSuccess`, which is NOT modified by this plan and still searches for that exact substring)
- [ ] `pi-automation/pi-automation.js` has zero changes in this task's diff

- [ ] **Step 8: Commit**

```bash
git add src/instagramgallery.jsx
git commit -m "Add Facebook cross-posting, gated by per-location channels config

Reuses the same images and caption already generated for Instagram.
Facebook posting cannot succeed live until the access token is
regenerated with the pages_manage_posts scope (manual prerequisite,
not part of this change)."
git pull --rebase origin main
git push origin main
```

---

## Self-Review

**Spec coverage:**
- `channels` config in `locations.js` ✓ (Task 1)
- Reuse same images/caption, no new rendering ✓ (Task 3, `postToFacebook` takes `imageUrls`/`caption` params directly, no new upload/render calls)
- Facebook posting via `/me/accounts` → `/photos` → `/feed` ✓ (Task 3 Step 1)
- No changes to `pi-automation.js` ✓ (explicit in Global Constraints and Task 3's review checklist)
- No changes to `checkCarouselSuccess`/success-tally ✓ (explicit in Global Constraints; Task 3 verifies the substring match survives)
- Facebook status shown in UI, best-effort ✓ (Task 3 Step 4, `statusParts.join(' | ')`)
- No live posting in the plan ✓ (Global Constraints, no task runs `node pi-automation.js` or clicks a real post button)

**Placeholder scan:** No TBD/TODO; every step has literal code.

**Type/name consistency:** `buildCombinedCaption(captions)` signature matches between its definition (Task 2) and both call sites (`postToInstagram` in Task 2, `handleInstagramPost`'s Facebook-only branch in Task 3). `postToFacebook(imageUrls, caption)` signature matches between definition and call site (both Task 3). `result.caption` (Task 3 Step 1's `postToInstagram` change) matches `sharedCaption = result.caption` (Task 3 Step 4).

**Scope:** Two files, three cleanly separable tasks (config, refactor, feature). Appropriately sized for one plan.
