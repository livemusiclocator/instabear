// fetch-instagram-follows.js
require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const fetch = require('node-fetch');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Instagram Graph API credentials
const INSTAGRAM_ACCESS_TOKEN = process.env.VITE_INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID;

// Function to search for Instagram business account info
async function fetchBusinessAccountInfo() {
  try {
    console.log('Fetching business account information...');
    
    const url = `https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}?fields=name,username,profile_picture_url&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Failed to fetch business account info: ${JSON.stringify(data)}`);
    }
    
    console.log('Business Account Info:');
    console.log(`- Name: ${data.name}`);
    console.log(`- Username: ${data.username}`);
    console.log(`- ID: ${INSTAGRAM_BUSINESS_ACCOUNT_ID}`);
    
    return data;
  } catch (error) {
    console.error('Error fetching business account:', error);
    throw error;
  }
}

// Function to create empty CSV template
async function createEmptyCSVTemplate() {
  const csvWriter = createCsvWriter({
    path: 'venue-instagram-mapping.csv',
    header: [
      { id: 'instagram_handle', title: 'Instagram Handle' },
      { id: 'instagram_name', title: 'Instagram Display Name' },
      { id: 'lml_venue_id', title: 'LML Venue ID' },
      { id: 'venue_name', title: 'Venue Name' }
    ]
  });
  
  // Create a few example rows
  const exampleData = [
    {
      instagram_handle: '@theoldbar',
      instagram_name: 'The Old Bar',
      lml_venue_id: 'd4aeb9fa-a50a-4fb3-b7cd-b312ede051a1',
      venue_name: 'The Old Bar'
    },
    {
      instagram_handle: '@baxterslot',
      instagram_name: 'Baxter\'s Lot',
      lml_venue_id: 'bdcfc167-cf3e-41fb-a829-7951e465b361',
      venue_name: 'Baxter\'s Lot'
    },
    {
      instagram_handle: '@cornerhotel',
      instagram_name: 'Corner Hotel',
      lml_venue_id: '',
      venue_name: 'Corner Hotel'
    },
    {
      instagram_handle: '@theworkersclub',
      instagram_name: 'The Workers Club',
      lml_venue_id: '',
      venue_name: 'The Workers Club'
    },
    {
      instagram_handle: '@puntersbar',
      instagram_name: 'The Punters Club',
      lml_venue_id: '',
      venue_name: 'The Punters Club'
    },
    {
      instagram_handle: '',
      instagram_name: '',
      lml_venue_id: '',
      venue_name: ''
    }
  ];
  
  await csvWriter.writeRecords(exampleData);
  console.log(`Created template CSV file 'venue-instagram-mapping.csv' with example mappings`);
}

// Main function
async function main() {
  try {
    console.log('Instagram Handle Mapping Tool');
    console.log('===========================\n');
    
    console.log('Encountered Instagram token issue. Creating manual template instead.');
    console.log('Error: The Instagram token is invalid or expired. Please update it according to META_TOKEN_RENEWAL.md');
    
    // Create CSV template for manual mapping
    await createEmptyCSVTemplate();
    console.log('\nTemplate CSV created successfully.');
    
    // Provide guidance for next steps
    console.log('\nNext steps:');
    console.log('1. Fix your Instagram token using instructions in META_TOKEN_RENEWAL.md');
    console.log('2. Edit venue-instagram-mapping.csv to add Instagram handles for venues');
    console.log('3. To help with mapping, fetch your venue list from:');
    console.log('   https://api.lml.live/venues');
    console.log('4. Run the csv-to-json.js script to convert the completed CSV to JSON');
  } catch (error) {
    console.error('\nProcess failed:', error);
  }
}

main();