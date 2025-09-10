function formatPrice(gig) {
  // Extract the relevant information
  const venueName = gig.venue.name
  const informationTags = gig.information_tags || []
  const prices = gig.prices || []
  let output = ''
  let reason = ''

  // NEW LOGIC:
  // 1. If there is ANY price info, display "$Ticketed"
  if (prices.length > 0) {
    output = '$Ticketed'
    reason = 'Has price data, showing "$Ticketed"'
  }
  // 2. If the Information field says "Free", display "Free"
  else if (informationTags.some((tag) => tag.toLowerCase() === 'free')) {
    output = 'Free'
    reason = 'Using "Free" from information_tags'
  }
  // 3. If there is no info in either field, leave it blank
  else {
    output = ''
    reason = 'No price data or "Free" tag found'
  }

  // Format the log message as requested
  console.log(
    `Venue: ${venueName.padEnd(30)} | Information: ${JSON.stringify(
      informationTags
    ).padEnd(30)} | Prices: ${JSON.stringify(prices).padEnd(
      30
    )} | Output: ${output} (${reason})`
  )

  return output
}

export { formatPrice }
