function getSuburb(address) {
  const match = address.match(/(?:,\s*)?([A-Za-z\s]+)(?:\s+\d{4})?$/)
  return match ? match[1].trim() : ''
}

export { getSuburb }
