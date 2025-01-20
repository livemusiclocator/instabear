import React, { useState, useEffect } from 'react';

const BRAND_BLUE = '#00B2E3';
const BRAND_ORANGE = '#FF5C35';
const GIGS_PER_SLIDE = 8;

function InstagramGallery() {
  const [date, setDate] = useState('2024-11-30');
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Split gigs into slides
  const slides = [];
  for (let i = 0; i < gigs.length; i += GIGS_PER_SLIDE) {
    slides.push(gigs.slice(i, i + GIGS_PER_SLIDE));
  }

  const getSuburb = (address) => {
    const match = address.match(/(?:,\s*)?([A-Za-z\s]+)(?:\s+\d{4})?$/);
    return match ? match[1].trim() : '';
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
      date: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase()
    };
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-8">
      {/* Date Picker */}
      <div className="max-w-xl mx-auto mb-8 p-4 bg-black rounded-lg">
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 rounded bg-gray-800 text-white border border-gray-700"
          />
          <div className="text-white">
            {loading ? (
              <span>Loading...</span>
            ) : (
              <span>{gigs.length} gigs found</span>
            )}
          </div>
        </div>
      </div>

      {/* Gallery of Instagram Slides */}
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 gap-12">
          {slides.map((slideGigs, slideIndex) => (
            <div 
              key={slideIndex} 
              className="w-[1080px] h-[1080px] bg-[#111] mx-auto rounded-3xl overflow-hidden shadow-2xl relative"
            >
              {/* Slide Header */}
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <svg viewBox="0 0 500 500" className="w-16 h-16">
                      <circle cx="250" cy="250" r="250" fill={BRAND_BLUE} />
                      <circle cx="250" cy="400" r="30" fill={BRAND_ORANGE} />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-white text-2xl font-bold">
                      {formatDate(date).day}
                    </h2>
                    <h3 className="text-white text-xl">
                      {formatDate(date).date} {formatDate(date).month}
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <p style={{ color: BRAND_BLUE }} className="text-lg">
                    {slideIndex + 1} / {slides.length}
                  </p>
                </div>
              </div>

              {/* Gigs List */}
              <div className="p-6 space-y-4">
                {slideGigs.map((gig, index) => (
                  <div key={index} className="bg-black bg-opacity-40 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-white text-lg font-bold mb-1">{gig.name}</p>
                        <p style={{ color: BRAND_BLUE }} className="text-md">
                          {gig.venue.name} · {getSuburb(gig.venue.address)}
                        </p>
                        {gig.genre_tags && gig.genre_tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {gig.genre_tags.slice(0, 3).map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="px-2 py-1 rounded-full text-xs text-white"
                                style={{ backgroundColor: BRAND_BLUE }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-white text-lg font-bold">{gig.start_time}</p>
                        {gig.prices && gig.prices.length > 0 ? (
                          <p style={{ color: BRAND_ORANGE }}>{gig.prices[0].amount}</p>
                        ) : (
                          <p style={{ color: BRAND_ORANGE }}>Free</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="absolute bottom-6 left-0 right-0">
                <div className="bg-black bg-opacity-50 rounded-full py-2 px-6 max-w-fit mx-auto">
                  <div className="flex items-center gap-2">
                    <span>🎵</span>
                    <p className="text-3xl font-bold" style={{ color: BRAND_BLUE }}>
                      lml.live
                    </p>
                    <span>🎸</span>
                  </div>
                </div>
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