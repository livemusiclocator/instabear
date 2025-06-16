// test-instagram-api.js
require('dotenv').config({ path: '../.env' });
const fetch = require('node-fetch');

// Get credentials from environment variables
const INSTAGRAM_ACCESS_TOKEN = process.env.VITE_INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID;

// Function to test basic account info retrieval
async function testAccountInfo() {
  try {
    console.log('Testing Instagram account info retrieval...');
    console.log('Using business account ID:', INSTAGRAM_BUSINESS_ACCOUNT_ID);
    console.log('Token length:', INSTAGRAM_ACCESS_TOKEN?.length);
    console.log('Token first 10 chars:', INSTAGRAM_ACCESS_TOKEN?.substring(0, 10) + '...');
    
    const url = `https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}?fields=id,username,name&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('\nAccount info response:', data);
    
    if (data.error) {
      console.error('Error getting account info:', data.error);
    } else {
      console.log('Successfully retrieved account info');
    }
    
    return data;
  } catch (error) {
    console.error('Exception during account info test:', error);
    return { error: error.message };
  }
}

// Function to test media upload
async function testMediaUpload() {
  try {
    console.log('\nTesting media upload...');
    
    // Use a test image URL
    const testImageUrl = 'https://raw.githubusercontent.com/livemusiclocator/instabear/main/temp-images/gigs_20250616_fitzroy_carousel0.png';
    
    const params = new URLSearchParams({
      image_url: testImageUrl,
      access_token: INSTAGRAM_ACCESS_TOKEN,
      is_carousel_item: 'true',
      media_type: 'IMAGE'
    });
    
    const response = await fetch(`https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`, {
      method: 'POST',
      body: params
    });
    
    const data = await response.json();
    console.log('Media upload response:', data);
    
    if (data.error) {
      console.error('Error uploading media:', data.error);
    } else if (data.id) {
      console.log('Successfully uploaded media with ID:', data.id);
    }
    
    return data;
  } catch (error) {
    console.error('Exception during media upload test:', error);
    return { error: error.message };
  }
}

// Main function
async function main() {
  console.log('Instagram API Test');
  console.log('=================\n');
  
  // Test account info
  const accountInfo = await testAccountInfo();
  
  // Only test media upload if account info was successful
  if (!accountInfo.error) {
    await testMediaUpload();
  }
  
  console.log('\nTest complete');
}

main();