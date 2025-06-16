// Script to test the venue Instagram handles integration
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load venue handles mapping manually
const venueHandles = JSON.parse(fs.readFileSync('./venueInstagramHandles.json', 'utf8'));
console.log(`Loaded ${Object.keys(venueHandles).length} venue Instagram handles`);

// Function to simulate caption generation with a sample gig
function testCaptionGeneration() {
  console.log('\n===== TESTING CAPTION GENERATION =====\n');
  
  // Sample gigs with different venue ID formats
  const testGigs = [
    {
      name: 'Test Band 1',
      venue: { 
        id: '41864adc-ba59-4cd2-a060-beb6e0f377e2', // Corner Hotel - should match directly
        name: 'The Corner Hotel' 
      },
      start_time: '8:00 PM'
    },
    {
      name: 'Test Band 2',
      venue: { 
        id: '41864ADC-BA59-4CD2-A060-BEB6E0F377E2', // Uppercase version of Corner Hotel ID
        name: 'The Corner Hotel' 
      },
      start_time: '9:00 PM'
    },
    {
      name: 'Test Band 3',
      venue: { 
        id: '  41864adc-ba59-4cd2-a060-beb6e0f377e2  ', // With whitespace
        name: 'The Corner Hotel' 
      },
      start_time: '10:00 PM'
    },
    {
      name: 'Test Band 4',
      venue: { 
        id: 'missing-id', // ID not in mapping
        name: 'The Evelyn Hotel' // But name should trigger manual lookup
      },
      start_time: '7:30 PM'
    }
  ];

  // Create a normalized lookup map for more robust handle matching
  const normalizedHandles = {};
  Object.entries(venueHandles).forEach(([id, handle]) => {
    normalizedHandles[id.toLowerCase().trim()] = handle;
  });

  // Process each test gig
  testGigs.forEach(gig => {
    console.log(`\nTesting lookup for venue: ${gig.venue.name} (ID: ${gig.venue.id})`);
    
    // Try different lookup methods
    const venueId = gig.venue.id;
    let venueHandle = '';
    let lookupMethod = '';
    
    // First try direct lookup with the raw ID
    if (venueId in venueHandles) {
      venueHandle = venueHandles[venueId];
      lookupMethod = 'direct';
    } 
    // Then try with normalized ID (lowercase & trimmed)
    else if (venueId && normalizedHandles[venueId.toLowerCase().trim()]) {
      venueHandle = normalizedHandles[venueId.toLowerCase().trim()];
      lookupMethod = 'normalized';
    }
    // If still no match, try manual lookup by venue name for some well-known venues
    else if (gig.venue.name) {
      // Create a simplified venue name for matching
      const simplifiedName = gig.venue.name.toLowerCase().replace(/[^\w\s]/g, '');
      
      // Manual lookup for key venues
      if (simplifiedName.includes('corner hotel') || simplifiedName.includes('the corner')) {
        venueHandle = '@cornerhotel';
        lookupMethod = 'manual-name';
      } else if (simplifiedName.includes('evelyn') || simplifiedName.includes('the ev')) {
        venueHandle = '@theevelynhotel';
        lookupMethod = 'manual-name';
      } else if (simplifiedName.includes('northcote social')) {
        venueHandle = '@northcotesc';
        lookupMethod = 'manual-name';
      }
      // Add more common venues as needed
    }
    
    // Format caption line
    let captionLine = '';
    if (venueHandle) {
      captionLine = `🎤 ${gig.name} @ ${gig.venue.name} (${venueHandle}) - ${gig.start_time}`;
    } else {
      captionLine = `🎤 ${gig.name} @ ${gig.venue.name} - ${gig.start_time}`;
      lookupMethod = 'not found';
    }
    
    console.log(`Lookup method: ${lookupMethod}`);
    console.log(`Handle found: ${venueHandle || 'none'}`);
    console.log(`Caption line: ${captionLine}`);
  });
}

// Function to make a test API call and check venue IDs
async function testApiVenueIds() {
  console.log('\n===== TESTING API VENUE IDS =====\n');
  
  try {
    // Get current date in Melbourne timezone
    const today = new Date().toLocaleDateString('en-AU', { 
      timeZone: 'Australia/Melbourne',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/').reverse().join('-');
    
    console.log(`Fetching gigs for date: ${today}`);
    
    // Use native https module for ES modules
    const apiUrl = `https://api.lml.live/gigs/query?location=melbourne&date_from=${today}&date_to=${today}`;
    
    const fetchData = () => {
      return new Promise((resolve, reject) => {
        https.get(apiUrl, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', (err) => {
          reject(err);
        });
      });
    };
    
    const data = await fetchData();
    console.log(`Fetched ${data.length} gigs from API`);
    
    // Check first few gigs
    const sampleSize = Math.min(5, data.length);
    console.log(`\nSample of ${sampleSize} venue IDs from API:`);
    
    for (let i = 0; i < sampleSize; i++) {
      const gig = data[i];
      console.log(`\nGig: ${gig.name} @ ${gig.venue.name}`);
      console.log(`Venue ID: "${gig.venue.id}"`);
      console.log(`ID type: ${typeof gig.venue.id}`);
      console.log(`ID length: ${gig.venue.id.length}`);
      console.log(`Direct match in handles: ${gig.venue.id in venueHandles ? 'Yes' : 'No'}`);
      
      if (gig.venue.id in venueHandles) {
        console.log(`Handle: ${venueHandles[gig.venue.id]}`);
      } else {
        const normalizedId = gig.venue.id.toLowerCase().trim();
        const normalizedMatch = Object.keys(venueHandles).find(id => 
          id.toLowerCase().trim() === normalizedId
        );
        
        if (normalizedMatch) {
          console.log(`Normalized match found: ${venueHandles[normalizedMatch]}`);
        } else {
          console.log('No match found in venue handles mapping');
        }
      }
    }
  } catch (error) {
    console.error('Error testing API venue IDs:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('===== VENUE INSTAGRAM HANDLES TEST =====');
  testCaptionGeneration();
  await testApiVenueIds();
  console.log('\n===== TEST COMPLETED =====');
}

runTests();