/* global process */
import puppeteer from 'puppeteer-core';

async function generateImages() {
  console.log('Starting image generation process...');
  
  let browser;
  let page;
  
  try {
    // Find Chrome executable on macOS
    const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    console.log('Using Chrome executable:', executablePath);
    
    const launchOptions = {
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--force-device-scale-factor=1.9'
      ]
    };
    console.log('Launch options:', JSON.stringify(launchOptions, null, 2));
    
    browser = await puppeteer.launch(launchOptions);
    console.log('Browser launched successfully');
    page = await browser.newPage();
    
    // Enable verbose logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', err => console.error('Browser error:', err));
    
    // Set viewport
    await page.setViewport({
      width: 540,
      height: 540,
      deviceScaleFactor: 1.9
    });
    
    // Force consistent rendering
    await page.evaluateOnNewDocument(() => {
      Date.now = () => new Date('2025-02-13T00:00:00.000Z').getTime();
      Math.random = () => 0.5;
    });

    console.log('Navigating to local server...');
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    console.log('Page loaded');

    // Debug screenshot
    await page.screenshot({
      path: 'debug-screenshot.png',
      fullPage: true
    });
    console.log('Debug screenshot saved');

    // Wait for React to hydrate
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    }, { timeout: 30000 });
    console.log('React app mounted');

    // Wait for title slide
    await page.waitForSelector('.title-slide', { 
      timeout: 60000,
      visible: true 
    });
    console.log('Title slide found');
    
    // Click Generate Images button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const button = buttons.find(b => b.textContent.includes('Generate Images'));
      if (!button) {
        throw new Error('Generate Images button not found');
      }
      button.click();
    });

    // Wait for all images to be uploaded
    await page.waitForFunction(
      () => {
        const uploadStatus = document.querySelector('.text-sm.text-gray-600')?.textContent;
        return uploadStatus && (
          uploadStatus.includes('Images ready for Instagram posting') ||
          uploadStatus.includes('Generating and uploading images...')
        );
      },
      { timeout: 60000 }
    );

    // Give a moment for any final uploads to complete
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Images generated and uploaded successfully');

  } catch (error) {
    console.error('Error generating images:', error);
    if (page) {
      try {
        await page.screenshot({
          path: 'error-screenshot.png',
          fullPage: true
        });
        console.log('Error screenshot saved');
      } catch (screenshotError) {
        console.error('Failed to take error screenshot:', screenshotError);
      }
    }
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}

generateImages();
