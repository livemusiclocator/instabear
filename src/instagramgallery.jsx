import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const BRAND_BLUE = '#00B2E3';
const BRAND_ORANGE = '#FF5C35';
const INSTAGRAM_HEIGHT = 540;
const HEADER_HEIGHT = 48;
const MIN_BOTTOM_MARGIN = 24;
const CONTAINER_HEIGHT = INSTAGRAM_HEIGHT - HEADER_HEIGHT - MIN_BOTTOM_MARGIN - 16; // Added 16px buffer

// Helper function to convert text to title case
function toTitleCase(str) {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

// Helper function to extract suburb from address
function getSuburb(address) {
  const match = address.match(/(?:,\s*)?([A-Za-z\s]+)(?:\s+\d{4})?$/);
  return match ? match[1].trim() : '';
}

// Helper function to format the price
function formatPrice(gig) {
  if (gig.information_tags?.includes('free')) return 'Free';
  if (gig.prices && gig.prices.length > 0) return `${gig.prices[0].amount}`; // Removed extra dollar sign
  return '';
}

// Create a hidden container for measuring gig heights
const createMeasurementContainer = () => {
  const container = document.createElement('div');
  container.style.cssText = 'position: absolute; top: -9999px; width: 540px;';
  document.body.appendChild(container);
  return container;
};

// Measure the height of a gig panel
const measureGigHeight = (gig, container) => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = `
    <div class="bg-black bg-opacity-40 rounded-lg p-1.5 mb-0.25">
      <div class="flex justify-between items-start">
        <div class="flex-1 min-w-0">
          <div class="flex items-baseline gap-2 mb-0.5">
            <h3 class="text-white text-xl font-semibold leading-tight">
              ${toTitleCase(gig.name)}
            </h3>
            ${gig.genre_tags && gig.genre_tags.length > 0 ? `
              <span class="text-gray-400 text-sm font-light truncate">
                ${gig.genre_tags.slice(0, 2).join(' · ')}
              </span>
            ` : ''}
          </div>
          <div class="flex items-center">
            <span class="text-lg truncate">${toTitleCase(gig.venue.name)}</span>
            <span class="text-gray-500 mx-1">•</span>
            <span class="text-gray-400 text-base">${getSuburb(gig.venue.address)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  container.appendChild(tempDiv);
  const height = tempDiv.firstElementChild.offsetHeight;
  container.removeChild(tempDiv);
  return height + 1; // Add 1px for mb-0.25
};

// Build slides based on actual measurements
const buildSlides = (gigs) => {
  const slides = [];
  let currentSlide = [];
  let currentHeight = 0;

  const measurementContainer = createMeasurementContainer();

  gigs.forEach(gig => {
    const gigHeight = measureGigHeight(gig, measurementContainer);

    // Handle gigs that are too tall
    if (gigHeight > CONTAINER_HEIGHT) {
      console.warn(`Gig "${gig.name}" is too tall (${gigHeight}px) and will be truncated.`);
    }

    if (currentHeight + gigHeight > CONTAINER_HEIGHT) {
      slides.push(currentSlide);
      currentSlide = [gig];
      currentHeight = gigHeight;
    } else {
      currentSlide.push(gig);
      currentHeight += gigHeight;
    }
  });

  if (currentSlide.length > 0) slides.push(currentSlide);

  document.body.removeChild(measurementContainer);
  return slides;
};

// Title slide component
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
        <h1 className="text-white text-4xl font-bold mb-4">Fitzroy & Collingwood</h1>
        <h2 className="text-white text-3xl mb-2">Gig Guide</h2>
        <p className="text-2xl" style={{ color: BRAND_BLUE }}>{toTitleCase(formattedDate)}</p>
      </div>
    </div>
  );
}

// Gig panel component
function GigPanel({ gig, isLast, index }) {
  const suburb = getSuburb(gig.venue.address);
  const panelRef = useRef(null);

  return (
    <div ref={panelRef} className={`bg-black bg-opacity-40 rounded-lg p-1.5 ${!isLast ? 'mb-0.25' : ''} relative`}>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <h3 className="text-white text-xl font-semibold leading-tight">{toTitleCase(gig.name)}</h3>
            {gig.genre_tags && gig.genre_tags.length > 0 && (
              <span className="text-gray-400 text-sm font-light truncate">
                {gig.genre_tags.slice(0, 2).join(' · ')}
              </span>
            )}
          </div>
          <div className="flex items-center">
            <span style={{ color: BRAND_BLUE }} className="text-lg truncate">{toTitleCase(gig.venue.name)}</span>
            <span className="text-gray-500 mx-1">•</span>
            <span className="text-gray-400 text-base">{suburb}</span>
          </div>
        </div>
        <div className="text-right ml-3 shrink-0 flex flex-col justify-center">
          <div className="text-white text-xl font-semibold">{gig.start_time || '23:59'}</div>
          <div style={{ color: BRAND_ORANGE }} className="text-lg">
            {formatPrice(gig)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main InstagramGallery component
function InstagramGallery() {
  const [date, setDate] = useState('2024-11-30');
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  const slides = useMemo(() => buildSlides(gigs), [gigs]);

  const fetchGigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://api.lml.live/gigs/query?location=melbourne&date_from=${date}&date_to=${date}`
      );
      const data = await response.json();

      // Filter out gigs with missing start_time and assign default value
      const validGigs = data.map(gig => ({
        ...gig,
        start_time: gig.start_time || '23:59', // Default to 23:59 if start_time is missing
      }));

      // Sort gigs by start_time
      const sortedGigs = validGigs.sort((a, b) => a.start_time.localeCompare(b.start_time));

      setGigs(sortedGigs);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    fetchGigs();
  }, [fetchGigs]);

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
            {loading ? <span>Loading...</span> : <span>{gigs.length} gigs found</span>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 gap-8">
          <TitleSlide date={date} />
          {slides.map((slideGigs, slideIndex) => (
            <div
              key={slideIndex}
              className="w-[540px] h-[540px] bg-gray-900 mx-auto rounded-3xl overflow-hidden shadow-lg relative"
              style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}
            >
              <div className="h-12 px-4 flex items-center justify-between border-b border-gray-700">
                <h2 className="text-white text-2xl font-bold">{formatDate(date).day}</h2>
                <p style={{ color: BRAND_BLUE }} className="text-xl font-bold">
                  {slideIndex + 1} / {slides.length}
                </p>
              </div>

              <div ref={containerRef} className="px-3 py-2 relative h-[476px]">
                {slideGigs.map((gig, index) => (
                  <GigPanel key={index} gig={gig} isLast={index === slideGigs.length - 1} index={index} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="text-red-500 text-center mt-4">Error: {error}</div>}
    </div>
  );
}

export default InstagramGallery;