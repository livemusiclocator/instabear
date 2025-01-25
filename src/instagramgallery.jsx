import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toPng } from 'html-to-image';

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

// Define window.setGigs and window.setDate outside the component
let setGigsFunction = null;
let setDateFunction = null;

window.setGigs = (gigs) => {
  if (setGigsFunction) {
    setGigsFunction((prevGigs) => {
      if (JSON.stringify(prevGigs) !== JSON.stringify(gigs)) {
        return gigs;
      }
      return prevGigs;
    });
  }
};

window.setDate = (date) => {
  if (setDateFunction) {
    setDateFunction(date);
  }
};

// GigPanel component
function GigPanel({ gig, isLast, index }) {
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
      className={`bg-black bg-opacity-40 backdrop-blur-sm rounded-lg p-1.5 ${!isLast ? 'mb-0.25' : ''} relative shadow-lg`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-end mb-0.5">
            <h3 ref={gigNameRef} className="text-white text-xl font-semibold leading-tight">
              {toTitleCase(gig.name)}
            </h3>
            {showGenreTag && gig.genre_tags?.length > 0 && (
              <span 
                className="text-sm font-light whitespace-nowrap"
                style={{ color: '#00B2E3' }}
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

// TitleSlide component
function TitleSlide({ date }) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="title-slide w-[540px] h-[540px] bg-gray-900 mx-auto rounded-3xl overflow-hidden shadow-lg relative flex flex-col items-center justify-center">
      <img src="/lml-logo.png" alt="Live Music Locator" className="w-32 h-32 mb-8" />
      <div className="text-center px-8">
        <h1 className="text-white text-4xl font-bold mb-4">
          Fitzroy & Collingwood
        </h1>
        <h2 className="text-white text-3xl mb-2">
          Gig Guide
        </h2>
        <p className="text-2xl" style={{ color: BRAND_BLUE }}>
          {toTitleCase(formattedDate)}
        </p>
      </div>
    </div>
  );
}

// Main InstagramGallery component
function InstagramGallery({ autoGenerate = false, autoDate = '' }) {
  const [date, setDate] = useState(autoDate || '2024-11-30');
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gigsLoaded, setGigsLoaded] = useState(false);
  const [imagesGenerated, setImagesGenerated] = useState(false);
  const slideRefs = useRef([]);

  // Set the setGigs and setDate functions for window.setGigs and window.setDate
  useEffect(() => {
    setGigsFunction = setGigs;
    setDateFunction = setDate;
    return () => {
      setGigsFunction = null;
      setDateFunction = null;
    };
  }, []);

  // Automatically generate images if autoGenerate is true
  useEffect(() => {
    if (autoGenerate) {
      fetchGigs().then(() => {
        setTimeout(() => {
          renderSlidesToImages();
        }, 2000); // Wait for the UI to render
      });
    }
  }, [autoGenerate]);

  // Fetch gigs from the API
  const fetchGigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://api.lml.live/gigs/query?location=melbourne&date_from=${date}&date_to=${date}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch gigs: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Fetched gigs:', data); // Log the fetched data
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
      console.error('Error fetching gigs:', err);
    }
    setLoading(false);
  }, [date]);
  
  // Organize gigs into slides
  const slides = useMemo(() => {
    const result = [];
    let currentSlide = [];
    let currentHeight = 0;

    gigs.forEach(gig => {
      const nameLines = Math.ceil(gig.name.length / 35);
      const gigHeight = 64 + ((nameLines - 1) * 24) + 8;

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
    try {
      let captions = [];

      // Render the title slide
      const titleSlide = document.querySelector('.title-slide');
      if (titleSlide) {
        const dataUrl = await toPng(titleSlide);
        const formattedDate = date.replace(/-/g, '');
        const filename = `gigs_${formattedDate}_carousel0.png`;
        captions.push(`Title slide generated: ${filename}`);
      }

      // Render the rest of the slides
      for (let i = 0; i < slideRefs.current.length; i++) {
        const slide = slideRefs.current[i];
        if (slide) {
          const dataUrl = await toPng(slide);
          const formattedDate = date.replace(/-/g, '');
          const filename = `gigs_${formattedDate}_carousel${i + 1}.png`;
          captions.push(`Slide ${i + 1} generated: ${filename}`);
        }
      }

      // Save captions to captions.txt
      const captionsBlob = new Blob([captions.join('\n\n')], { type: 'text/plain' });
      const captionsLink = document.createElement('a');
      captionsLink.href = URL.createObjectURL(captionsBlob);
      captionsLink.download = 'captions.txt';
      captionsLink.click();

      setImagesGenerated(true); // Set imagesGenerated to true
      console.log('Image generation complete:', captions);
    } catch (err) {
      console.error('Error rendering slides to images:', err);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Remove the date input and button if autoGenerate is true */}
      {!autoGenerate && (
        <div className="max-w-xl mx-auto mb-8 p-4 bg-gray-100 rounded-lg">
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-4 py-2 rounded bg-white text-gray-900 border border-gray-300"
            />
            <div className="text-gray-900">
              {loading ? (
                <span>Loading...</span>
              ) : (
                <span>{gigs.length} gigs found</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 gap-8">
          <TitleSlide date={date} />
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
                    index={index}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!autoGenerate && (
        <div className="text-center mt-8">
          <button
            onClick={renderSlidesToImages}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Render Slides to Images
          </button>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-center mt-4">
          Error: {error}
        </div>
      )}
    </div>
  );
}

export default InstagramGallery;