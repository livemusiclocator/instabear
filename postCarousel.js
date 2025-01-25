const axios = require('axios');

// Access secrets from environment variables
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

// Function to upload images and create a carousel
async function postCarouselToInstagram(imageFiles) {
  try {
    // Hardcoded caption for testing
    const captionTemplate = 'Check out these gigs! [Insert Date Here]. [Insert number of gigs here] gigs available.';

    // Get the date and number of gigs
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const numberOfGigs = imageFiles.length - 1; // Subtract 1 for the title slide

    // Format the caption
    const caption = formatCaption(captionTemplate, date, numberOfGigs);

    // Validate the caption length (Instagram allows up to 2,200 characters)
    if (caption.length > 2200) {
      throw new Error('Caption exceeds Instagram\'s 2,200 character limit.');
    }

    // Validate image URLs
    if (!validateImageUrls(imageFiles)) {
      throw new Error('One or more image URLs are invalid.');
    }

    // Step 1: Upload each image and get their media IDs
    const mediaIds = [];
    for (const imageUrl of imageFiles) {
      console.log(`Uploading image: ${imageUrl}`);
      const response = await axios.post(`https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`, {
        image_url: imageUrl,
        caption: caption, // Add caption to all images
        access_token: ACCESS_TOKEN,
        is_carousel_item: true,
      });

      if (!response.data.id) {
        throw new Error(`Failed to upload image: ${imageUrl}. Response: ${JSON.stringify(response.data)}`);
      }

      mediaIds.push(response.data.id);
      console.log(`Image uploaded successfully. Media ID: ${response.data.id}`);
    }

    // Step 2: Create the carousel container
    console.log('Creating carousel container...');
    const carouselResponse = await axios.post(`https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`, {
      media_type: 'CAROUSEL',
      children: mediaIds.join(','),
      caption: caption,
      access_token: ACCESS_TOKEN,
    });

    if (!carouselResponse.data.id) {
      throw new Error(`Failed to create carousel container. Response: ${JSON.stringify(carouselResponse.data)}`);
    }

    const carouselContainerId = carouselResponse.data.id;
    console.log(`Carousel container created successfully. Container ID: ${carouselContainerId}`);

    // Step 3: Publish the carousel
    console.log('Publishing carousel...');
    const publishResponse = await axios.post(`https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media_publish`, {
      creation_id: carouselContainerId,
      access_token: ACCESS_TOKEN,
    });

    if (!publishResponse.data.id) {
      throw new Error(`Failed to publish carousel. Response: ${JSON.stringify(publishResponse.data)}`);
    }

    console.log('Carousel posted successfully:', publishResponse.data);
  } catch (error) {
    console.error('Error posting carousel:', error.response?.data || error.message);

    // Handle DTSG errors specifically
    if (error.response?.data?.error?.code === 1357004) {
      console.error('DTSG token error detected. Please check your access token and try again.');
    }
  }
}

// Export the function for use in the workflow
module.exports = postCarouselToInstagram;