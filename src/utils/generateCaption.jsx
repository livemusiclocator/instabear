// Import venue Instagram handles mapping
import venueHandles from '../../venueInstagramHandles.json'
import { getPublicUrl } from '../utils'

// Caption generator
function generateCaption(slideGigs, slideIndex, totalSlides, date, location) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    timeZone: 'Australia/Melbourne',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // Debug logging of gigs and their venues for this slide
  console.log(
    `DEBUG: Generating caption for slide ${slideIndex + 1} with ${
      slideGigs.length
    } gigs`
  )
  slideGigs.forEach((gig) => {
    console.log('DEBUG: Gig venue details:', {
      gigName: gig.name,
      venueId: gig.venue.id,
      venueName: gig.venue.name,
      hasHandle: !!venueHandles[gig.venue.id],
      handle: venueHandles[gig.venue.id] || 'none',
    })
  })

  // Log available venue handles for this location
  console.log(
    'DEBUG: Processing caption for',
    location,
    'with',
    slideGigs.length,
    'gigs'
  )

  let caption = `More information here: ${getPublicUrl('?dateRange=today')}\n\n`
  caption += `🎵 Live Music Locator - ${location} - ${formattedDate}\n`
  caption += `Slide ${slideIndex + 1} of ${totalSlides}\n\n`
  caption += slideGigs
    .map((gig) => {
      // Check if we have an Instagram handle for this venue - ONLY exact ID match
      const venueId = gig.venue.id
      const venueHandle = venueHandles[venueId] || ''

      // Debug log each caption line generation
      console.log(`DEBUG: Caption for ${gig.name} @ ${gig.venue.name}:`, {
        venueId,
        exactMatch: venueId in venueHandles,
        handleResult: venueHandle,
      })

      // Format the caption line with handle if available
      if (venueHandle) {
        return `🎤 ${gig.name} @ ${gig.venue.name} (${venueHandle}) - ${gig.start_time}`
      } else {
        return `🎤 ${gig.name} @ ${gig.venue.name} - ${gig.start_time}`
      }
    })
    .join('\n')

  // Log the final caption for verification
  console.log('DEBUG: Generated caption:', caption)

  return caption
}

export { generateCaption }
