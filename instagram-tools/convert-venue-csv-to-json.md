# CSV to JSON Conversion Script for Venue Instagram Handles

This document contains a script to convert the `lml-socmedia-track.csv` file to the required JSON format for `venueInstagramHandles.json`.

## Instructions

1. Copy the code below into a new file named `convert-venue-csv-to-json.js`
2. Make sure you have the required dependencies installed (`csv-parser` and `fs`)
3. Run the script: `node convert-venue-csv-to-json.js`

## Script Code

```javascript
// convert-venue-csv-to-json.js
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Input and output file paths
const inputFile = path.join(__dirname, 'lml-socmedia-track.csv');
const outputFile = path.join(__dirname, '..', 'venueInstagramHandles.json');

const results = {};
let processedRows = 0;
let validMappings = 0;

// Process the CSV file
fs.createReadStream(inputFile)
  .pipe(csv())
  .on('data', (data) => {
    processedRows++;
    
    // Extract the venue ID and Instagram handle
    const venueId = data['LML Venue ID']?.trim();
    let instaHandle = data['Insta @ handle']?.trim();
    
    // Skip rows with missing data
    if (!venueId || !instaHandle) {
      return;
    }
    
    // Make sure the handle starts with @
    if (!instaHandle.startsWith('@')) {
      instaHandle = `@${instaHandle}`;
    }
    
    // Add to results
    results[venueId] = instaHandle;
    validMappings++;
  })
  .on('end', () => {
    // Write to JSON file
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    
    console.log(`CSV processing complete!`);
    console.log(`Processed ${processedRows} rows from CSV`);
    console.log(`Found ${validMappings} valid venue ID to Instagram handle mappings`);
    console.log(`Output written to: ${outputFile}`);
    
    // Provide a sample of the results
    const sampleKeys = Object.keys(results).slice(0, 5);
    console.log('\nSample of generated mappings:');
    sampleKeys.forEach(key => {
      console.log(`"${key}": "${results[key]}"`);
    });
  });
```

## Expected Output

The script will generate a JSON file with venue IDs as keys and Instagram handles as values:

```json
{
  "ac2fa0b6-0f7d-4233-a514-262e6c6c113b": "@baddecisionsbar",
  "68524262-c33c-450c-856f-3a7f436fa441": "@baropenfitzroy",
  "2407f3c0-6f4b-4f08-9e15-cb06127dd799": "@bendigohotel",
  "41864adc-ba59-4cd2-a060-beb6e0f377e2": "@cornerhotel",
  "840b43b6-b05c-477b-b0d3-275e72aedd73": "@theevelynhotel",
  ...
}
```

## Filtering and Customization Options

If you need to customize the script, here are some possible modifications:

### Filter by Venue Type

Add a condition to include only venues of a certain type:

```javascript
// Add this condition inside the 'data' event handler
if (data['Venue Type'] === 'Bar' || data['Venue Type'] === 'Club') {
  // Add to results
  results[venueId] = instaHandle;
  validMappings++;
}
```

### Handle Duplicate Venues

Add logic to handle duplicate venue IDs:

```javascript
// Inside the 'data' event handler
if (results[venueId]) {
  console.log(`Warning: Duplicate venue ID found: ${venueId}`);
  console.log(`  Existing: ${results[venueId]}`);
  console.log(`  New: ${instaHandle}`);
}
```

### Add Error Handling

Add more robust error handling:

```javascript
fs.createReadStream(inputFile)
  .on('error', (err) => {
    console.error(`Error reading file: ${err.message}`);
    process.exit(1);
  })
  .pipe(csv())
  // Rest of the code