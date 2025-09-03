function getPostcode(venue) {
  // First try to use the dedicated postcode field if it exists
  if (venue.postcode) {
    return venue.postcode
  }

  // Fall back to extracting from address if postcode field is not available
  const match = venue.address.match(/\b(\d{4})\b/)
  return match ? match[1] : ''
}

export { getPostcode }
