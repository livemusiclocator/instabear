const axios = require('axios');

// Replace with your access token and Instagram Business Account ID
const ACCESS_TOKEN = 'EAAYuL4tgnWEBO5tUTTrCKNC4htZCjtGw4tJLZC1AsVJV5f4xOZA8BOIlGwcGM57SLH94lDiU4vuXVZCnUUkWDgI6nV749ZCZC5U9RJqbPiQZCjWZBATuhMlXszDqXf50QZC0tRbHZCkKkiQDpjP336ZAZAwgvJsw1RswqbcLzDwvq3vhisw7EGI9AMX4XQZDZD';
const INSTAGRAM_BUSINESS_ACCOUNT_ID = '17841467087794365'; // Replace with your Instagram Business Account ID

// Direct Imgur URLs for testing
const imageFiles = [
  'https://i.imgur.com/NvZwaYL.png', // Replace with the actual URL for gigs_20241130_carousel0.png
  'https://i.imgur.com/5qCuJ9D.png', // Replace with the actual URL for gigs_20241130_carousel1.png
  'https://i.imgur.com/xIRiG7A.png', // Replace with the actual URL for gigs_20241130_carousel2.png
];

// Function to replace placeholders in the caption
function formatCaption(caption, date, numberOfGigs) {
  return caption
    .replace('[Insert Date Here]', date)
    .replace('[Insert number of gigs here]', numberOfGigs);
}

// Function to upload images and create a carousel
async function postCarouselToInstagram() {
  try {
    // Hardcoded caption for testing
    const captionTemplate = 'Check out these gigs! [Insert Date Here]. [Insert number of gigs here] gigs available.';

    // Get the date and number of gigs
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const numberOfGigs = imageFiles.length - 1; // Subtract 1 for the title slide

    // Format the caption
    const caption = formatCaption(captionTemplate, date, numberOfGigs);

    // Step 1: Upload each image and get their media IDs
    const mediaIds = [];
    for (const imageUrl of imageFiles) {
      const response = await axios.post(`https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`, {
        image_url: imageUrl,
        caption: caption, // Add caption to all images
        access_token: ACCESS_TOKEN,
        is_carousel_item: true,
      });

      mediaIds.push(response.data.id);

      // Debug: Log the response for the first image
      if (imageUrl === imageFiles[0]) {
        console.log('First image upload response:', response.data);
      }
    }

    // Step 2: Create the carousel container
    const carouselResponse = await axios.post(`https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`, {
      media_type: 'CAROUSEL',
      children: mediaIds.join(','),
      caption: caption,
      access_token: ACCESS_TOKEN,
    });

    const carouselContainerId = carouselResponse.data.id;

    // Step 3: Publish the carousel
    const publishResponse = await axios.post(`https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media_publish`, {
      creation_id: carouselContainerId,
      access_token: ACCESS_TOKEN,
    });

    console.log('Carousel posted successfully:', publishResponse.data);
  } catch (error) {
    console.error('Error posting carousel:', error.response?.data || error.message);
  }
}

// Run the function
postCarouselToInstagram();