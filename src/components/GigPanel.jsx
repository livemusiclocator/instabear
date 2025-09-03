import { useRef, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { toTitleCase } from '../utils'
import { getSuburb } from '../utils'
import { formatPrice } from '../utils'
import { measureTextWidth } from '../utils'
import { BRAND_BLUE } from '../constants/common'
import { BRAND_ORANGE } from '../constants/common'

// GigPanel Component
const GigPanel = ({ gig, isLast }) => {
  const gigNameRef = useRef(null)
  const panelRef = useRef(null)
  const [showGenreTag, setShowGenreTag] = useState(false)

  useEffect(() => {
    if (gigNameRef.current && panelRef.current && gig.genre_tags?.length > 0) {
      const panelWidth = panelRef.current.offsetWidth
      const gigNameWidth = gigNameRef.current.offsetWidth
      const genreTagWidth = measureTextWidth(gig.genre_tags[0], '14px', '300')

      if (gigNameWidth + genreTagWidth + 20 <= panelWidth) {
        setShowGenreTag(true)
      } else {
        setShowGenreTag(false)
      }
    }
  }, [gig])

  return (
    <div
      ref={panelRef}
      className={`bg-black bg-opacity-40 backdrop-blur-sm rounded-lg p-1.5 ${
        !isLast ? 'mb-0.25' : ''
      } relative shadow-lg`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-end mb-0.5">
            <h3
              ref={gigNameRef}
              className="text-white text-xl font-semibold leading-tight"
            >
              {toTitleCase(gig.name)}
            </h3>
            {showGenreTag && gig.genre_tags?.length > 0 && (
              <span
                className="text-sm font-light whitespace-nowrap"
                style={{ color: BRAND_BLUE }}
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
  )
}

GigPanel.propTypes = {
  gig: PropTypes.shape({
    name: PropTypes.string.isRequired,
    genre_tags: PropTypes.arrayOf(PropTypes.string),
    venue: PropTypes.shape({
      name: PropTypes.string.isRequired,
      address: PropTypes.string.isRequired,
    }).isRequired,
    start_time: PropTypes.string.isRequired,
  }).isRequired,
  isLast: PropTypes.bool.isRequired,
}

export { GigPanel }
