import React, { useState, useEffect, useRef } from 'react';

const BRAND_BLUE = '#00B2E3';
const BRAND_ORANGE = '#FF5C35';
const INSTAGRAM_HEIGHT = 540;
const HEADER_HEIGHT = 48;
const MIN_BOTTOM_MARGIN = 24;

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

function getStreetAddress(address) {
  return address.split(',')[0].trim();
}

function getSuburb(address) {
  const match = address.match(/(?:,\s*)?([A-Za-z\s]+)(?:\s+\d{4})?$/);
  return match ? match[1].trim() : '';
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
      <img 
        src="/lml-logo.png"
        alt="Live Music Locator"
        className="w-32 h-32 mb-8"
      />
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

function GigPanel({ gig, index, slideIndex }) {
  const street = getStreetAddress(gig.venue.address);
  const suburb = getSuburb(gig.venue.address);
  
  // If venue name plus street is too long, just show suburb
  const shouldShowStreet = (gig.venue.name.length + street.length) <= 35;
  const location = shouldShowStreet ? `${street} ${suburb}` : suburb;

  return (
    <div 
      data-gig-id={`${slideIndex}-${index}`}
      className="bg-black bg-opacity-40 rounded-lg p-2"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h3 className="text-white text-xl font-semibold leading-tight mb-0.5">
            {toTitleCase(gig.name)}
          </h3>
          <div className="flex items-center">
            <span style={{ color: BRAND_BLUE }} className="text-lg">
              {toTitleCase(gig.venue.name)}
            </span>
            <span className="text-gray-500 mx-1">•</span>
            <span className="text-gray-400 text-base">
              {location}
            </span>
          </div>
        </div>
        <div className="text-right ml-3 shrink-0">
          <div className="text-white text-xl font-semibold">
            {gig.start_time}
          </div>
          <div 
            style={{ color: BRAND_ORANGE }} 
            className="text-lg"
          >
            {gig.prices && gig.prices.length > 0 
              ? `$${gig.prices[0].amount}` 
              : 'Free'}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return {
    day: toTitleCase(d.toLocaleDateString('en-US', { weekday: 'long' })),
    date: d.getDate(),
    month: toTitleCase(d.toLocaleDateString('en-US', { month: 'long' }))
  };
}

function InstagramGallery() {
  const [date, setDate] = useState('2024-11-30');
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gigsPerSlide, setGigsPerSlide] = useState(8);
  const slideContainerRef = useRef(null);
  const [overflowingGigs, setOverflowingGigs] = useState([]);

  useEffect(() => {
    if (!slideContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          console.log('Gig visibility:', {
            gigId: entry.target.dataset.gigId,
            isVisible: entry.isIntersecting,
            ratio: entry.intersectionRatio,
            bounds: entry.boundingClientRect
          });
        });

        const overflowing = entries
          .filter(entry => !entry.isIntersecting)
          .map(entry => entry.target.dataset.gigId);
        
        setOverflowingGigs(overflowing);

        if (overflowing.length > 0) {
          setGigsPerSlide(prev => prev - 1);
        }
      },
      {
        root: slideContainerRef.current,
        threshold: 1.0,
        rootMargin: `-${MIN_BOTTOM_MARGIN}px 0px 0px 0px`
      }
    );

    const gigPanels = slideContainerRef.current.querySelectorAll('.gig-panel');
    gigPanels.forEach(panel => observer.observe(panel));

    return () => observer.disconnect();
  }, [gigs]);

  useEffect(() => {
    const fetchGigs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://api.lml.live/gigs/query?location=melbourne&date_from=${date}&date_to=${date}`
        );
        const data = await response.json();
        const sortedGigs = data.sort((a, b) => 
          a.start_time.localeCompare(b.start_time)
        );
        setGigs(sortedGigs);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };

    fetchGigs();
  }, [date]);

  const slides = [];
  for (let i = 0; i < gigs.length; i += gigsPerSlide) {
    slides.push(gigs.slice(i, i + gigsPerSlide));
  }

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Date Picker */}
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

      {/* Gallery of Instagram Slides */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 gap-8">
          <TitleSlide date={date} />
          
          {slides.map((slideGigs, slideIndex) => (
            <div 
              key={slideIndex} 
              className="w-[540px] h-[540px] bg-gray-900 mx-auto rounded-3xl overflow-hidden shadow-lg relative"
              style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}
            >
              {/* Header */}
              <div className="h-12 px-4 flex items-center justify-between border-b border-gray-700">
                <h2 className="text-white text-2xl font-bold">
                  {formatDate(date).day}
                </h2>
                <p style={{ color: BRAND_BLUE }} className="text-xl font-bold">
                  {slideIndex + 1} / {Math.ceil(gigs.length / gigsPerSlide)}
                </p>
              </div>

              {/* Gigs Container */}
              <div 
                ref={slideContainerRef} 
                className="px-3 py-2 space-y-1 relative h-[476px]"
              >
                {slideGigs.map((gig, index) => (
                  <GigPanel
                    key={index}
                    gig={gig}
                    index={index}
                    slideIndex={slideIndex}
                  />
                ))}

                {/* Bottom margin indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
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