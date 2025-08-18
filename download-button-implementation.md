# Download Button Implementation Plan

## Step 1: Install Required Dependencies

First, we need to install the JSZip and FileSaver libraries:

```bash
npm install jszip file-saver --save
```

## Step 2: Modify the Carousel Component in src/instagramgallery.jsx

### Add Imports
Add the following imports at the top of the file:

```jsx
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
```

### Add Download Function
Add the `handleDownloadImages` function to the Carousel component:

```jsx
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

### Add Download Button
Modify the JSX in the Carousel component to add the download button next to the "Post to Instagram" button:

```jsx
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
      
      {/* New Download Button */}
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
```

## Step 3: Test the Implementation

1. Run the development server:
   ```bash
   npm run dev
   ```

2. Open the application in a browser
3. Generate images for both St Kilda and Fitzroy areas
4. Verify that the "Download Images" button appears next to each "Post to Instagram" button
5. Click the "Download Images" button for each area and verify that a zip file is downloaded
6. Extract the zip file and verify that all images are included and can be opened

## Step 4: Deploy the Changes

After testing and confirming that the feature works as expected, deploy the changes:

```bash
npm run deploy
```

## Code Changes Summary

1. Install JSZip and FileSaver libraries
2. Add imports for JSZip and FileSaver
3. Add handleDownloadImages function to the Carousel component
4. Add Download Images button next to the Post to Instagram button
5. Test and deploy the changes

## Potential Issues and Solutions

1. **Cross-Origin Resource Sharing (CORS)**: If the images are hosted on a different domain, you might encounter CORS issues when trying to fetch them. Solution: Ensure the server hosting the images allows CORS requests from your application domain.

2. **Large Files**: If there are many images or the images are large, the download process might take a long time or fail. Solution: Add a progress indicator and consider implementing a fallback mechanism for large downloads.

3. **Browser Compatibility**: Some older browsers might not support the File API or Blob objects. Solution: Add a browser compatibility check and provide a fallback mechanism or warning for unsupported browsers.