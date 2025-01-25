import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to fetch gig data
async function fetchGigs(date) {
  try {
    const response = await fetch(
      `https://api.lml.live/gigs/query?location=melbourne&date_from=${date}&date_to=${date}`
    );
    const data = await response.json();
    return data.map(gig => ({
      ...gig,
      start_time: gig.start_time || '23:59'
    }));
  } catch (error) {
    console.error('Error fetching gigs:', error);
    throw error;
  }
}

// Function to generate images using Puppeteer
async function generateImages(gigs, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Load your React app
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

  // Wait for the React app to initialize
  await page.waitForFunction(() => window.setGigs !== undefined);

  // Inject gig data into the React app
  await page.evaluate((gigs) => {
    window.setGigs(gigs);
  }, gigs);

  // Wait for the React app to render
  await page.waitForSelector('.title-slide');

  // Set the viewport to match the slide dimensions
  await page.setViewport({ width: 540, height: 540, deviceScaleFactor: 2 });

  // Generate images for each slide
  const images = [];
  const slideSelectors = ['.title-slide', ...Array.from({ length: gigs.length }, (_, i) => `.slide-${i}`)];

  for (let i = 0; i < slideSelectors.length; i++) {
    const selector = slideSelectors[i];
    const imagePath = path.join(outputDir, `gig_${i}.png`);

    try {
      // Scroll to the slide
      await page.evaluate((selector) => {
        const slide = document.querySelector(selector);
        if (slide) {
          slide.scrollIntoView();
        }
      }, selector);

      // Wait for the slide to be in view
      await page.waitForSelector(selector, { timeout: 5000 });

      // Take a screenshot of the slide
      await page.screenshot({
        path: imagePath,
        clip: { x: 0, y: 0, width: 540, height: 540 }, // Adjust dimensions to match your slides
        omitBackground: true // Ensure transparency (if needed)
      });

      images.push(imagePath);
      console.log(`Generated image: ${imagePath}`);
    } catch (error) {
      console.error(`Error capturing slide ${i}:`, error);
    }
  }

  await browser.close();
  return images;
}

// Function to generate captions for the slides
function generateCaptions(gigs, outputDir) {
  const captions = gigs.map((gig, index) => {
    return `🎤 ${gig.name} @ ${gig.venue.name} - ${gig.start_time}`;
  });

  const captionFilePath = path.join(outputDir, 'captions.txt');
  fs.writeFileSync(captionFilePath, captions.join('\n\n'));
  console.log(`Captions saved to: ${captionFilePath}`);
}

// Main function
async function main() {
  const date = new Date().toISOString().split('T')[0]; // Today's date
  const outputDir = path.join(__dirname, 'output');

  try {
    // Fetch gig data
    const gigs = await fetchGigs(date);
    console.log(`Fetched ${gigs.length} gigs.`);

    // Generate images
    const images = await generateImages(gigs, outputDir);
    console.log(`Generated ${images.length} images.`);

    // Generate captions
    generateCaptions(gigs, outputDir);

    return images;
  } catch (error) {
    console.error('Error generating images:', error);
    throw error;
  }
}

// Run the script
main()
  .then((images) => {
    console.log('Image generation complete:', images);
  })
  .catch((error) => {
    console.error('Script failed:', error);
  });