import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { toPng } from 'html-to-image';
import { Octokit } from "@octokit/rest";

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

function formatPrice(gig) {
  if (gig.information_tags?.includes('free')) return 'Free';
  if (gig.prices && gig.prices.length > 0) {
    const amount = gig.prices[0].amount;
    return amount.startsWith('$') ? amount : `$${amount}`;
  }
  return '';
}

// Caption generator
function generateCaption(slideGigs, slideIndex, totalSlides, date) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  let caption = `More information here: ${getPublicUrl('?dateRange=today')}\n\n`;
  caption += `🎵 Live Music Locator - ${formattedDate}\n`;
  caption += `Slide ${slideIndex + 1} of ${totalSlides}\n\n`;
  caption += slideGigs
    .map(gig => `🎤 ${gig.name} @ ${gig.venue.name} - ${gig.start_time}`)
    .join('\n');

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

// Define prop types for TitleSlide
TitleSlide.propTypes = {
  date: PropTypes.string.isRequired
};

// TitleSlide Component
function TitleSlide({ date }) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="title-slide w-[540px] h-[540px] bg-gray-900 mx-auto rounded-3xl overflow-hidden shadow-lg relative flex flex-col items-center justify-center">
    <img src="./lml-logo.png" alt="Live Music Locator" className="w-36 h-36 mb-12" />       <div className="text-center px-12">
        <div className="-space-y-8">
          <h1 className="text-white text-[2.9rem] font-bold">Fitzroy,</h1>
          <h1 className="text-white text-[2.9rem] font-bold mb-6">Collingwood</h1>
          <h1 className="text-white text-[2.9rem] font-bold mb-6">St Kilda</h1>
          <h1 className="text-white text-[2.9rem] font-bold mb-6">Richmond</h1>


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
// Refs to each slide DOM element
const slideRefs = useRef([]);

// Additional state for uploading/posting
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
      const titleSlide = document.querySelector('.title-slide');
      if (titleSlide) {
        const dataUrl = await toPng(titleSlide, options);
        const formattedDate = date.replace(/-/g, '');
        const filename = `gigs_${formattedDate}_carousel0.png`;

        const githubUrl = await uploadToGitHub(dataUrl, filename);
        imageUrls.push(githubUrl);

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
        
                  const githubUrl = await uploadToGitHub(dataUrl, filename);
                  imageUrls.push(githubUrl);
        
                  const caption = generateCaption(slides[i], i, slides.length, date);
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

          const sendSlackNotification = async (message) => {
            const SLACK_WEBHOOK_URL = import.meta.env.VITE_SLACK_WEBHOOK_URL;
          
            if (!SLACK_WEBHOOK_URL) {
              console.error('Slack webhook URL is missing. Check your .env file.');
              return;
            }
          
            const payload = { text: message };
          
            try {
              const response = await fetch(SLACK_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
          
              if (!response.ok) {
                throw new Error(`Slack API responded with ${response.status}`);
              }
          
              console.log('Slack notification sent successfully.');
            } catch (error) {
              console.error('Failed to send Slack notification:', error);
            }
          };
          
              
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
          
                // ✅ Send Slack success notification
                const instagramPostUrl = `https://www.instagram.com/${import.meta.env.VITE_INSTAGRAM_USERNAME}`;
                await sendSlackNotification(`🎉 *Success!* The daily gig guide was posted to Instagram.\n📌 [View Post](${instagramPostUrl})`);
              } else {
                setUploadStatus(`Instagram posting failed: ${result.error}`);
          
                // ❌ Send Slack failure notification
                await sendSlackNotification(`❌ *Failed to post to Instagram.*\nError: ${result.error}`);
              }
            } catch (err) {
              setUploadStatus(`Instagram posting failed: ${err.message}`);
          
              // ❌ Send Slack failure notification
              await sendSlackNotification(`❌ *Instagram posting failed.*\nError: ${err.message}`);
            } finally {
              setIsPosting(false);
            }
          };
          
        
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
