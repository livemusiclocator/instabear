import React, { useState, useEffect } from 'react';

const BRAND_BLUE = '#00B2E3';
const BRAND_ORANGE = '#FF5C35';
const INSTAGRAM_HEIGHT = 540; // Total height of Instagram slide
const HEADER_HEIGHT = 80;     // Height of header section
const PADDING_VERTICAL = 32;  // Total vertical padding (16px top + 16px bottom)
const GIG_HEIGHT = 62;        // Height of each gig including margin
const SAFE_BOTTOM_MARGIN = 16; // Ensures black border at bottom

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

function InstagramGallery() {
  const [date, setDate] = useState('2024-11-30');
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calculate max gigs that can fit
  const availableHeight = INSTAGRAM_HEIGHT - HEADER_HEIGHT - PADDING_VERTICAL - SAFE_BOTTOM_MARGIN;
  const maxGigsPerSlide = Math.floor(availableHeight / GIG_HEIGHT);

  console.log('Layout calculations:', {
    availableHeight,
    maxGigsPerSlide,
    totalHeightNeeded: HEADER_HEIGHT + (maxGigsPerSlide * GIG_HEIGHT) + PADDING_VERTICAL + SAFE_BOTTOM_MARGIN
  });

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

  // Create slides with safe number of gigs
  const slides = [];
  for (let i = 0; i < gigs.length; i += maxGigsPerSlide) {
    slides.push(gigs.slice(i, i + maxGigsPerSlide));
  }

  const getSuburb = (address) => {
    const match = address.match(/(?:,\s*)?([A-Za-z\s]+)(?:\s+\d{4})?$/);
    return match ? match[1].trim() : '';
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
          {slides.map((slideGigs, slideIndex) => (
            <div 
              key={slideIndex} 
              className="w-[540px] h-[540px] bg-gray-900 mx-auto rounded-3xl overflow-hidden shadow-lg relative"
              style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}
            >
              {/* Header - Fixed height */}
              <div className="h-20 p-4 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src="/lml-logo.png"
                      alt="Live Music Locator"
                      className="w-10 h-10"
                    />
                    <div>
                      <h2 className="text-white text-2xl font-bold leading-none">
                        {formatDate(date).day}
                      </h2>
                      <h3 className="text-white text-xl leading-tight">
                        {formatDate(date).date} {formatDate(date).month}
                      </h3>
                    </div>
                  </div>
                  <div>
                    <p style={{ color: BRAND_BLUE }} className="text-xl font-bold">
                      {slideIndex + 1} / {Math.ceil(gigs.length / maxGigsPerSlide)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Gigs List - With known fixed heights */}
              <div className="px-4 py-4 space-y-1">
                {slideGigs.map((gig, index) => (
                  <div 
                    key={index} 
                    className="bg-black bg-opacity-40 rounded-lg p-2 border-b border-gray-800"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white text-2xl font-bold leading-tight">
                          {toTitleCase(gig.name)}
                        </h3>
                        <div className="flex items-center">
                          <p style={{ color: BRAND_BLUE }} className="text-xl leading-tight">
                            {toTitleCase(gig.venue.name)}
                          </p>
                          <span className="mx-2 text-gray-500">•</span>
                          <p className="text-gray-400 text-lg">
                            {toTitleCase(getSuburb(gig.venue.address))}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white text-2xl font-bold leading-tight">
                          {gig.start_time}
                        </p>
                        <p 
                          style={{ color: BRAND_ORANGE }} 
                          className="text-xl font-bold leading-tight"
                        >
                          {gig.prices && gig.prices.length > 0 
                            ? `$${gig.prices[0].amount}` 
                            : 'Free'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Safe bottom margin */}
              <div className="h-4" />
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