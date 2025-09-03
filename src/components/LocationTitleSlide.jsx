import PropTypes from 'prop-types'
import { BRAND_BLUE } from '../constants/common'
import { toTitleCase } from '../utils/toTitleCase'

// LocationTitleSlide Component
const LocationTitleSlide = ({ date, location, className = '' }) => {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    timeZone: 'Australia/Melbourne',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      className={`location-title-slide w-[540px] h-[960px] bg-gray-900 mx-auto rounded-3xl overflow-hidden shadow-lg relative flex flex-col items-center ${className}`}
    >
      <div className="mt-32 mb-4">
        <img
          src="./lml-logo.png"
          alt="Live Music Locator"
          className="w-32 h-32"
        />
      </div>
      <div className="text-center px-12">
        {location === 'St Kilda' ? (
          <h1 className="text-white text-[3.5rem] font-bold mb-6">St Kilda</h1>
        ) : (
          <div className="-space-y-5">
            <h1 className="text-white text-[2.2rem] font-bold">Fitzroy</h1>
            <h1 className="text-white text-[2.2rem] font-bold mb-2">
              Collingwood
            </h1>
            <h1 className="text-white text-[2.2rem] font-bold mb-2">
              Richmond
            </h1>
          </div>
        )}
        <h2 className="text-white text-[2.2rem] mb-4">Gig Guide</h2>
        <p className="text-[1.71rem]" style={{ color: BRAND_BLUE }}>
          {toTitleCase(formattedDate)}
        </p>
      </div>
    </div>
  )
}

// Define prop types for LocationTitleSlide
LocationTitleSlide.propTypes = {
  date: PropTypes.string.isRequired,
  location: PropTypes.string.isRequired,
  className: PropTypes.string,
}

export { LocationTitleSlide }
