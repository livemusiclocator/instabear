# Instagram Venue Handle Integration

This document provides a detailed implementation plan for adding Instagram venue handles to carousel captions in the Live Music Locator Instagram Gallery Generator.

## Phase 1: Data Collection and Mapping

### 1. Data Collection Script

Create a new file called `fetch-instagram-follows.js` with the following content:

```javascript
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
```

### 2. Package Dependencies

You'll need to install the following packages:

```bash
npm install dotenv node-fetch csv-writer
```

### 3. Running the Data Collection Script

1. Create a `.env` file with your Instagram credentials:

```
VITE_INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token
VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id
```

2. Run the script:

```bash
node fetch-instagram-follows.js
```

3. This will generate a `venue-instagram-mapping.csv` file

### 4. Manual Mapping Process

1. Get a list of LML venues by calling the API:

```bash
curl https://api.lml.live/venues > venues.json
```

2. Open the CSV file and manually match Instagram handles to venue IDs:
   - Fill in the `lml_venue_id` column with the venue ID from your API
   - Fill in the `venue_name` column with the venue name for reference

### 5. CSV to JSON Conversion

Once you've completed the manual mapping, convert the CSV to JSON using this script:

```javascript
// csv-to-json.js
const fs = require('fs');
const csv = require('csv-parser');

const results = {};

fs.createReadStream('venue-instagram-mapping.csv')
  .pipe(csv())
  .on('data', (data) => {
    if (data['LML Venue ID'] && data['Instagram Handle']) {
      results[data['LML Venue ID']] = data['Instagram Handle'];
    }
  })
  .on('end', () => {
    fs.writeFileSync('venueInstagramHandles.json', JSON.stringify(results, null, 2));
    console.log('CSV successfully converted to JSON');
  });
```

Run it with:

```bash
npm install csv-parser  # If not already installed
node csv-to-json.js
```

## Phase 2: Code Integration

### 1. Venue Instagram Handle Mapping File

The resulting JSON file (`venueInstagramHandles.json`) will look something like this:

```json
{
  "d4aeb9fa-a50a-4fb3-b7cd-b312ede051a1": "@theoldbar",
  "bdcfc167-cf3e-41fb-a829-7951e465b361": "@baxterslot"
}
```

### 2. Update Caption Generation in instagramgallery.jsx

Modify the `generateCaption` function in `src/instagramgallery.jsx`:

```javascript
// Add this import at the top of the file
import venueHandles from '../venueInstagramHandles.json';

// Replace the existing generateCaption function
function generateCaption(slideGigs, slideIndex, totalSlides, date, location) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    timeZone: 'Australia/Melbourne',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  let caption = `More information here: ${getPublicUrl('?dateRange=today')}\n\n`;
  caption += `🎵 Live Music Locator - ${location} - ${formattedDate}\n`;
  caption += `Slide ${slideIndex + 1} of ${totalSlides}\n\n`;
  
  caption += slideGigs
    .map(gig => {
      // Check if we have an Instagram handle for this venue
      const venueHandle = venueHandles[gig.venue.id] || '';
      
      // Format the caption line with handle if available
      if (venueHandle) {
        return `🎤 ${gig.name} @ ${gig.venue.name} (${venueHandle}) - ${gig.start_time}`;
      } else {
        return `🎤 ${gig.name} @ ${gig.venue.name} - ${gig.start_time}`;
      }
    })
    .join('\n');

  return caption;
}
```

## Implementation Steps

1. First, run the data collection script to generate the CSV file.
2. Manually complete the mapping in the CSV file.
3. Convert the CSV to JSON using the conversion script.
4. Place the JSON file in the project root directory.
5. Update the `generateCaption` function in `src/instagramgallery.jsx`.
6. Test the changes locally.
7. Deploy to production.

## Maintenance

To add new venue mappings in the future:

1. Edit the `venueInstagramHandles.json` file directly
2. OR run the data collection and mapping process again to capture new follows

## Future Enhancements

1. Create a simple admin interface for updating the mapping
2. Periodically refresh the mapping to keep up with new venue follows
3. Integrate with the LML API when Instagram handles are added to venue data

## Benefits

1. **Zero Risk to Production**: The changes don't affect the core Instagram posting functionality
2. **No API Rate Limit Issues**: We make a single API call to collect data, separate from the production flow
3. **Maintainability**: Easy to update the mapping file as new venues are added
4. **Gradual Implementation**: Can start with just a few venues and expand over time