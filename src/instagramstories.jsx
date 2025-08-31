/* eslint-disable no-unused-vars */
import React from 'react'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
/* eslint-enable no-unused-vars */
// Import Constants
import {
  ST_KILDA_POSTCODES,
  FITZROY_RICHMOND_POSTCODES,
} from './constants/common'
// Import Util Functions
import { getMelbourneDate, getPostcode } from './utils'
// Import Components
import { Carousel } from './components/Carousel'

import venueHandles from '../venueInstagramHandles.json'

// Log available venue handles for debugging
console.log('DEBUG: Loaded venue Instagram handles:', {
  totalHandles: Object.keys(venueHandles).length,
  sampleHandles: Object.keys(venueHandles)
    .slice(0, 5)
    .map((id) => ({ id, handle: venueHandles[id] })),
})

// Main InstagramStories Component
export default function InstagramStories() {
  // Basic state
  const [date, setDate] = useState(getMelbourneDate())
  const [gigs, setGigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch gigs
  const fetchGigs = useCallback(async (selectedDate) => {
    setLoading(true)
    setError(null)
    try {
      console.log(`Fetching gigs for ${selectedDate}...`)
      const response = await fetch(
        `https://api.lml.live/gigs/query?location=melbourne&date_from=${selectedDate}&date_to=${selectedDate}`
      )
      console.log(
        `API URL: https://api.lml.live/gigs/query?location=melbourne&date_from=${selectedDate}&date_to=${selectedDate}`
      )

      const data = await response.json()
      // Log a sample of raw venue IDs from API for debugging
      if (data.length > 0) {
        console.log('DEBUG: API Response Venue ID Format Check:', {
          sampleVenue1: data[0].venue,
          sampleVenue2: data.length > 1 ? data[1].venue : null,
          sampleVenueIdType: typeof data[0].venue.id,
          idInHandlesMap: data[0].venue.id in venueHandles,
          exactMatch: venueHandles[data[0].venue.id],
        })

        // Check for potential casing issues or extra whitespace
        if (data[0].venue.id) {
          const rawId = data[0].venue.id
          const trimmedId = rawId.trim()
          const lowercaseId = rawId.toLowerCase()
          console.log('DEBUG: ID Format Variations:', {
            rawId,
            trimmedId: trimmedId !== rawId ? trimmedId : 'same as raw',
            lowercaseId: lowercaseId !== rawId ? lowercaseId : 'same as raw',
            trimmedLowercaseMatches:
              venueHandles[trimmedId.toLowerCase()] || 'no match',
          })

          // Check for any potential close matches
          const closeMatches = Object.keys(venueHandles)
            .filter((id) => id.includes(rawId) || rawId.includes(id))
            .slice(0, 3)
          console.log('DEBUG: Potential Close Matches:', closeMatches)
        }
      }

      const validGigs = data.map((gig) => ({
        ...gig,
        start_time: gig.start_time || '23:59',
      }))
      const sortedGigs = validGigs.sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      )
      setGigs(sortedGigs)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGigs(date)

    const interval = setInterval(() => {
      const newDate = getMelbourneDate()
      if (newDate !== date) {
        setDate(newDate)
        fetchGigs(newDate)
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [date, fetchGigs])

  // Filter gigs by location
  const stKildaGigs = useMemo(() => {
    return gigs.filter((gig) => {
      const postcode = getPostcode(gig.venue)
      return ST_KILDA_POSTCODES.includes(postcode)
    })
  }, [gigs])
  console.log('stKildaGigs', stKildaGigs)

  const fitzroyRichmondGigs = useMemo(() => {
    return gigs.filter((gig) => {
      const postcode = getPostcode(gig.venue)
      return FITZROY_RICHMOND_POSTCODES.includes(postcode)
    })
  }, [gigs])

  return (
    <div className="min-h-screen bg-white p-8">
      <h2 className="text-4xl font-bold mb-4 mx-auto text-center mb-[32px]">
        Stories Generator
      </h2>
      <div className="max-w-xl mx-auto mb-8 p-4 bg-gray-100 rounded-lg">
        <div className="flex items-center gap-4 justify-center">
          <input
            type="date"
            value={date}
            className="px-3 py-1 rounded-lg border border-gray-300"
            onChange={(e) => {
              const newDate = e.target.value // "YYYY-MM-DD"
              setDate(newDate)
              fetchGigs(newDate)
            }}
          />
          <div className="text-gray-900">
            {loading ? (
              <span>Loading gigs...</span>
            ) : (
              <span>{gigs.length} total gigs found</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-12">Loading gigs...</div>
        ) : (
          <>
            {/* St Kilda Carousel */}
            <Carousel
              title="St Kilda Gigs"
              location="St Kilda"
              date={date}
              gigs={stKildaGigs}
              id="stkilda"
            />

            {/* Fitzroy/Collingwood/Richmond Carousel */}
            <Carousel
              title="Fitzroy, Collingwood & Richmond Gigs"
              location="Fitzroy, Collingwood and Richmond"
              date={date}
              gigs={fitzroyRichmondGigs}
              id="fitzroy"
            />
          </>
        )}
      </div>

      {error && (
        <div className="text-red-500 text-center mt-4">Error: {error}</div>
      )}
    </div>
  )
}
