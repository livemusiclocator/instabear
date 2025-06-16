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
    
    // Skip rows with missing data or invalid venue IDs (like #REF! or #N/A)
    if (!venueId || !instaHandle || venueId.includes('#')) {
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