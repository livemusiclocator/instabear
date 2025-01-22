// gig-name-analyzer.js
import fs from 'fs';

const API_BASE = 'https://api.lml.live/gigs/query';
const WEEKS_TO_ANALYZE = 16;

async function fetchGigsForWeek(startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);
  
  const url = `${API_BASE}?location=melbourne&date_from=${startDate.toISOString().split('T')[0]}&date_to=${endDate.toISOString().split('T')[0]}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching gigs for week of ${startDate}:`, error);
    return [];
  }
}

async function analyzeGigNames() {
  const gigNameData = [];
  const today = new Date();
  
  // Start 16 weeks ago
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (WEEKS_TO_ANALYZE * 7));
  
  console.log(`Analyzing gig names from ${startDate.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);
  
  // Fetch each week
  for (let week = 0; week < WEEKS_TO_ANALYZE; week++) {
    const weekStartDate = new Date(startDate);
    weekStartDate.setDate(weekStartDate.getDate() + (week * 7));
    
    console.log(`Fetching week ${week + 1}/${WEEKS_TO_ANALYZE}...`);
    const gigs = await fetchGigsForWeek(weekStartDate);
    
    // Extract gig names and lengths
    gigs.forEach(gig => {
      gigNameData.push({
        name: gig.name,
        length: gig.name.length
      });
    });
    
    // Wait a bit between requests to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Write to CSV
  const csv = ['Gig Name,Character Length'];
  gigNameData.forEach(({ name, length }) => {
    // Escape quotes in gig names for CSV
    const escapedName = name.replace(/"/g, '""');
    csv.push(`"${escapedName}",${length}`);
  });
  
  const filename = 'gig_name_lengths.csv';
  fs.writeFileSync(filename, csv.join('\n'));
  
  // Print some stats
  const lengths = gigNameData.map(g => g.length);
  const stats = {
    total: gigNameData.length,
    shortest: Math.min(...lengths),
    longest: Math.max(...lengths),
    average: lengths.reduce((a, b) => a + b, 0) / lengths.length,
    median: lengths.sort((a, b) => a - b)[Math.floor(lengths.length / 2)]
  };
  
  console.log('\nAnalysis complete!');
  console.log(`Written to ${filename}`);
  console.log('\nStats:');
  console.log(`Total gigs analyzed: ${stats.total}`);
  console.log(`Shortest name: ${stats.shortest} chars`);
  console.log(`Longest name: ${stats.longest} chars`);
  console.log(`Average length: ${stats.average.toFixed(1)} chars`);
  console.log(`Median length: ${stats.median} chars`);
  
  // Log some examples of longest names
  console.log('\nLongest gig names:');
  gigNameData
    .sort((a, b) => b.length - a.length)
    .slice(0, 5)
    .forEach(({ name, length }) => {
      console.log(`${length} chars: ${name}`);
    });
}

analyzeGigNames().catch(console.error);