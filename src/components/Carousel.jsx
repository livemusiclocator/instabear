import { useRef, useState, useMemo } from 'react'
import { toPng } from 'html-to-image'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import {
  BRAND_BLUE,
  TITLE_CAPTION,
  CONTAINER_HEIGHT,
} from '../constants/common'
import { GigPanel, LocationTitleSlide } from '../components'
import PropTypes from 'prop-types'
import { uploadToGitHub, postToInstagram, generateCaption } from '../utils'

// Carousel Component
const Carousel = ({ title, location, date, gigs, id }) => {
  // Refs to each slide DOM element
  const slideRefs = useRef([])

  // State for this carousel
  const [uploadedImages, setUploadedImages] = useState(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const [isPosting, setIsPosting] = useState(false)

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

  // Render slides to images
  const renderSlidesToImages = async () => {
    setUploadStatus('Generating and uploading images...')
    try {
      let captions = []
      let imageUrls = []

      const options = {
        width: 540,
        height: 960,
        backgroundColor: '#1a1a1a',
        pixelRatio: 1.9,
        preserveAlpha: true,
        quality: 1.0,
      }

      // Title slide
      const titleSlide = document.querySelector(`.location-title-slide-${id}`)
      if (titleSlide) {
        const dataUrl = await toPng(titleSlide, options)
        const formattedDate = date.replace(/-/g, '')
        const filename = `gigs_${formattedDate}_${id}_carousel0.png`

        const githubUrl = await uploadToGitHub(dataUrl, filename)
        imageUrls.push(githubUrl)

        const titleCaption = TITLE_CAPTION
        captions.push(titleCaption)
      }

      // Gig slides - limit to 9 slides (10 total with title)
      for (let i = 0; i < Math.min(slides.length, 9); i++) {
        const slide = slideRefs.current[i]
        if (slide) {
          const dataUrl = await toPng(slide, options)
          const formattedDate = date.replace(/-/g, '')
          const filename = `gigs_${formattedDate}_${id}_carousel${i + 1}.png`

          const githubUrl = await uploadToGitHub(dataUrl, filename)
          imageUrls.push(githubUrl)

          const caption = generateCaption(
            slides[i],
            i,
            Math.min(slides.length, 9),
            date,
            location
          )
          captions.push(caption)
        }
      }

      console.log('Uploaded Image URLs:', imageUrls)
      setUploadedImages({ urls: imageUrls, captions })
      setUploadStatus('Images ready for Instagram posting')

      return imageUrls
    } catch (err) {
      console.error('Error rendering and uploading slides:', err)
      setUploadStatus(`Error: ${err.message}`)
      throw err
    }
  }

  const handleInstagramPost = async () => {
    if (!uploadedImages) return

    // Removed confirmation dialog for automation
    setIsPosting(true)
    setUploadStatus('Posting to Instagram...')

    try {
      console.log('DEBUG: Preparing to post to Instagram')

      // Extract all venue handles from captions for debugging
      const allHandles = []
      uploadedImages.captions.forEach((caption, index) => {
        const handleMatches = caption.match(/@[a-zA-Z0-9_.]+/g) || []
        console.log(
          `DEBUG: Caption ${index + 1} contains ${
            handleMatches.length
          } venue handles:`,
          handleMatches
        )

        handleMatches.forEach((handle) => {
          if (!allHandles.includes(handle)) {
            allHandles.push(handle)
          }
        })
      })

      console.log(
        'DEBUG: Found total of',
        allHandles.length,
        'unique venue handles:',
        allHandles
      )
      console.log(
        'DEBUG: These handles should appear in the Instagram post caption'
      )

      const result = await postToInstagram(
        uploadedImages.urls,
        uploadedImages.captions
      )
      if (result.success) {
        setUploadStatus('Successfully posted to Instagram!')
      } else {
        setUploadStatus(`Instagram posting failed: ${result.error}`)
      }
    } catch (err) {
      setUploadStatus(`Instagram posting failed: ${err.message}`)
    } finally {
      setIsPosting(false)
    }
  }

  // Handle downloading images as a zip file
  const handleDownloadImages = async () => {
    if (!uploadedImages) return

    setUploadStatus('Preparing images for download...')

    try {
      const zip = new JSZip()
      const promises = []

      // Add each image to the zip file
      uploadedImages.urls.forEach((url) => {
        const filename = url.split('/').pop()
        const promise = fetch(url)
          .then((response) => response.blob())
          .then((blob) => {
            zip.file(filename, blob)
          })
        promises.push(promise)
      })

      // Wait for all images to be added to the zip
      await Promise.all(promises)

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      // Trigger download
      const formattedDate = date.replace(/-/g, '')
      saveAs(zipBlob, `lml_gigs_${formattedDate}_${id}.zip`)

      setUploadStatus('Images downloaded successfully')
    } catch (err) {
      console.error('Error downloading images:', err)
      setUploadStatus(`Download failed: ${err.message}`)
    }
  }

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
            ref={(el) => (slideRefs.current[slideIndex] = el)}
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

      {/* Actions and status */}
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
        <button
          id={`generate-images-btn-${id}`}
          onClick={renderSlidesToImages}
          disabled={isPosting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Generate Images
        </button>

        {uploadedImages && (
          <div>
            <div className="flex space-x-2 justify-center">
              <button
                id={`post-instagram-btn-${id}`}
                onClick={handleInstagramPost}
                disabled={isPosting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Post to Instagram
              </button>

              {/* Download Images Button */}
              <button
                id={`download-images-btn-${id}`}
                onClick={handleDownloadImages}
                disabled={isPosting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Download Images
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Review the images above before posting or downloading
            </p>
          </div>
        )}

        {uploadStatus && (
          <div className="text-sm text-gray-600">{uploadStatus}</div>
        )}
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
