import { useMemo } from 'react'
import {
  BRAND_BLUE,
  CONTAINER_HEIGHT,
} from '../constants/common'
import { GigPanel, LocationTitleSlide } from '../components'
import PropTypes from 'prop-types'

// Carousel Component - read-only preview, no posting (the Stories feature
// this renders for is unused; the real posting pipeline lives in
// instagramgallery.jsx). Previously had its own generate/post buttons with
// the same element IDs as the real Gallery's, which meant pi-automation.js
// (a plain page.click('#id') against whichever component happened to
// mount first) was clicking these dead buttons instead of the real ones
// for any location this component also rendered.
const Carousel = ({ title, location, date, gigs, id }) => {
  // Build slides
  const slides = useMemo(() => {
    const result = []
    let currentSlide = []
    let currentHeight = 0

    gigs.forEach((gig) => {
      const nameLines = Math.ceil(gig.name.length / 35)
      const gigHeight = 64 + (nameLines - 1) * 24 + 8

      if (currentHeight + gigHeight > CONTAINER_HEIGHT) {
        result.push(currentSlide)
        currentSlide = [gig]
        currentHeight = gigHeight
      } else {
        currentSlide.push(gig)
        currentHeight += gigHeight
      }
    })

    if (currentSlide.length > 0) {
      result.push(currentSlide)
    }

    return result
  }, [gigs])

  return (
    <div className="mb-16 pb-8 border-b border-gray-300">
      <h2 className="text-2xl font-bold mb-6 text-center">{title}</h2>
      <div className="grid grid-cols-2 gap-8">
        {/* Title slide */}
        <LocationTitleSlide
          date={date}
          location={location}
          className={`location-title-slide-${id}`}
        />

        {/* Gig slides - limit to 9 slides (10 total with title) */}
        {slides.slice(0, 9).map((slideGigs, slideIndex) => (
          <div
            key={slideIndex}
            className="w-[540px] h-[960px] bg-gray-900 mx-auto rounded-3xl overflow-hidden shadow-lg relative"
          >
            <div className="h-16 px-4 flex items-center justify-between border-b border-gray-700">
              <h2 className="text-white text-2xl font-bold">
                {new Date(date).toLocaleDateString('en-US', {
                  timeZone: 'Australia/Melbourne',
                  weekday: 'long',
                })}
              </h2>
              <p style={{ color: BRAND_BLUE }} className="text-xl font-bold">
                {slideIndex + 1} / {Math.min(slides.length, 9)}
              </p>
            </div>

            <div className="px-3 py-6 relative h-[476px]">
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

      {/* Preview info - read-only, no posting affordances here */}
      <div className="text-center mt-8 space-y-4">
        <div className="text-gray-700 mb-2">
          {gigs.length} gigs found for {location}
          {slides.length > 9 && (
            <div className="text-red-500 font-bold">
              Warning: Only showing 9 of {slides.length} slides due to Instagram
              limitations
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Define prop types for Carousel
Carousel.propTypes = {
  title: PropTypes.string.isRequired,
  location: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  gigs: PropTypes.array.isRequired,
  id: PropTypes.string.isRequired,
}

export { Carousel }
