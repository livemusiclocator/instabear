/* global process */
import puppeteer from 'puppeteer-core';

async function generateImages() {
  console.log('Starting image generation process...');
  
  let browser;
  let page;
  
  try {
    // Ensure we're using the virtual display
    process.env.DISPLAY = ':99';
    
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
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
    await page.goto('http://localhost:4173', {
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
    const generateButton = await page.$('button:has-text("Generate Images")');
    if (!generateButton) {
      throw new Error('Generate Images button not found');
    }
    await generateButton.click();

    // Wait for completion
    await page.waitForFunction(
      () => document.querySelector('.text-sm.text-gray-600')?.textContent?.includes('Images ready'),
      { timeout: 60000 }
    );

    console.log('Images generated successfully');

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
