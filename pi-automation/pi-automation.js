import puppeteer from 'puppeteer';
import { appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from '@octokit/rest';
import process from 'process';
import dotenv from 'dotenv';
import { LOCATIONS } from '../src/constants/locations.js';

// Load environment variables from .env file
dotenv.config();

// Check if running in local test mode
const IS_LOCAL_TEST = process.env.LOCAL_TEST === 'true';

// Log local test mode if active
if (IS_LOCAL_TEST) {
    console.log('Running in LOCAL TEST MODE');
}

// Check for required environment variables
const REQUIRED_ENV_VARS = {
    'GITHUB_TOKEN': 'GitHub token for repo operations'
};

// Log any missing environment variables
const missingVars = [];
for (const [varName, description] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!process.env[varName] || process.env[varName] === `your_${varName.toLowerCase()}_here`) {
        missingVars.push(`${varName}: ${description}`);
    }
}

// Configuration
const __dirname = dirname(fileURLToPath(import.meta.url));
const GITHUB_PAGES_URL = 'https://instabear.lml.live/';
const LOG_FILE = join(__dirname, 'automation.log');
const ENV_STATUS_FILE = join(__dirname, 'env-status.json');

// Log environment status
if (missingVars.length > 0) {
    const envStatus = {
        timestamp: new Date().toISOString(),
        missing: missingVars,
        warning: 'Some environment variables are missing or using default values'
    };
    try {
        appendFileSync(ENV_STATUS_FILE, JSON.stringify(envStatus) + '\n');
    } catch {
        // Continue even if writing status file fails
    }
}

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

// page.waitForTimeout() was removed in recent Puppeteer versions
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function postLocationCarousel(page, location) {
    log(`Processing ${location.displayName} carousel...`);
    await page.waitForSelector(`#generate-images-btn-${location.slug}`, { timeout: 120000 });

    log(`Clicking generate button for ${location.displayName}`);
    await page.click(`#generate-images-btn-${location.slug}`);

    const generateScreenshot = IS_LOCAL_TEST
        ? `./${location.slug}-generate-click.png`
        : `${location.slug}-generate-click.png`;
    await page.screenshot({ path: generateScreenshot });
    log(`Took screenshot after clicking generate button for ${location.displayName}: ${generateScreenshot}`);

    log(`Waiting 90 seconds after ${location.displayName} generate click...`);
    await delay(90000);

    log(`Waiting for post button to appear for ${location.displayName}`);
    await page.waitForSelector(`#post-instagram-btn-${location.slug}`, { timeout: 120000 });

    log(`Clicking post button for ${location.displayName}`);
    await page.click(`#post-instagram-btn-${location.slug}`);

    const postScreenshot = IS_LOCAL_TEST
        ? `./${location.slug}-post-click.png`
        : `${location.slug}-post-click.png`;
    await page.screenshot({ path: postScreenshot });
    log(`Took screenshot after clicking post button for ${location.displayName}: ${postScreenshot}`);

    log(`Waiting 90 seconds after ${location.displayName} post click...`);
    await delay(90000);
}

async function checkCarouselSuccess(page, titleText) {
    return page.evaluate((searchText) => {
        const headings = Array.from(document.querySelectorAll('h2'));
        const heading = headings.find((h) => h.textContent.includes(searchText));
        if (!heading) return false;

        let section = heading.parentElement;
        while (section && !section.classList.contains('mb-16')) {
            section = section.parentElement;
        }
        if (!section) return false;

        const statusDiv = section.querySelector('div.text-sm.text-gray-600');
        return statusDiv && statusDiv.textContent.includes('Successfully posted to Instagram');
    }, titleText);
}

async function automate() {
    let browser = null;

    try {
        log('Starting automation process');

        // Launch browser - different configuration for local test vs Pi
        if (IS_LOCAL_TEST) {
            log('Launching browser in local test mode');
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                protocolTimeout: 180000  // 3 minutes instead of default 30 seconds
            });
        } else {
            // Pi-specific configuration
            browser = await puppeteer.launch({
                headless: 'new',
                executablePath: '/usr/bin/chromium-browser', // Raspberry Pi Chromium path
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                protocolTimeout: 180000  // 3 minutes instead of default 30 seconds
            });
        }

        const page = await browser.newPage();
        
        // Listen for console events and log them
        page.on('console', msg => {
            log(`Browser console [${msg.type()}]: ${msg.text()}`);
        });
        
        // Set viewport
        await page.setViewport({ width: 1280, height: 800 });

        // Navigate to the GitHub Pages URL with cache-busting parameter
        const timestamp = new Date().getTime();
        log('Navigating to GitHub Pages');
        await page.goto(`${GITHUB_PAGES_URL}?nocache=${timestamp}`, {
            waitUntil: 'networkidle0',
            timeout: 120000 // 120 seconds (2 minutes) timeout for page load
        });

        // Take a screenshot for debugging
        const screenshotPath = IS_LOCAL_TEST ? './page-loaded.png' : 'page-loaded.png';
        await page.screenshot({ path: screenshotPath });
        log(`Took screenshot of loaded page: ${screenshotPath}`);

        // Wait for any necessary elements and perform actions
        log('Waiting for page to be ready');

        // Process each location's carousel in turn
        for (const location of LOCATIONS) {
            await postLocationCarousel(page, location);
        }

        // Wait for posting to complete - increased to 10 minutes
        log('Waiting for posting to complete (10 minutes)...');
        await delay(600000);
        
        // Take a final screenshot after waiting
        const finalScreenshot = IS_LOCAL_TEST ? './after-waiting.png' : 'after-waiting.png';
        await page.screenshot({ path: finalScreenshot });
        log(`Took final screenshot after waiting: ${finalScreenshot}`);

        // Check for success messages for all carousels
        log('Checking for success messages...');

        const results = [];
        for (const location of LOCATIONS) {
            const success = await checkCarouselSuccess(page, `${location.displayName} Gigs`);
            results.push({ location, success });
            if (success) {
                log(`${location.displayName} carousel was successfully posted to Instagram`);
            } else {
                log(`${location.displayName} carousel posting failed or status not found`, true);
            }
        }

        const anySuccess = results.some((r) => r.success);
        const allSuccess = results.every((r) => r.success);

        if (IS_LOCAL_TEST) {
            // For local testing, count as success if any carousel posted successfully
            if (!anySuccess) {
                throw new Error('Instagram posting was not successful - no carousels posted');
            }
        } else {
            // In production mode on the Pi, require all to succeed
            if (!allSuccess) {
                throw new Error('Instagram posting was not fully successful');
            }
        }

        // Clean up temp-images directory in GitHub repo
        log('Cleaning up temp-images directory...');
        try {
            // We'll use the GitHub API directly from Node.js context
            if (process.env.GITHUB_TOKEN) {
                const octokit = new Octokit({
                    auth: process.env.GITHUB_TOKEN
                });
                
                // Get all files in temp-images directory
                const { data } = await octokit.rest.repos.getContent({
                    owner: 'livemusiclocator',
                    repo: 'instabear',
                    path: 'temp-images',
                    ref: 'main'
                });
                
                // Delete all files except README.md
                for (const file of data) {
                    if (file.name !== 'README.md' && file.name.startsWith('gigs_')) {
                        await octokit.rest.repos.deleteFile({
                            owner: 'livemusiclocator',
                            repo: 'instabear',
                            path: `temp-images/${file.name}`,
                            message: 'Clean up temp images after successful posting',
                            sha: file.sha,
                            branch: 'main'
                        });
                        log(`Deleted ${file.name}`);
                    }
                }
                log('Temp-images directory cleaned up successfully');
            } else {
                log('Warning: GITHUB_TOKEN not set, skipping temp-images cleanup');
            }
        } catch (cleanupError) {
            log(`Warning: Failed to clean up temp-images directory: ${cleanupError.message}`, true);
            // Continue execution even if cleanup fails
        }

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
