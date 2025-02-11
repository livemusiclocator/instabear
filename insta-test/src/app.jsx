// src/App.jsx
import { useState } from 'react'

function App() {
  const [status, setStatus] = useState('')
  const [token, setToken] = useState('')
  const [businessId, setBusinessId] = useState('')

  // Two test images from Lorem Picsum
  const testImages = [
    'https://picsum.photos/500/500?random=1',
    'https://picsum.photos/500/500?random=2'
  ]

  async function testCarousel() {
    setStatus('Starting carousel test...')
    
    // Add this debug logging right here
    console.log('Token analysis:', {
        length: token.length,
        firstChars: token.substring(0, 10) + '...',
        lastChars: '...' + token.substring(token.length - 10),
        containsSpaces: token.includes(' '),
        containsNewlines: token.includes('\n')
    });

    try {
        // Rest of the existing function...
      // Step 1: Create media containers for each image
      setStatus('Creating media containers...')
      const mediaIds = []
      
      for (const imageUrl of testImages) {
        const params = new URLSearchParams({
          image_url: imageUrl,
          access_token: token,
          is_carousel_item: 'true',
          media_type: 'IMAGE'
        })

        const response = await fetch(
          `https://graph.facebook.com/v18.0/${businessId}/media`,
          {
            method: 'POST',
            body: params
          }
        )

        const data = await response.json()
        console.log('Media container response:', data)

        if (!data.id) {
          throw new Error(`Failed to create media: ${JSON.stringify(data)}`)
        }

        mediaIds.push(data.id)
        setStatus(`Created media ID: ${data.id}`)
      }

      // Step 2: Create carousel container
      setStatus('Creating carousel container...')
      const carouselParams = new URLSearchParams({
        media_type: 'CAROUSEL',
        children: mediaIds.join(','),
        caption: 'Test carousel post from debug app',
        access_token: token
      })

      const carouselResponse = await fetch(
        `https://graph.facebook.com/v18.0/${businessId}/media`,
        {
          method: 'POST',
          body: carouselParams
        }
      )

      const carouselData = await carouselResponse.json()
      console.log('Carousel container response:', carouselData)

      if (!carouselData.id) {
        throw new Error(`Failed to create carousel: ${JSON.stringify(carouselData)}`)
      }

      // Step 3: Publish the carousel
      setStatus('Publishing carousel...')
      const publishParams = new URLSearchParams({
        creation_id: carouselData.id,
        access_token: token
      })

      const publishResponse = await fetch(
        `https://graph.facebook.com/v18.0/${businessId}/media_publish`,
        {
          method: 'POST',
          body: publishParams
        }
      )

      const publishData = await publishResponse.json()
      console.log('Publish response:', publishData)

      if (publishData.id) {
        setStatus('Success! Carousel Post ID: ' + publishData.id)
      } else {
        throw new Error(`Failed to publish carousel: ${JSON.stringify(publishData)}`)
      }

    } catch (error) {
      setStatus(`Error: ${error.message}`)
      console.error('Full error:', error)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h1>Instagram Carousel Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          Access Token:<br/>
          <input 
            type="text" 
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{ width: '100%', padding: '5px' }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>
          Business Account ID:<br/>
          <input 
            type="text" 
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            style={{ width: '100%', padding: '5px' }}
          />
        </label>
      </div>

      <button 
        onClick={testCarousel}
        disabled={!token || !businessId}
        style={{ padding: '10px 20px' }}
      >
        Test Carousel Post
      </button>

      <div style={{ marginTop: '20px', whiteSpace: 'pre-wrap' }}>
        Status: {status}
      </div>
    </div>
  )
}

export default App