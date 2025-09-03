// Instagram posting function
async function postToInstagram(imageUrls, captions) {
  // Instagram posting function
  console.log('Environment variables:', {
    hasAccessToken: !!import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN,
    hasBusinessId: !!import.meta.env.VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID,
  })

  const INSTAGRAM_ACCESS_TOKEN = import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN
  const INSTAGRAM_BUSINESS_ACCOUNT_ID = import.meta.env
    .VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID

  console.log('Token analysis:', {
    length: INSTAGRAM_ACCESS_TOKEN?.length,
    firstChars: INSTAGRAM_ACCESS_TOKEN?.substring(0, 10) + '...',
    lastChars:
      '...' +
      INSTAGRAM_ACCESS_TOKEN?.substring(INSTAGRAM_ACCESS_TOKEN.length - 10),
    containsSpaces: INSTAGRAM_ACCESS_TOKEN?.includes(' '),
    containsNewlines: INSTAGRAM_ACCESS_TOKEN?.includes('\n'),
  })

  // Note: Photo tagging would require Instagram User IDs, not just handles
  // Instagram Graph API only allows tagging in single photos, not carousels
  // This would be a future enhancement requiring additional data and permissions
  console.log(
    'Note: Direct photo tagging is not implemented - using caption mentions instead'
  )

  try {
    console.log('Starting Instagram post process with URLs:', imageUrls)

    if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_BUSINESS_ACCOUNT_ID) {
      throw new Error('Missing Instagram credentials')
    }

    // Step 1: Upload each image and get media IDs
    const mediaIds = []
    for (const imageUrl of imageUrls) {
      console.log(`Uploading image: ${imageUrl}`)

      const params = new URLSearchParams({
        image_url: imageUrl,
        access_token: INSTAGRAM_ACCESS_TOKEN,
        is_carousel_item: 'true',
        media_type: 'IMAGE',
      })

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`,
        {
          method: 'POST',
          body: params,
        }
      )

      const data = await response.json()
      console.log('Image upload response:', data)

      if (!data.id) {
        throw new Error(
          `Failed to upload image: ${imageUrl}. Response: ${JSON.stringify(
            data
          )}`
        )
      }

      mediaIds.push(data.id)
      console.log(`Image uploaded successfully. Media ID: ${data.id}`)

      // Small delay between uploads
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // Step 2: Create carousel container
    console.log('Creating carousel container with media IDs:', mediaIds)

    // Create a combined caption that includes venue handles from all slides
    let combinedCaption = captions[0] // Start with title slide caption

    // Extract venue handles from all other captions
    const venueHandleMatches = []
    for (let i = 1; i < captions.length; i++) {
      const matches = captions[i].match(/@[a-zA-Z0-9_.]+/g) || []
      matches.forEach((match) => {
        if (!venueHandleMatches.includes(match)) {
          venueHandleMatches.push(match)
        }
      })
    }

    // Instagram has a limit on mentions (around 20-30)
    // Implement a fair, randomized selection algorithm with maximum of 19 venues
    const MAX_VENUE_MENTIONS = 19
    let mentionedVenues = []

    if (venueHandleMatches.length <= MAX_VENUE_MENTIONS) {
      // If we're under the limit, use all venues
      mentionedVenues = venueHandleMatches
    } else {
      console.log(
        `WARNING: Found ${venueHandleMatches.length} venues but Instagram has a limit of ${MAX_VENUE_MENTIONS}.`
      )

      // Create a mapping of venues by slide/caption
      const venuesBySlide = {}
      for (let i = 1; i < captions.length; i++) {
        const slideMatches = captions[i].match(/@[a-zA-Z0-9_.]+/g) || []
        venuesBySlide[i] = slideMatches.filter(
          (match) => !mentionedVenues.includes(match)
        )
      }

      // Step 1: Ensure at least one venue from each slide (if possible)
      // This maintains fairness across different locations/slides
      const slideIndices = Object.keys(venuesBySlide)
      // Shuffle the slide order for randomness
      slideIndices.sort(() => Math.random() - 0.5)

      slideIndices.forEach((slideIndex) => {
        if (
          mentionedVenues.length < MAX_VENUE_MENTIONS &&
          venuesBySlide[slideIndex].length > 0
        ) {
          // Randomly select one venue from this slide
          const randomIndex = Math.floor(
            Math.random() * venuesBySlide[slideIndex].length
          )
          const venueToAdd = venuesBySlide[slideIndex][randomIndex]

          if (!mentionedVenues.includes(venueToAdd)) {
            mentionedVenues.push(venueToAdd)
          }
        }
      })

      // Step 2: Fill remaining slots with randomly selected venues
      if (mentionedVenues.length < MAX_VENUE_MENTIONS) {
        // Create a flat list of remaining handles that haven't been added yet
        const remainingHandles = venueHandleMatches.filter(
          (handle) => !mentionedVenues.includes(handle)
        )

        // Shuffle the remaining handles for randomness
        remainingHandles.sort(() => Math.random() - 0.5)

        // Add as many as possible until we hit the limit
        while (
          mentionedVenues.length < MAX_VENUE_MENTIONS &&
          remainingHandles.length > 0
        ) {
          mentionedVenues.push(remainingHandles.shift())
        }
      }

      console.log(
        `DEBUG: Fair random venue selection - chosen ${mentionedVenues.length} venues from ${venueHandleMatches.length} total`
      )
    }

    // Add venue handles to the caption with updated text
    if (mentionedVenues.length > 0) {
      combinedCaption +=
        "\n\nShoutout to a random selection of today's venues (often there are too many to @ here): " +
        mentionedVenues.join(' ')
      console.log(
        `DEBUG: Added ${mentionedVenues.length} venue handles to caption`
      )
    }

    const carouselParams = new URLSearchParams({
      media_type: 'CAROUSEL',
      children: mediaIds.join(','),
      caption: combinedCaption,
      access_token: INSTAGRAM_ACCESS_TOKEN,
    })

    const carouselResponse = await fetch(
      `https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`,
      {
        method: 'POST',
        body: carouselParams,
      }
    )

    const carouselData = await carouselResponse.json()
    console.log('Carousel container response:', carouselData)

    if (!carouselData.id) {
      throw new Error(
        `Failed to create carousel container. Response: ${JSON.stringify(
          carouselData
        )}`
      )
    }

    const carouselContainerId = carouselData.id
    console.log(
      `Carousel container created successfully. Container ID: ${carouselContainerId}`
    )

    // Step 3: Publish the carousel
    console.log('Publishing carousel...')

    const publishParams = new URLSearchParams({
      creation_id: carouselContainerId,
      access_token: INSTAGRAM_ACCESS_TOKEN,
    })

    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media_publish`,
      {
        method: 'POST',
        body: publishParams,
      }
    )

    const publishData = await publishResponse.json()
    console.log('Publish response:', publishData)

    if (!publishData.id) {
      throw new Error(
        `Failed to publish carousel. Response: ${JSON.stringify(publishData)}`
      )
    }

    console.log('Carousel posted successfully:', publishData)
    return { success: true, postId: publishData.id }
  } catch (error) {
    console.error('Error posting carousel:', error)
    return {
      success: false,
      error: error.message,
      details: error.response?.data || error,
    }
  }
}

export { postToInstagram }
