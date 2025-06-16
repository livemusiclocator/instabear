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