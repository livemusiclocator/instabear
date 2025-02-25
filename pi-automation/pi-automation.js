import puppeteer from 'puppeteer';
import { appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Configuration
const __dirname = dirname(fileURLToPath(import.meta.url));
const GITHUB_PAGES_URL = 'https://nickthorpe1.github.io/MANGROVES_2023/insta/'; // Replace with your actual GitHub Pages URL
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

        // Navigate to the GitHub Pages URL
        log('Navigating to GitHub Pages');
        await page.goto(GITHUB_PAGES_URL, { waitUntil: 'networkidle0' });

        // Wait for any necessary elements and perform actions
        // Note: You'll need to update these selectors based on your actual page structure
        log('Waiting for page to be ready');
        await page.waitForSelector('#generate-button', { timeout: 30000 });
        
        // Click generate button
        log('Clicking generate button');
        await page.click('#generate-button');
        
        // Wait for generation to complete
        await page.waitForTimeout(5000); // Adjust timing as needed
        
        // Click post button
        log('Clicking post button');
        await page.click('#post-button');
        
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
