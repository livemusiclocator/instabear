// fetch-instagram-follows.js
require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Instagram Graph API credentials
const INSTAGRAM_ACCESS_TOKEN = process.env.VITE_INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID;

// Function to fetch accounts the business account follows
async function fetchFollowedAccounts() {
  try {
    console.log('Fetching accounts followed by business account...');
    
    const url = `https://graph.facebook.com/v18.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/follows?fields=id,username,name&limit=200&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.data) {
      throw new Error(`Failed to fetch followed accounts: ${JSON.stringify(data)}`);
    }
    
    return data.data.map(account => ({
      instagram_handle: `@${account.username}`,
      instagram_name: account.name,
      instagram_id: account.id,
      lml_venue_id: '',
      venue_name: ''
    }));
  } catch (error) {
    console.error('Error fetching followed accounts:', error);
    throw error;
  }
}

// Function to export accounts to CSV
async function exportToCsv(accounts) {
  const csvWriter = createCsvWriter({
    path: 'venue-instagram-mapping.csv',
    header: [
      { id: 'instagram_handle', title: 'Instagram Handle' },
      { id: 'instagram_name', title: 'Instagram Display Name' },
      { id: 'instagram_id', title: 'Instagram ID' },
      { id: 'lml_venue_id', title: 'LML Venue ID' },
      { id: 'venue_name', title: 'Venue Name' }
    ]
  });
  
  await csvWriter.writeRecords(accounts);
  console.log(`Successfully exported ${accounts.length} accounts to venue-instagram-mapping.csv`);
}

// Main function
async function main() {
  try {
    const accounts = await fetchFollowedAccounts();
    await exportToCsv(accounts);
    console.log('Process completed successfully.');
    
    // Optional: Also fetch and export venue list to help with matching
    console.log('To help with manual matching, you may want to fetch your venue list from:');
    console.log('https://api.lml.live/venues');
  } catch (error) {
    console.error('Process failed:', error);
  }
}

main();