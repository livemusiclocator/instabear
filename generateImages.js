import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateImages(date) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Load the React app
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

  // Pass the date and trigger image generation
  await page.evaluate((date) => {
    window.setDate(date); // Set the date
    window.setGigs([]); // Clear existing gigs
  }, date);

  // Wait for the gigs to load
  console.log('Waiting for gigs to load...');
  await page.waitForFunction(() => {
    console.log('Checking gigsLoaded:', window.gigsLoaded);
    return window.gigsLoaded === true;
  }, { timeout: 30000 }); // Increase timeout to 30 seconds

  // Trigger image generation
  await page.evaluate(() => {
    window.autoGenerate = true;
  });

  // Wait for the images to be generated
  console.log('Waiting for images to be generated...');
  await page.waitForFunction(() => {
    console.log('Checking imagesGenerated:', window.imagesGenerated);
    return window.imagesGenerated === true;
  }, { timeout: 30000 }); // Increase timeout to 30 seconds

  // Close the browser
  await browser.close();
}

// Main function
async function main() {
  const date = new Date().toISOString().split('T')[0]; // Today's date
  await generateImages(date);
  console.log('Image generation complete!');
}

main().catch(console.error);