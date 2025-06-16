/* eslint-disable no-unused-vars */
import React from 'react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
/* eslint-enable no-unused-vars */
import PropTypes from 'prop-types';
import { toPng } from 'html-to-image';
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: import.meta.env.VITE_GITHUB_TOKEN
});

// Postcode definitions
const ST_KILDA_POSTCODES = ['3182', '3183', '3185'];
const FITZROY_RICHMOND_POSTCODES = ['3065', '3066', '3067', '3068', '3121'];

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
    
    const carouselParams = new URLSearchParams({
      media_type: 'CAROUSEL',
      children: mediaIds.join(','),
      caption: captions[0],
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

    // Step 3: Publish the carousel
    console.log('Publishing carousel...');
    
    const publishParams = new URLSearchParams({
      creation_id: carouselContainerId,
      access_token: INSTAGRAM_ACCESS_TOKEN
    });

    const publishResponse = await fetch(`https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media_publish`, {
      method: 'POST',
      body: publishParams
    });

    const publishData = await publishResponse.json();
    console.log('Publish response:', publishData);

    if (!publishData.id) {
      throw new Error(`Failed to publish carousel. Response: ${JSON.stringify(publishData)}`);
    }

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

// Utility function to get venue Instagram handle with robust lookup
function getVenueInstagramHandle(venue) {
  if (!venue || !venue.id) return '';
  
  const venueId = venue.id;
  let venueHandle = '';
  
  // First try direct lookup with the raw ID
  if (venueId in venueHandles) {
    venueHandle = venueHandles[venueId];
  }
  // Then try with normalized ID (lowercase & trimmed)
  else if (venueId) {
    // Use normalized handles lookup
    const normalizedId = venueId.toLowerCase().trim();
    const normalizedMatch = Object.keys(venueHandles).find(id =>
      id.toLowerCase().trim() === normalizedId
    );
    if (normalizedMatch) {
      venueHandle = venueHandles[normalizedMatch];
    }
  }
  
  // If still no match, try manual lookup by venue name for some well-known venues
  if (!venueHandle && venue.name) {
    // Create a simplified venue name for matching
    const simplifiedName = venue.name.toLowerCase().replace(/[^\w\s]/g, '');
    
    // Manual lookup for key venues
    if (simplifiedName.includes('corner hotel') || simplifiedName.includes('the corner')) {
      venueHandle = '@cornerhotel';
    } else if (simplifiedName.includes('evelyn') || simplifiedName.includes('the ev')) {
      venueHandle = '@theevelynhotel';
    } else if (simplifiedName.includes('northcote social')) {
      venueHandle = '@northcotesc';
    }
    // Add more common venues as needed
  }
  
  return venueHandle;
}

// Caption generator
// Import venue Instagram handles mapping
import venueHandles from '../venueInstagramHandles.json';

// Log available venue handles for debugging
console.log('DEBUG: Loaded venue Instagram handles:', {
  totalHandles: Object.keys(venueHandles).length,
  sampleHandles: Object.keys(venueHandles).slice(0, 5).map(id => ({ id, handle: venueHandles[id] }))
});

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
  
  // Create a normalized lookup map for more robust handle matching
  const normalizedHandles = {};
  Object.entries(venueHandles).forEach(([id, handle]) => {
    normalizedHandles[id.toLowerCase().trim()] = handle;
  });
  console.log('DEBUG: Created normalized handle lookup with', Object.keys(normalizedHandles).length, 'entries');

  let caption = `More information here: ${getPublicUrl('?dateRange=today')}\n\n`;
  caption += `🎵 Live Music Locator - ${location} - ${formattedDate}\n`;
  caption += `Slide ${slideIndex + 1} of ${totalSlides}\n\n`;
  caption += slideGigs
    .map(gig => {
      // Check if we have an Instagram handle for this venue - try multiple formats
      const venueId = gig.venue.id;
      let venueHandle = '';
      
      // First try direct lookup with the raw ID
      if (venueId in venueHandles) {
        venueHandle = venueHandles[venueId];
      }
      // Then try with normalized ID (lowercase & trimmed)
      else if (venueId && normalizedHandles[venueId.toLowerCase().trim()]) {
        venueHandle = normalizedHandles[venueId.toLowerCase().trim()];
      }
      // If still no match, try manual lookup by venue name for some well-known venues
      else if (gig.venue.name) {
        // Create a simplified venue name for matching
        const simplifiedName = gig.venue.name.toLowerCase().replace(/[^\w\s]/g, '');
        
        // Manual lookup for key venues
        if (simplifiedName.includes('corner hotel') || simplifiedName.includes('the corner')) {
          venueHandle = '@cornerhotel';
        } else if (simplifiedName.includes('evelyn') || simplifiedName.includes('the ev')) {
          venueHandle = '@theevelynhotel';
        } else if (simplifiedName.includes('northcote social')) {
          venueHandle = '@northcotesc';
        }
        // Add more common venues as needed
      }
      
      // Debug log each caption line generation with detailed inspection
      console.log(`DEBUG: Caption for ${gig.name} @ ${gig.venue.name}:`, {
        venueId,
        lookupMethod: venueId in venueHandles ? 'direct' :
                     (venueId && normalizedHandles[venueId.toLowerCase().trim()]) ? 'normalized' :
                     venueHandle ? 'manual' : 'not found',
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
  className: PropTypes.string
};

// LocationTitleSlide Component
function LocationTitleSlide({ date, location, className = '' }) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    timeZone: 'Australia/Melbourne',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className={`location-title-slide w-[540px] h-[540px] bg-gray-900 mx-auto rounded-3xl overflow-hidden shadow-lg relative flex flex-col items-center ${className}`}>
      <div className="mt-6 mb-4">
        <img src="./lml-logo.png" alt="Live Music Locator" className="w-32 h-32" />
      </div>
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
  id: PropTypes.string.isRequired
};

// Carousel Component
function Carousel({
  title,
  location,
  date,
  gigs,
  id
}) {
  // Refs to each slide DOM element
  const slideRefs = useRef([]);

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
      const titleSlide = document.querySelector(`.location-title-slide-${id}`);
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
    setUploadStatus('Posting to Instagram...');

    try {
      // Log the captions that will be sent to Instagram
      console.log('DEBUG: Captions being posted to Instagram:');
      uploadedImages.captions.forEach((caption, index) => {
        console.log(`DEBUG: Caption ${index + 1}:`, {
          firstLine: caption.split('\n')[0],
          totalLength: caption.length,
          containsHandles: caption.includes('@'),
          sampleHandle: caption.match(/@\w+/) ? caption.match(/@\w+/)[0] : 'none'
        });
        
        // Check for specific venue handles in caption
        const handleMatches = caption.match(/@[a-zA-Z0-9_.]+/g) || [];
        console.log(`DEBUG: Instagram handles in caption ${index + 1}:`, handleMatches);
      });
      
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

  return (
    <div className="mb-16 pb-8 border-b border-gray-300">
      <h2 className="text-2xl font-bold mb-6 text-center">{title}</h2>
      <div className="grid grid-cols-2 gap-8">
        {/* Title slide */}
        <LocationTitleSlide
          date={date}
          location={location}
          className={`location-title-slide-${id}`}
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
        <div className="text-gray-700 mb-2">
          {gigs.length} gigs found for {location}
          {slides.length > 9 && (
            <div className="text-red-500 font-bold">
              Warning: Only showing 9 of {slides.length} slides due to Instagram limitations
            </div>
          )}
        </div>
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
            <button
              id={`post-instagram-btn-${id}`}
              onClick={handleInstagramPost}
              disabled={isPosting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Post to Instagram
            </button>
            <p className="text-sm text-gray-600 mt-2">
              Review the images above before posting
            </p>
          </div>
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
      const response = await fetch(
        `https://api.lml.live/gigs/query?location=melbourne&date_from=${selectedDate}&date_to=${selectedDate}`
      );
      console.log(`API URL: https://api.lml.live/gigs/query?location=melbourne&date_from=${selectedDate}&date_to=${selectedDate}`);

      const data = await response.json();
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

  return (
    <div className="min-h-screen bg-white p-8">
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
