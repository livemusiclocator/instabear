import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { Octokit } from "@octokit/rest";

// 1. Instantiate Octokit with your token
const octokit = new Octokit({
  auth: import.meta.env.VITE_GITHUB_TOKEN
});

async function postToInstagram(imageUrls, captions) {
  const INSTAGRAM_ACCESS_TOKEN = import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN;
  const INSTAGRAM_BUSINESS_ACCOUNT_ID = import.meta.env.VITE_INSTAGRAM_BUSINESS_ID;

  try {
    console.log('Starting Instagram post process with URLs:', imageUrls);

    // Format the caption for the carousel
    const date = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const numberOfGigs = imageUrls.length - 1; // Subtract 1 for title slide
    const caption = captions[0]; // Use the first caption as the main carousel caption

    // Validate caption length
    if (caption.length > 2200) {
      throw new Error('Caption exceeds Instagram\'s 2,200 character limit.');
    }

    // Step 1: Upload each image and get media IDs
    const mediaIds = [];
    for (const imageUrl of imageUrls) {
      console.log(`Uploading image: ${imageUrl}`);
      const response = await fetch(`https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
          access_token: INSTAGRAM_ACCESS_TOKEN,
          is_carousel_item: true,
        }),
      });

      const data = await response.json();
      if (!data.id) {
        throw new Error(`Failed to upload image: ${imageUrl}. Response: ${JSON.stringify(data)}`);
      }

      mediaIds.push(data.id);
      console.log(`Image uploaded successfully. Media ID: ${data.id}`);
    }

    // Step 2: Create carousel container
    console.log('Creating carousel container...');
    const carouselResponse = await fetch(`https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_type: 'CAROUSEL',
        children: mediaIds.join(','),
        caption: caption,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    });

    const carouselData = await carouselResponse.json();
    if (!carouselData.id) {
      throw new Error(`Failed to create carousel container. Response: ${JSON.stringify(carouselData)}`);
    }

    const carouselContainerId = carouselData.id;
    console.log(`Carousel container created successfully. Container ID: ${carouselContainerId}`);

    // Step 3: Publish the carousel
    console.log('Publishing carousel...');
    const publishResponse = await fetch(`https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media_publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creation_id: carouselContainerId,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    });

    const publishData = await publishResponse.json();
    if (!publishData.id) {
      throw new Error(`Failed to publish carousel. Response: ${JSON.stringify(publishData)}`);
    }

    console.log('Carousel posted successfully:', publishData);
    return { success: true, postId: publishData.id };

  } catch (error) {
    console.error('Error posting carousel:', error.response?.data || error.message);
    
    // Handle DTSG errors
    if (error.response?.data?.error?.code === 1357004) {
      console.error('DTSG token error detected. Please check your access token and try again.');
    }
    
    return { 
      success: false, 
      error: error.message,
      details: error.response?.data || error 
    };
  }
}

const uploadToGitHub = async (base64Image, filename) => {
  const content = base64Image.split(',')[1];
  const path = `temp-images/${filename}`;
  
  try {

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
    } catch (error) {
      // File doesn't exist yet, that's fine
    }

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

    // Log the successful upload
    console.log('Upload successful:', result);

    // ALWAYS return the lml.live URL
    const publicUrl = `https://lml.live/instabear/${path}`;
    console.log('Generated public URL:', publicUrl);
    return publicUrl;

  } catch (error) {
    console.error('GitHub upload failed:', error);
    throw new Error(`GitHub upload failed: ${error.message}`);
  }
};

// 4. Constants for layout
const BRAND_BLUE = '#00B2E3';
const BRAND_ORANGE = '#FF5C35';
const INSTAGRAM_HEIGHT = 540;
const HEADER_HEIGHT = 48;
const MIN_BOTTOM_MARGIN = 24;
const CONTAINER_HEIGHT = INSTAGRAM_HEIGHT - HEADER_HEIGHT - MIN_BOTTOM_MARGIN - 16;

// 5. Utility functions
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

function formatPrice(gig) {
  if (gig.information_tags?.includes('free')) return 'Free';
  if (gig.prices && gig.prices.length > 0) {
    const amount = gig.prices[0].amount;
    return amount.startsWith('$') ? amount : `$${amount}`;
  }
  return '';
}

// 6. Reusable panel component for each gig
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

// 7. Title slide (first slide)
function TitleSlide({ date }) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="title-slide w-[540px] h-[540px] bg-gray-900 mx-auto rounded-3xl overflow-hidden shadow-lg relative flex flex-col items-center justify-center">
      <img src="/lml-logo.png" alt="Live Music Locator" className="w-36 h-36 mb-12" />
      <div className="text-center px-12">
        <div className="-space-y-8">
          <h1 className="text-white text-[2.9rem] font-bold">Fitzroy &</h1>
          <h1 className="text-white text-[2.9rem] font-bold mb-6">Collingwood</h1>
        </div>
        <h2 className="text-white text-[2.4rem] mb-4">
          Gig Guide
        </h2>
        <p className="text-[1.9rem]" style={{ color: BRAND_BLUE }}>
          {toTitleCase(formattedDate)}
        </p>
      </div>
    </div>
  );
}

// 8. Creates caption text for each carousel slide
function generateCaption(slideGigs, slideIndex, totalSlides, date) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  let caption = `More information here: https://lml.live/?dateRange=today\n\n`;
  caption += `🎵 Live Music Locator - ${formattedDate}\n`;
  caption += `Slide ${slideIndex + 1} of ${totalSlides}\n\n`;
  caption += slideGigs
    .map(gig => `🎤 ${gig.name} @ ${gig.venue.name} - ${gig.start_time}`)
    .join('\n');

  return caption;
}

// 9. Main component
export default function InstagramGallery() {
  // Basic state
  const today = new Date().toISOString().split('T')[0];
  const [date] = useState(today);
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs to each slide DOM element
  const slideRefs = useRef([]);

  // 10. Additional state for uploading/posting
  const [uploadedImages, setUploadedImages] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // 11. Fetch gigs
  const fetchGigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://api.lml.live/gigs/query?location=melbourne&date_from=${date}&date_to=${date}`
      );
      const data = await response.json();
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
  }, [date]);

  // 12. useEffect to fetch data on mount
  useEffect(() => {
    fetchGigs();
  }, [fetchGigs]);

  // 13. Build slides: fill them until out of space, then start a new slide
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

  // 14. Render slides, convert to images, and upload
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
      const titleSlide = document.querySelector('.title-slide');
      if (titleSlide) {
        const dataUrl = await toPng(titleSlide, options);
        const formattedDate = date.replace(/-/g, '');
        const filename = `gigs_${formattedDate}_carousel0.png`;

        // (Optional) Download locally
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        link.click();

        // Upload to GitHub
        const githubUrl = await uploadToGitHub(dataUrl, filename);
        imageUrls.push(githubUrl);

        // Title slide caption
        const titleCaption = `Live Music Locator is a not-for-profit service designed to make it possible to discover every gig playing at every venue across every genre at any one time. 
This information will always be verified and free, importantly supporting musicians, our small to medium live music venues, and you the punters.
More detailed gig information here: https://lml.live/?dateRange=today`;
        captions.push(titleCaption);
      }

      // Gig slides
      for (let i = 0; i < slideRefs.current.length; i++) {
        const slide = slideRefs.current[i];
        if (slide) {
          const dataUrl = await toPng(slide, options);
          const formattedDate = date.replace(/-/g, '');
          const filename = `gigs_${formattedDate}_carousel${i + 1}.png`;

          // (Optional) Download locally
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = filename;
          link.click();

          // Upload to GitHub
          const githubUrl = await uploadToGitHub(dataUrl, filename);
          imageUrls.push(githubUrl);

          // Build caption for this slide
          const caption = generateCaption(slides[i], i, slides.length, date);
          captions.push(caption);
        }
      }

      // (Optional) Save the captions locally in a text file
      const captionsBlob = new Blob([captions.join('\n\n')], { type: 'text/plain' });
      const captionsLink = document.createElement('a');
      captionsLink.href = URL.createObjectURL(captionsBlob);
      captionsLink.download = 'captions.txt';
      captionsLink.click();

      console.log('Uploaded Image URLs:', imageUrls);

      // Keep track so we can post to Instagram
      setUploadedImages({ urls: imageUrls, captions });
      setUploadStatus('Images ready for Instagram posting');

      return imageUrls;
    } catch (err) {
      console.error('Error rendering and uploading slides:', err);
      setUploadStatus(`Error: ${err.message}`);
      throw err;
    }
  };

  // 15. Handle actual Instagram post
  const handleInstagramPost = async () => {
    if (!uploadedImages) return;

    if (!confirm('Are you sure you want to post this to Instagram? This action cannot be undone.')) {
      return;
    }

    setIsPosting(true);
    setUploadStatus('Posting to Instagram...');

    try {
      const result = await postToInstagram(uploadedImages.urls, uploadedImages.captions);
      if (result.success) {
        setUploadStatus('Successfully posted to Instagram!');
      } else {
        setUploadStatus('Instagram posting failed: unknown error');
      }
    } catch (err) {
      setUploadStatus(`Instagram posting failed: ${err.message}`);
    } finally {
      setIsPosting(false);
    }
  };

  // 16. Render UI
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-xl mx-auto mb-8 p-4 bg-gray-100 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="text-gray-900">
            {loading ? (
              <span>Loading...</span>
            ) : (
              <span>{gigs.length} gigs found</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 gap-8">
          {/* Title slide */}
          <TitleSlide date={date} />

          {/* Gig slides */}
          {slides.map((slideGigs, slideIndex) => (
            <div
              key={slideIndex}
              ref={(el) => (slideRefs.current[slideIndex] = el)}
              className="w-[540px] h-[540px] bg-gray-900 mx-auto rounded-3xl overflow-hidden shadow-lg relative"
            >
              <div className="h-12 px-4 flex items-center justify-between border-b border-gray-700">
                <h2 className="text-white text-2xl font-bold">
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}
                </h2>
                <p style={{ color: BRAND_BLUE }} className="text-xl font-bold">
                  {slideIndex + 1} / {slides.length}
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
      </div>

      {/* Actions and status */}
      <div className="text-center mt-8 space-y-4">
        <button
          onClick={renderSlidesToImages}
          disabled={isPosting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Generate Images
        </button>

        {uploadedImages && (
          <div>
            <button
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

      {error && (
        <div className="text-red-500 text-center mt-4">
          Error: {error}
        </div>
      )}
    </div>
  );
}