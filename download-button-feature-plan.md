# Download Button Feature Plan

## Overview
Add a "Download Images" button next to each "Post to Instagram" button in the Instagram gallery, allowing users to download all images for a specific area (St Kilda or Fitzroy/Collingwood/Richmond) as a zip file.

## Requirements
1. A "Download Images" button next to each "Post to Instagram" button
2. Each button downloads all images for that specific area as a zip file
3. The button only appears after images have been generated

## Implementation Plan

### 1. Add JSZip Library
We need to add the JSZip library to handle creating zip files in the browser:

```bash
npm install jszip file-saver --save
```

- JSZip: For creating zip files in the browser
- FileSaver: For triggering the download in the browser

### 2. Modify the Carousel Component

#### Add Download Button
Add a new "Download Images" button next to the "Post to Instagram" button in the Carousel component:

```jsx
{uploadedImages && (
  <div>
    <button
      id={`post-instagram-btn-${id}`}
      onClick={handleInstagramPost}
      disabled={isPosting}
      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 mr-2"
    >
      Post to Instagram
    </button>
    
    {/* New Download Button */}
    <button
      id={`download-images-btn-${id}`}
      onClick={handleDownloadImages}
      disabled={isPosting}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Download Images
    </button>
    
    <p className="text-sm text-gray-600 mt-2">
      Review the images above before posting or downloading
    </p>
  </div>
)}
```

#### Add Download Function
Add a new function to handle downloading images as a zip file:

```jsx
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// In the Carousel component
const handleDownloadImages = async () => {
  if (!uploadedImages) return;
  
  setUploadStatus('Preparing images for download...');
  
  try {
    const zip = new JSZip();
    const promises = [];
    
    // Add each image to the zip file
    uploadedImages.urls.forEach((url, index) => {
      const filename = url.split('/').pop();
      const promise = fetch(url)
        .then(response => response.blob())
        .then(blob => {
          zip.file(filename, blob);
        });
      promises.push(promise);
    });
    
    // Wait for all images to be added to the zip
    await Promise.all(promises);
    
    // Generate the zip file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Trigger download
    const formattedDate = date.replace(/-/g, '');
    saveAs(zipBlob, `lml_gigs_${formattedDate}_${id}.zip`);
    
    setUploadStatus('Images downloaded successfully');
  } catch (err) {
    console.error('Error downloading images:', err);
    setUploadStatus(`Download failed: ${err.message}`);
  }
};
```

### 3. Import Required Libraries
Add the necessary imports at the top of the file:

```jsx
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
```

## Testing Plan
1. Generate images for both St Kilda and Fitzroy areas
2. Verify that the "Download Images" button appears next to each "Post to Instagram" button
3. Click the "Download Images" button for each area and verify that a zip file is downloaded
4. Extract the zip file and verify that all images are included and can be opened

## Considerations
- The download process might take some time for many images, so we should show a loading indicator
- We should handle errors gracefully and show appropriate error messages
- The zip filename should include the date and area for easy identification