import puppeteer from 'puppeteer';
import { appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Configuration
const __dirname = dirname(fileURLToPath(import.meta.url));
const GITHUB_PAGES_URL = 'https://lml.live/instabear/';
const LOG_FILE = join(__dirname, 'automation.log');

// Helper function to log messages with timestamps
function log(message, isError = false) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    appendFileSync(LOG_FILE, logMessage);
    if (isError) {
        console.error(logMessage);
    } else {
        console.log(logMessage);
    }
}

async function automate() {
    let browser = null;
    try {
        log('Starting automation process');

        // Launch browser
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '/usr/bin/chromium-browser', // Raspberry Pi Chromium path
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1280, height: 800 });

        // Navigate to the GitHub Pages URL with cache-busting parameter
        const timestamp = new Date().getTime();
        log('Navigating to GitHub Pages');
        await page.goto(`${GITHUB_PAGES_URL}?nocache=${timestamp}`, { 
            waitUntil: 'networkidle0',
            timeout: 60000 // 60 seconds timeout for page load
        });
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'page-loaded.png' });
        log('Took screenshot of loaded page');

        // Wait for any necessary elements and perform actions
        log('Waiting for page to be ready');
        await page.waitForSelector('#generate-images-btn', { timeout: 60000 });
        
        // Click generate button
        log('Clicking generate button');
        await page.click('#generate-images-btn');
        
        // Wait for generation to complete and post button to appear
        log('Waiting for post button to appear');
        await page.waitForSelector('#post-instagram-btn', { timeout: 60000 });
        
        // Click post button
        log('Clicking post button');
        await page.click('#post-instagram-btn');
        
        // Take a screenshot after clicking post button
        await page.screenshot({ path: 'after-post-click.png' });
        log('Took screenshot after clicking post button');
        
        // Wait for posting to complete
        await page.waitForTimeout(10000); // Adjust timing as needed

        log('Automation completed successfully');

    } catch (error) {
        log(`Error during automation: ${error.message}`, true);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            log('Browser closed');
        }
    }
}

// Run the automation
automate().catch(error => {
    log(`Fatal error: ${error.message}`, true);
    globalThis.process.exit(1);
});
