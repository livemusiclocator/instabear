import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toPng } from 'html-to-image';

const BRAND_BLUE = '#00B2E3';
const BRAND_ORANGE = '#FF5C35';
const INSTAGRAM_HEIGHT = 540;
const HEADER_HEIGHT = 48;
const MIN_BOTTOM_MARGIN = 24;
const CONTAINER_HEIGHT = INSTAGRAM_HEIGHT - HEADER_HEIGHT - MIN_BOTTOM_MARGIN - 16;

// Utility functions unchanged
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

function TitleSlide({ date }) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="w-[540px] h-[540px] bg-gray-900 mx-auto rounded-3xl overflow-hidden shadow-lg relative flex flex-col items-center justify-center"
         style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}>
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

function InstagramGallery() {
  const [date, setDate] = useState('2024-11-30');
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const slideRefs = useRef([]);

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

  useEffect(() => {
    fetchGigs();
  }, [fetchGigs]);

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

  // Updated render function with new options
  const renderSlidesToImages = async () => {
    try {
      for (let i = 0; i < slideRefs.current.length; i++) {
        const slide = slideRefs.current[i];
        if (slide) {
          // Get actual element size without scaling
          const rect = slide.getBoundingClientRect();
          const scale = 1024 / rect.width; // Calculate scale to reach 1024px
          
          // Ensure we get the full content
          const options = {
            width: 1024,
            height: 1024,
            pixelRatio: 2,
            style: {
              transform: 'scale(1.89)', // Scale from 540 to 1024
              transformOrigin: 'top left'
            },
            backgroundColor: '#1a1a1a',
            preserveAlpha: true,
            quality: 1.0
          };

          const dataUrl = await toPng(slide, options);
          
          const formattedDate = date.replace(/-/g, '');
          const filename = `gigs_${formattedDate}_carousel${i + 1}.png`;
          
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = filename;
          link.click();
        }
      }
    } catch (err) {
      console.error('Error rendering slides to images:', err);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return {
      day: toTitleCase(d.toLocaleDateString('en-US', { weekday: 'long' })),
      date: d.getDate(),
      month: toTitleCase(d.toLocaleDateString('en-US', { month: 'long' }))
    };
  };

  return (
    <div className="min-h-screen bg-white p-8">
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

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 gap-8">
          <TitleSlide date={date} />
          
          {slides.map((slideGigs, slideIndex) => (
            <div 
              key={slideIndex} 
              ref={(el) => (slideRefs.current[slideIndex] = el)}
              className="w-[540px] h-[540px] bg-gray-900 mx-auto rounded-3xl overflow-hidden shadow-lg relative"
              style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}
              style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}
            >
              <div className="h-12 px-4 flex items-center justify-between border-b border-gray-700">
                <h2 className="text-white text-2xl font-bold">
                  {formatDate(date).day}
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

      <div className="text-center mt-8">
        <button
          onClick={renderSlidesToImages}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Render Slides to Images
        </button>
      </div>

      {error && (
        <div className="text-red-500 text-center mt-4">
          Error: {error}
        </div>
      )}
    </div>
  );
}

export default InstagramGallery;