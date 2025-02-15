/* global process */
import puppeteer from 'puppeteer-core';

async function generateImages() {
  console.log('Starting image generation process...');
  
  let browser;
  let page;
  
  try {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    console.log('Using Chrome executable:', executablePath);
    
    const launchOptions = {
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--font-render-hinting=none',
        '--disable-web-security',
        '--allow-insecure-localhost',
        '--disable-features=IsolateOrigins,site-per-process',
        '--force-color-profile=srgb',
        '--force-device-scale-factor=1.9',
        '--disable-gpu-vsync',
        '--run-all-compositor-stages-before-draw',
        '--disable-accelerated-2d-canvas',
        '--disable-canvas-aa',
        '--disable-2d-canvas-clip-aa',
        '--disable-gl-drawing-for-tests',
        '--deterministic-mode'
      ]
    };
    console.log('Launch options:', JSON.stringify(launchOptions, null, 2));
    
    browser = await puppeteer.launch(launchOptions);
    console.log('Browser launched successfully');
    page = await browser.newPage();
    
    // Enable verbose logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', err => console.error('Browser error:', err));
    page.on('requestfailed', request => {
      console.error('Request failed:', {
        url: request.url(),
        errorText: request.failure().errorText,
        method: request.method()
      });
    });
    page.on('response', response => {
      const status = response.status();
      if (status >= 400) {
        console.error('Response error:', {
          url: response.url(),
          status,
          statusText: response.statusText()
        });
      }
    });
    
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
      let frame = 0;
      window.requestAnimationFrame = (cb) => setTimeout(() => cb(++frame), 16);
      Object.defineProperty(window, 'devicePixelRatio', {
        get: () => 1.9
      });
    });

    console.log('Navigating to local server...');
    await page.goto('http://localhost:4173', { // Changed from 5173 to 4173 for production
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    console.log('Page loaded');

    // Debug page content and environment variables
    const content = await page.content();
    console.log('Page HTML length:', content.length);
    console.log('First 500 chars of HTML:', content.substring(0, 500));
    
    // Check environment variables in browser
    const envVars = await page.evaluate(() => {
      console.log('Window __ENV__:', window.__ENV__);
      const vars = {
        VITE_GITHUB_TOKEN: !!window.__ENV__?.VITE_GITHUB_TOKEN,
        VITE_INSTAGRAM_ACCESS_TOKEN: !!window.__ENV__?.VITE_INSTAGRAM_ACCESS_TOKEN,
        VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID: !!window.__ENV__?.VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID,
        VITE_SLACK_WEBHOOK_URL: !!window.__ENV__?.VITE_SLACK_WEBHOOK_URL,
        VITE_INSTAGRAM_USERNAME: !!window.__ENV__?.VITE_INSTAGRAM_USERNAME
      };
      console.log('Environment variables in browser:', vars);
      return vars;
    });
    console.log('Environment variables check:', envVars);

    // Debug screenshot
    await page.screenshot({
      path: 'debug-screenshot.png',
      fullPage: true
    });
    console.log('Debug screenshot saved');

    // Check if root element exists
    const rootExists = await page.evaluate(() => {
      const root = document.getElementById('root');
      console.log('Root element:', root ? 'Found' : 'Not found');
      console.log('Root HTML:', root ? root.innerHTML : 'N/A');
      return !!root;
    });
    console.log('Root element exists:', rootExists);

    // Wait for React to hydrate and render
    console.log('Waiting for React to mount...');
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      const hasChildren = root && root.children.length > 0;
      console.log('Root children count:', root?.children?.length || 0);
      return hasChildren;
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
    // Take error screenshot if possible
    try {
      await page.screenshot({
        path: 'error-screenshot.png',
        fullPage: true
      });
      console.log('Error screenshot saved');
    } catch (screenshotError) {
      console.error('Failed to take error screenshot:', screenshotError);
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
