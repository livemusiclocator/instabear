import React from 'react';

const BRAND_BLUE = '#00B2E3';
const BRAND_ORANGE = '#FF5C35';

const getSuburb = (address) => {
  const match = address.match(/(?:,\s*)?([A-Za-z\s]+)(?:\s+\d{4})?$/);
  return match ? match[1].trim() : '';
};

const CarouselSlide = ({ gigs, pageNumber, totalPages, date }) => {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const month = d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
    const dateNum = d.getDate();
    
    return {
      day: weekday,
      date: dateNum,
      month: month
    };
  };

  const { day, date: dateNum, month } = formatDate(date);

  return (
    <div className="w-[1080px] h-[1080px] bg-gray-900 text-white p-6 font-sans relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 500 500" className="w-16 h-16">
            <path 
              d="M250 500c138.071 0 250-111.929 250-250S388.071 0 250 0 0 111.929 0 250s111.929 250 250 250z" 
              fill={BRAND_BLUE}
            />
            <circle cx="250" cy="400" r="30" fill={BRAND_ORANGE} />
          </svg>
          <div>
            <h2 className="text-2xl font-bold">{day}</h2>
            <h3 className="text-xl">{dateNum} {month}</h3>
          </div>
        </div>
        <div className="text-right">
          <p style={{ color: BRAND_BLUE }} className="text-lg font-bold">
            {pageNumber + 1} / {totalPages}
          </p>
        </div>
      </div>

      {/* Gigs List */}
      <div className="space-y-3">
        {gigs.map((gig, index) => (
          <div key={index} className="bg-black bg-opacity-50 p-3 rounded">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-lg font-bold">{gig.name}</p>
                <p style={{ color: BRAND_BLUE }} className="text-md">
                  {gig.venue.name} · {getSuburb(gig.venue.address)}
                </p>
                {gig.genre_tags && gig.genre_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {gig.genre_tags.slice(0, 3).map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{ backgroundColor: BRAND_BLUE }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{gig.start_time}</p>
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
      <div className="absolute bottom-4 left-6 right-6">
        <div className="bg-black bg-opacity-70 rounded-full py-3 px-6 max-w-fit mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎵</span>
            <p className="text-4xl font-bold" style={{ color: BRAND_BLUE }}>
              lml.live
            </p>
            <span className="text-lg">🎸</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarouselSlide;