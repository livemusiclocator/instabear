import React, { useState, useEffect } from 'react';
import CarouselSlide from './components/CarouselSlide';

function App() {
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

  // Split gigs into groups of 7
  const gigsPerSlide = 7;
  const slides = [];
  for (let i = 0; i < gigs.length; i += gigsPerSlide) {
    slides.push(gigs.slice(i, i + gigsPerSlide));
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* Date Picker Section */}
      <div className="max-w-4xl mx-auto mb-8 p-4 bg-black rounded-lg">
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
        {error && (
          <div className="mt-2 text-red-500">
            Error: {error}
          </div>
        )}
      </div>

      {/* Carousel Slides */}
      <div className="grid grid-cols-1 gap-8">
        {slides.map((slideGigs, index) => (
          <div key={index} className="w-[1080px] mx-auto">
            <CarouselSlide
              gigs={slideGigs}
              pageNumber={index}
              totalPages={slides.length}
              date={date}
            />
          </div>
        ))}
      </div>

      {/* No gigs message */}
      {!loading && gigs.length === 0 && (
        <div className="text-white text-center text-xl">
          No gigs found for this date
        </div>
      )}
    </div>
  );
}

export default App;