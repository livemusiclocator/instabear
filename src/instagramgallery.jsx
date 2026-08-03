/* eslint-disable no-unused-vars */
import React from 'react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
/* eslint-enable no-unused-vars */
import PropTypes from 'prop-types';
import { toPng } from 'html-to-image';
import { Octokit } from "@octokit/rest";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { LOCATIONS } from './constants/locations.js';

const octokit = new Octokit({
  auth: import.meta.env.VITE_GITHUB_TOKEN
});

const getMelbourneDate = () => {
  return new Date().toLocaleDateString('en-AU', { 
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).split('/').reverse().join('-');
};
const getPublicUrl = () => {
  return `https://lml.live/?dateRange=today`;  // Always use lml.live for the website URL
};
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
    combinedCaption += '\n\nShoutout to a random selection of today\'s venues and artists (often there are too many to @ here): ' + mentionedVenues.join(' ');
    console.log(`DEBUG: Added ${mentionedVenues.length} venue handles to caption`);
  }

  return combinedCaption;
}

// Instagram posting function
async function postToInstagram(imageUrls, captions) {
  console.log('Environment variables:', {
    hasAccessToken: !!import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN,
    hasBusinessId: !!import.meta.env.VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID,
  });

  const INSTAGRAM_ACCESS_TOKEN = import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN;
  const INSTAGRAM_BUSINESS_ACCOUNT_ID = import.meta.env.VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID;

  console.log('Token analysis:', {
    length: INSTAGRAM_ACCESS_TOKEN?.length,
    firstChars: INSTAGRAM_ACCESS_TOKEN?.substring(0, 10) + '...',
    lastChars: '...' + INSTAGRAM_ACCESS_TOKEN?.substring(INSTAGRAM_ACCESS_TOKEN.length - 10),
    containsSpaces: INSTAGRAM_ACCESS_TOKEN?.includes(' '),
    containsNewlines: INSTAGRAM_ACCESS_TOKEN?.includes('\n')
  });

  // Note: Photo tagging would require Instagram User IDs, not just handles
  // Instagram Graph API only allows tagging in single photos, not carousels
  // This would be a future enhancement requiring additional data and permissions
  console.log('Note: Direct photo tagging is not implemented - using caption mentions instead');


  try {
    console.log('Starting Instagram post process with URLs:', imageUrls);

    if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_BUSINESS_ACCOUNT_ID) {
      throw new Error('Missing Instagram credentials');
    }

    
    // Step 1: Upload each image and get media IDs
    const mediaIds = [];
    for (const imageUrl of imageUrls) {
      console.log(`Uploading image: ${imageUrl}`);
      
      const params = new URLSearchParams({
        image_url: imageUrl,
        access_token: INSTAGRAM_ACCESS_TOKEN,
        is_carousel_item: 'true',
        media_type: 'IMAGE'
      });

      const response = await fetch(`https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`, {
        method: 'POST',
        body: params
      });

      const data = await response.json();
      console.log('Image upload response:', data);

      if (!data.id) {
        throw new Error(`Failed to upload image: ${imageUrl}. Response: ${JSON.stringify(data)}`);
      }

      mediaIds.push(data.id);
      console.log(`Image uploaded successfully. Media ID: ${data.id}`);
      
      // Small delay between uploads
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 2: Create carousel container
    console.log('Creating carousel container with media IDs:', mediaIds);

    const combinedCaption = buildCombinedCaption(captions);

    const carouselParams = new URLSearchParams({
      media_type: 'CAROUSEL',
      children: mediaIds.join(','),
      caption: combinedCaption,
      access_token: INSTAGRAM_ACCESS_TOKEN
    });

    const carouselResponse = await fetch(`https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`, {
      method: 'POST',
      body: carouselParams
    });

    const carouselData = await carouselResponse.json();
    console.log('Carousel container response:', carouselData);

    if (!carouselData.id) {
      throw new Error(`Failed to create carousel container. Response: ${JSON.stringify(carouselData)}`);
    }

    const carouselContainerId = carouselData.id;
    console.log(`Carousel container created successfully. Container ID: ${carouselContainerId}`);

    // Step 2.5: Poll until Instagram has finished processing the container.
    // Publishing immediately after creation intermittently fails with
    // "Media ID is not available" (error_subcode 2207027) because the
    // container isn't ready yet.
    let containerStatus = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const statusResponse = await fetch(
        `https://graph.facebook.com/v18.0/${carouselContainerId}?fields=status_code&access_token=${INSTAGRAM_ACCESS_TOKEN}`
      );
      const statusData = await statusResponse.json();
      containerStatus = statusData.status_code;
      console.log(`Container status check ${attempt + 1}: ${containerStatus}`);

      if (containerStatus === 'FINISHED') break;
      if (containerStatus === 'ERROR') {
        throw new Error(`Carousel container failed processing: ${JSON.stringify(statusData)}`);
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    if (containerStatus !== 'FINISHED') {
      throw new Error(`Carousel container not ready after polling. Last status: ${containerStatus}`);
    }

    // Step 3: Publish the carousel
    // Even after status_code === 'FINISHED', publish can still intermittently
    // fail with "Media ID is not available" (error_subcode 2207027) - Meta's
    // own error message says to just wait and retry.
    console.log('Publishing carousel...');

    const publishParams = new URLSearchParams({
      creation_id: carouselContainerId,
      access_token: INSTAGRAM_ACCESS_TOKEN
    });

    let publishData = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const publishResponse = await fetch(`https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media_publish`, {
        method: 'POST',
        body: publishParams
      });

      publishData = await publishResponse.json();
      console.log(`Publish attempt ${attempt + 1} response:`, publishData);

      if (publishData.id) break;
      if (publishData.error?.error_subcode !== 2207027) break;

      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (!publishData.id) {
      throw new Error(`Failed to publish carousel. Response: ${JSON.stringify(publishData)}`);
    }

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

const uploadToGitHub = async (base64Image, filename) => {
  console.log('Starting GitHub upload with token present:', !!import.meta.env.VITE_GITHUB_TOKEN);
  
  const content = base64Image.split(',')[1];
  const path = `temp-images/${filename}`;
  
  try {
    console.log('Attempting to check if file exists:', {
      owner: 'livemusiclocator',
      repo: 'instabear',
      path,
      ref: 'main'
    });

    // Check if file exists
    let sha;
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: 'livemusiclocator',
        repo: 'instabear',
        path,
        ref: 'main'
      });
      sha = data.sha;
      console.log('File exists, got SHA:', sha);
    } catch (error) {
      console.log('File does not exist yet (this is normal for new files):', error.message);
    }

    console.log('Preparing upload with params:', {
      owner: 'livemusiclocator',
      repo: 'instabear',
      path,
      contentLength: content.length,
      hasSha: !!sha,
      branch: 'main'
    });

    // Upload file
    const result = await octokit.rest.repos.createOrUpdateFileContents({
      owner: 'livemusiclocator',
      repo: 'instabear',
      path,
      message: `Add temporary image ${filename}`,
      content,
      ...(sha && { sha }),
      branch: 'main'
    });

    console.log('Upload successful result:', {
      status: result.status,
      url: result.data?.content?.download_url
    });

    // Generate and return the GitHub raw URL for direct image access
    const publicUrl = `https://raw.githubusercontent.com/livemusiclocator/instabear/main/${path}`;
    console.log('Generated public URL:', publicUrl);
    return publicUrl;

  } catch (error) {
    console.error('Detailed GitHub upload error:', {
      message: error.message,
      status: error.status,
      response: error.response?.data,
      token: import.meta.env.VITE_GITHUB_TOKEN ? 'Present' : 'Missing'
    });
    throw new Error(`GitHub upload failed: ${error.message}`);
  }
};

// Constants
const BRAND_BLUE = '#00B2E3';
const BRAND_ORANGE = '#FF5C35';
const INSTAGRAM_HEIGHT = 540;
const HEADER_HEIGHT = 48;
const MIN_BOTTOM_MARGIN = 24;
const CONTAINER_HEIGHT = INSTAGRAM_HEIGHT - HEADER_HEIGHT - MIN_BOTTOM_MARGIN - 16;

// Utility functions
function measureTextWidth(text, fontSize, fontWeight) {
  const measure = document.createElement('span');
  measure.style.cssText = `
    position: absolute;
    visibility: hidden;
    white-space: nowrap;
    font-size: ${fontSize};
    font-weight: ${fontWeight};
  `;
  measure.textContent = text;
  document.body.appendChild(measure);
  const width = measure.offsetWidth;
  document.body.removeChild(measure);
  return width;
}

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

function getSuburb(address) {
  const match = address.match(/(?:,\s*)?([A-Za-z\s]+)(?:\s+\d{4})?$/);
  return match ? match[1].trim() : '';
}

function getPostcode(venue) {
  // First try to use the dedicated postcode field if it exists
  if (venue.postcode) {
    return venue.postcode;
  }
  
  // Fall back to extracting from address if postcode field is not available
  const match = venue.address.match(/\b(\d{4})\b/);
  return match ? match[1] : '';
}

function formatPrice(gig) {
  // Extract the relevant information
  const venueName = gig.venue.name;
  const informationTags = gig.information_tags || [];
  const prices = gig.prices || [];
  let output = '';
  let reason = '';
  
  
  // NEW LOGIC:
  // 1. If there is ANY price info, display "$Ticketed"
  if (prices.length > 0) {
    output = '$Ticketed';
    reason = 'Has price data, showing "$Ticketed"';
  }
  // 2. If the Information field says "Free", display "Free"
  else if (informationTags.some(tag => tag.toLowerCase() === 'free')) {
    output = 'Free';
    reason = 'Using "Free" from information_tags';
  }
  // 3. If there is no info in either field, leave it blank
  else {
    output = '';
    reason = 'No price data or "Free" tag found';
  }
  
  // Format the log message as requested
  console.log(`Venue: ${venueName.padEnd(30)} | Information: ${JSON.stringify(informationTags).padEnd(30)} | Prices: ${JSON.stringify(prices).padEnd(30)} | Output: ${output} (${reason})`);
  
  return output;
}

// Caption generator
// Import venue Instagram handles mapping
import venueHandles from '../venueInstagramHandles.json';

// Log available venue handles for debugging
console.log('DEBUG: Loaded venue Instagram handles:', {
  totalHandles: Object.keys(venueHandles).length,
  sampleHandles: Object.keys(venueHandles).slice(0, 5).map(id => ({ id, handle: venueHandles[id] }))
});

const INSTAGRAM_NON_PROFILE_PATHS = new Set([
  'explore', 'accounts', 'reel', 'reels', 'p', 'tv', 'stories',
]);

// Validates an act's Instagram URL into a taggable @handle, rejecting
// junk placeholder URLs like https://www.instagram.com/?hl=en that
// api.lml.live sometimes returns instead of a real profile link.
// eslint-disable-next-line react-refresh/only-export-components
export function extractInstagramHandle(url) {
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

// Support acts share a gig, so tag every act with a valid handle, not
// just the first - valid act data is already rare (~14% of gigs in one
// sample), so this doesn't meaningfully lengthen captions.
// eslint-disable-next-line react-refresh/only-export-components
export function getValidActHandles(gig) {
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

function generateCaption(slideGigs, slideIndex, totalSlides, date, location) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    timeZone: 'Australia/Melbourne',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // Debug logging of gigs and their venues for this slide
  console.log(`DEBUG: Generating caption for slide ${slideIndex + 1} with ${slideGigs.length} gigs`);
  slideGigs.forEach(gig => {
    console.log('DEBUG: Gig venue details:', {
      gigName: gig.name,
      venueId: gig.venue.id,
      venueName: gig.venue.name,
      hasHandle: !!venueHandles[gig.venue.id],
      handle: venueHandles[gig.venue.id] || 'none'
    });
  });
  
  // Log available venue handles for this location
  console.log('DEBUG: Processing caption for', location, 'with', slideGigs.length, 'gigs');

  let caption = `More information here: ${getPublicUrl('?dateRange=today')}\n\n`;
  caption += `🎵 Live Music Locator - ${location} - ${formattedDate}\n`;
  caption += `Slide ${slideIndex + 1} of ${totalSlides}\n\n`;
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

  // Log the final caption for verification
  console.log('DEBUG: Generated caption:', caption);
  
  return caption;
}

// Define prop types for GigPanel
GigPanel.propTypes = {
  gig: PropTypes.shape({
    name: PropTypes.string.isRequired,
    genre_tags: PropTypes.arrayOf(PropTypes.string),
    venue: PropTypes.shape({
      name: PropTypes.string.isRequired,
      address: PropTypes.string.isRequired
    }).isRequired,
    start_time: PropTypes.string.isRequired,
    information_tags: PropTypes.arrayOf(PropTypes.string),
    prices: PropTypes.arrayOf(PropTypes.shape({
      amount: PropTypes.string
    }))
  }).isRequired,
  isLast: PropTypes.bool.isRequired
};

// GigPanel Component
function GigPanel({ gig, isLast }) {
  const gigNameRef = useRef(null);
  const panelRef = useRef(null);
  const [showGenreTag, setShowGenreTag] = useState(false);

  useEffect(() => {
    if (gigNameRef.current && panelRef.current && gig.genre_tags?.length > 0) {
      const panelWidth = panelRef.current.offsetWidth;
      const gigNameWidth = gigNameRef.current.offsetWidth;
      const genreTagWidth = measureTextWidth(gig.genre_tags[0], '14px', '300');
      
      if (gigNameWidth + genreTagWidth + 20 <= panelWidth) {
        setShowGenreTag(true);
      } else {
        setShowGenreTag(false);
      }
    }
  }, [gig]);

  return (
    <div
      ref={panelRef}
      className={`bg-black bg-opacity-40 backdrop-blur-sm rounded-lg p-1.5 ${
        !isLast ? 'mb-0.25' : ''
      } relative shadow-lg`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-end mb-0.5">
            <h3
              ref={gigNameRef}
              className="text-white text-xl font-semibold leading-tight"
            >
              {toTitleCase(gig.name)}
            </h3>
            {showGenreTag && gig.genre_tags?.length > 0 && (
              <span
                className="text-sm font-light whitespace-nowrap"
                style={{ color: BRAND_BLUE }}
              >
                {gig.genre_tags[0]}
              </span>
            )}
          </div>

          <div className="flex items-center">
            <span style={{ color: BRAND_BLUE }} className="text-lg truncate">
              {toTitleCase(gig.venue.name)}
            </span>
            <span className="text-gray-500 mx-1">•</span>
            <span className="text-gray-400 text-base truncate">
              {getSuburb(gig.venue.address)}
            </span>
          </div>
        </div>

        <div className="text-right ml-3 shrink-0">
          <div className="text-white text-xl font-semibold">
            {gig.start_time}
          </div>
          <div style={{ color: BRAND_ORANGE }} className="text-lg">
            {formatPrice(gig)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Define prop types for LocationTitleSlide
LocationTitleSlide.propTypes = {
  date: PropTypes.string.isRequired,
  location: PropTypes.string.isRequired,
  className: PropTypes.string,
  slideRef: PropTypes.object
};

// Fits a location display name into the title slide: tries progressively
// smaller single-line font sizes first, then falls back to greedy word-wrap
// at the smallest size if it still doesn't fit on one line.
function fitLocationTitle(displayName) {
  const AVAILABLE_WIDTH = 444; // 540px card minus px-12 (48px) padding each side
  // measureTextWidth resolves the browser's default font stack, which can
  // differ between this measurement (dev/CI) and the Puppeteer/Chromium
  // environment that actually renders the posted image (Raspberry Pi, ARM
  // Linux) - a close-to-exact-fit measured here can genuinely overflow
  // there. Budget against a shrunk width so borderline cases wrap instead
  // of clipping.
  const MAX_TEXT_WIDTH = AVAILABLE_WIDTH * 0.85;
  const SIZES_PX = [56, 40, 35]; // 3.5rem, 2.5rem, 2.2rem

  for (const fontSize of SIZES_PX) {
    if (measureTextWidth(displayName, `${fontSize}px`, 'bold') <= MAX_TEXT_WIDTH) {
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
    if (measureTextWidth(candidate, `${fontSize}px`, 'bold') <= MAX_TEXT_WIDTH) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);

  return { lines, fontSize };
}

// LocationTitleSlide Component
function LocationTitleSlide({ date, location, className = '', slideRef }) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    timeZone: 'Australia/Melbourne',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div ref={slideRef} className={`location-title-slide w-[540px] h-[540px] bg-gray-900 mx-auto rounded-3xl overflow-hidden shadow-lg relative flex flex-col items-center ${className}`}>
      <div className="mt-6 mb-4">
        <img src="./lml-logo.png" alt="Live Music Locator" className="w-32 h-32" />
      </div>
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
        <h2 className="text-white text-[2.2rem] mb-4">
          Gig Guide
        </h2>
        <p className="text-[1.71rem]" style={{ color: BRAND_BLUE }}>
          {toTitleCase(formattedDate)}
        </p>
      </div>
    </div>
  );
}

// Define prop types for Carousel
Carousel.propTypes = {
  title: PropTypes.string.isRequired,
  location: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  gigs: PropTypes.array.isRequired,
  id: PropTypes.string.isRequired,
  channels: PropTypes.array.isRequired
};

// Carousel Component
function Carousel({
  title,
  location,
  date,
  gigs,
  id,
  channels
}) {
  // Refs to each slide DOM element
  const slideRefs = useRef([]);
  const titleSlideRef = useRef(null);

  // State for this carousel
  const [uploadedImages, setUploadedImages] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Build slides
  const slides = useMemo(() => {
    const result = [];
    let currentSlide = [];
    let currentHeight = 0;

    gigs.forEach(gig => {
      const nameLines = Math.ceil(gig.name.length / 35);
      const gigHeight = 64 + (nameLines - 1) * 24 + 8;

      if (currentHeight + gigHeight > CONTAINER_HEIGHT) {
        result.push(currentSlide);
        currentSlide = [gig];
        currentHeight = gigHeight;
      } else {
        currentSlide.push(gig);
        currentHeight += gigHeight;
      }
    });

    if (currentSlide.length > 0) {
      result.push(currentSlide);
    }

    return result;
  }, [gigs]);

  // Render slides to images
  const renderSlidesToImages = async () => {
    setUploadStatus('Generating and uploading images...');
    try {
      let captions = [];
      let imageUrls = [];

      const options = {
        width: 540,
        height: 540,
        backgroundColor: '#1a1a1a',
        pixelRatio: 1.9,
        preserveAlpha: true,
        quality: 1.0
      };

      // Title slide
      const titleSlide = titleSlideRef.current;
      if (titleSlide) {
        const dataUrl = await toPng(titleSlide, options);
        const formattedDate = date.replace(/-/g, '');
        const filename = `gigs_${formattedDate}_${id}_carousel0.png`;

        const githubUrl = await uploadToGitHub(dataUrl, filename);
        imageUrls.push(githubUrl);

        const titleCaption = `Live Music Locator is a not-for-profit service designed to make it possible to discover every gig playing at every venue across every genre at any one time. 
        This information will always be verified and free, importantly supporting musicians, our small to medium live music venues, and you the punters.
        More detailed gig information here: https://lml.live/?dateRange=today`;
        captions.push(titleCaption);
      }

      // Gig slides - limit to 9 slides (10 total with title)
      for (let i = 0; i < Math.min(slides.length, 9); i++) {
        const slide = slideRefs.current[i];
        if (slide) {
          const dataUrl = await toPng(slide, options);
          const formattedDate = date.replace(/-/g, '');
          const filename = `gigs_${formattedDate}_${id}_carousel${i + 1}.png`;

          const githubUrl = await uploadToGitHub(dataUrl, filename);
          imageUrls.push(githubUrl);

          const caption = generateCaption(slides[i], i, Math.min(slides.length, 9), date, location);
          captions.push(caption);
        }
      }

      console.log('Uploaded Image URLs:', imageUrls);
      setUploadedImages({ urls: imageUrls, captions });
      setUploadStatus('Images ready for Instagram posting');

      return imageUrls;
    } catch (err) {
      console.error('Error rendering and uploading slides:', err);
      setUploadStatus(`Error: ${err.message}`);
      throw err;
    }
  };

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

  // Handle downloading images as a zip file
  const handleDownloadImages = async () => {
    if (!uploadedImages) return;
    
    setUploadStatus('Preparing images for download...');
    
    try {
      const zip = new JSZip();
      const promises = [];
      
      // Add each image to the zip file
      uploadedImages.urls.forEach(url => {
        const filename = url.split('/').pop();
        const promise = fetch(url)
          .then(response => response.blob())
          .then(blob => {
            zip.file(filename, blob);
          });
        promises.push(promise);
      });
      
      // Wait for all images to be added to the zip
      await Promise.all(promises);
      
      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Trigger download
      const formattedDate = date.replace(/-/g, '');
      saveAs(zipBlob, `lml_gigs_${formattedDate}_${id}.zip`);
      
      setUploadStatus('Images downloaded successfully');
    } catch (err) {
      console.error('Error downloading images:', err);
      setUploadStatus(`Download failed: ${err.message}`);
    }
  };

  return (
    <div className="mb-16 pb-8 border-b border-gray-300">
      <h2 className="text-2xl font-bold mb-6 text-center">{title}</h2>
      <div className="grid grid-cols-2 gap-8">
        {/* Title slide */}
        <LocationTitleSlide
          date={date}
          location={location}
          className={`location-title-slide-${id}`}
          slideRef={titleSlideRef}
        />

        {/* Gig slides - limit to 9 slides (10 total with title) */}
        {slides.slice(0, 9).map((slideGigs, slideIndex) => (
          <div
            key={slideIndex}
            ref={(el) => (slideRefs.current[slideIndex] = el)}
            className="w-[540px] h-[540px] bg-gray-900 mx-auto rounded-3xl overflow-hidden shadow-lg relative"
          >
            <div className="h-12 px-4 flex items-center justify-between border-b border-gray-700">
              <h2 className="text-white text-2xl font-bold">
                {new Date(date).toLocaleDateString('en-US', {
                  timeZone: 'Australia/Melbourne',
                  weekday: 'long'
                })}
              </h2>
              <p style={{ color: BRAND_BLUE }} className="text-xl font-bold">
                {slideIndex + 1} / {Math.min(slides.length, 9)}
              </p>
            </div>

            <div className="px-3 py-2 relative h-[476px]">
              {slideGigs.map((gig, index) => (
                <GigPanel
                  key={index}
                  gig={gig}
                  isLast={index === slideGigs.length - 1}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Actions and status */}
      <div className="text-center mt-8 space-y-4">
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

        {uploadStatus && (
          <div className="text-sm text-gray-600">
            {uploadStatus}
          </div>
        )}
      </div>
    </div>
  );
}

// Main InstagramGallery Component
export default function InstagramGallery() {
  // Basic state
  const [date, setDate] = useState(getMelbourneDate());
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch gigs
  const fetchGigs = useCallback(async (selectedDate) => {
    setLoading(true);
    setError(null);
    try {
      console.log(`Fetching gigs for ${selectedDate}...`);
      const apiLocations = [...new Set(LOCATIONS.map((loc) => loc.apiLocation))];
      const responses = await Promise.all(
        apiLocations.map((apiLocation) => {
          const url = `https://api.lml.live/gigs/query?location=${apiLocation}&date_from=${selectedDate}&date_to=${selectedDate}`;
          console.log(`API URL: ${url}`);
          return fetch(url).then((res) => res.json());
        })
      );
      const gigsById = new Map();
      responses.flat().forEach((gig) => gigsById.set(gig.id, gig));
      const data = [...gigsById.values()];
      // Log a sample of raw venue IDs from API for debugging
      if (data.length > 0) {
        console.log('DEBUG: API Response Venue ID Format Check:', {
          sampleVenue1: data[0].venue,
          sampleVenue2: data.length > 1 ? data[1].venue : null,
          sampleVenueIdType: typeof data[0].venue.id,
          idInHandlesMap: data[0].venue.id in venueHandles,
          exactMatch: venueHandles[data[0].venue.id]
        });
        
        // Check for potential casing issues or extra whitespace
        if (data[0].venue.id) {
          const rawId = data[0].venue.id;
          const trimmedId = rawId.trim();
          const lowercaseId = rawId.toLowerCase();
          console.log('DEBUG: ID Format Variations:', {
            rawId,
            trimmedId: trimmedId !== rawId ? trimmedId : 'same as raw',
            lowercaseId: lowercaseId !== rawId ? lowercaseId : 'same as raw',
            trimmedLowercaseMatches: venueHandles[trimmedId.toLowerCase()] || 'no match'
          });
          
          // Check for any potential close matches
          const closeMatches = Object.keys(venueHandles).filter(id =>
            id.includes(rawId) || rawId.includes(id)
          ).slice(0, 3);
          console.log('DEBUG: Potential Close Matches:', closeMatches);
        }
      }
      
      const validGigs = data.map(gig => ({
        ...gig,
        start_time: gig.start_time || '23:59'
      }));
      const sortedGigs = validGigs.sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );
      setGigs(sortedGigs);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGigs(date);

    const interval = setInterval(() => {
      const newDate = getMelbourneDate();
      if (newDate !== date) {
        setDate(newDate);
        fetchGigs(newDate);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [date, fetchGigs]);

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

  return (
    <div className="min-h-screen bg-white p-8" data-fetch-error={error || undefined}>
      <h2 className="text-4xl font-bold mb-8 mx-auto text-center">
        Gig Guide Posts
      </h2>
      <div className="max-w-xl mx-auto mb-8 p-4 bg-gray-100 rounded-lg">
        <div className="flex items-center gap-4 justify-center">
          <div className="text-gray-900">
            {loading ? (
              <span>Loading gigs...</span>
            ) : (
              <span>{gigs.length} total gigs found</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-12">Loading gigs...</div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {error && (
        <div className="text-red-500 text-center mt-4">
          Error: {error}
        </div>
      )}
    </div>
  );
}
