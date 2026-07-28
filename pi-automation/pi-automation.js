import puppeteer from 'puppeteer';
import { appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from '@octokit/rest';
import process from 'process';
import dotenv from 'dotenv';

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
        
        // Process St Kilda carousel
        log('Processing St Kilda carousel...');
        await page.waitForSelector('#generate-images-btn-stkilda', { timeout: 120000 });
        
        // Click generate button for St Kilda
        log('Clicking generate button for St Kilda');
        await page.click('#generate-images-btn-stkilda');
        
        // Take a screenshot after clicking generate button for St Kilda
        const stKildaScreenshot = IS_LOCAL_TEST ? './stkilda-generate-click.png' : 'stkilda-generate-click.png';
        await page.screenshot({ path: stKildaScreenshot });
        log(`Took screenshot after clicking generate button for St Kilda: ${stKildaScreenshot}`);
        
        // Wait for 90 seconds (increased from 45 seconds)
        log('Waiting 90 seconds after St Kilda generate click...');
        await delay(90000);
        
        // Wait for post button to appear for St Kilda
        log('Waiting for post button to appear for St Kilda');
        await page.waitForSelector('#post-instagram-btn-stkilda', { timeout: 120000 });
        
        // Click post button for St Kilda
        log('Clicking post button for St Kilda');
        await page.click('#post-instagram-btn-stkilda');
        
        // Take a screenshot after clicking post button for St Kilda
        const stKildaPostScreenshot = IS_LOCAL_TEST ? './stkilda-post-click.png' : 'stkilda-post-click.png';
        await page.screenshot({ path: stKildaPostScreenshot });
        log(`Took screenshot after clicking post button for St Kilda: ${stKildaPostScreenshot}`);
        
        // Wait for 90 seconds (increased from 45 seconds)
        log('Waiting 90 seconds after St Kilda post click...');
        await delay(90000);
        
        // Process Fitzroy carousel
        log('Processing Fitzroy carousel...');
        await page.waitForSelector('#generate-images-btn-fitzroy', { timeout: 120000 });
        
        // Click generate button for Fitzroy
        log('Clicking generate button for Fitzroy');
        await page.click('#generate-images-btn-fitzroy');
        
        // Take a screenshot after clicking generate button for Fitzroy
        const fitzroyScreenshot = IS_LOCAL_TEST ? './fitzroy-generate-click.png' : 'fitzroy-generate-click.png';
        await page.screenshot({ path: fitzroyScreenshot });
        log(`Took screenshot after clicking generate button for Fitzroy: ${fitzroyScreenshot}`);
        
        // Wait for 90 seconds (increased from 45 seconds)
        log('Waiting 90 seconds after Fitzroy generate click...');
        await delay(90000);
        
        // Wait for post button to appear for Fitzroy
        log('Waiting for post button to appear for Fitzroy');
        await page.waitForSelector('#post-instagram-btn-fitzroy', { timeout: 120000 });
        
        // Click post button for Fitzroy
        log('Clicking post button for Fitzroy');
        await page.click('#post-instagram-btn-fitzroy');
        
        // Take a screenshot after clicking post button for Fitzroy
        const fitzroyPostScreenshot = IS_LOCAL_TEST ? './fitzroy-post-click.png' : 'fitzroy-post-click.png';
        await page.screenshot({ path: fitzroyPostScreenshot });
        log(`Took screenshot after clicking post button for Fitzroy: ${fitzroyPostScreenshot}`);
        
        // Wait for posting to complete - increased to 10 minutes
        log('Waiting for posting to complete (10 minutes)...');
        await delay(600000);
        
        // Take a final screenshot after waiting
        const finalScreenshot = IS_LOCAL_TEST ? './after-waiting.png' : 'after-waiting.png';
        await page.screenshot({ path: finalScreenshot });
        log(`Took final screenshot after waiting: ${finalScreenshot}`);

        // Check for success messages for both carousels
        log('Checking for success messages...');
        
        // Look for success message for St Kilda carousel using standard DOM methods
        const stKildaSuccess = await page.evaluate(() => {
            // Find all h2 elements on the page
            const headings = Array.from(document.querySelectorAll('h2'));
            
            // Find the one containing "St Kilda Gigs"
            const stKildaHeading = headings.find(h => h.textContent.includes('St Kilda Gigs'));
            if (!stKildaHeading) return false;
            
            // Get parent div (container)
            let stKildaSection = stKildaHeading.parentElement;
            // Sometimes need to go up another level to find the right container
            while (stKildaSection && !stKildaSection.classList.contains('mb-16')) {
                stKildaSection = stKildaSection.parentElement;
            }
            
            if (!stKildaSection) return false;
            
            // Find status div
            const statusDiv = stKildaSection.querySelector('div.text-sm.text-gray-600');
            return statusDiv && statusDiv.textContent.includes('Successfully posted to Instagram');
        });
        
        // Look for success message for Fitzroy carousel using standard DOM methods
        const fitzroySuccess = await page.evaluate(() => {
            // Find all h2 elements on the page
            const headings = Array.from(document.querySelectorAll('h2'));
            
            // Find the one containing "Fitzroy"
            const fitzroyHeading = headings.find(h => h.textContent.includes('Fitzroy'));
            if (!fitzroyHeading) return false;
            
            // Get parent div (container)
            let fitzroySection = fitzroyHeading.parentElement;
            // Sometimes need to go up another level to find the right container
            while (fitzroySection && !fitzroySection.classList.contains('mb-16')) {
                fitzroySection = fitzroySection.parentElement;
            }
            
            if (!fitzroySection) return false;
            
            // Find status div
            const statusDiv = fitzroySection.querySelector('div.text-sm.text-gray-600');
            return statusDiv && statusDiv.textContent.includes('Successfully posted to Instagram');
        });
        
        // In local test mode, be more forgiving about success
        if (IS_LOCAL_TEST) {
            // For local testing, count as success if any carousel posted successfully
            if (stKildaSuccess || fitzroySuccess) {
                if (stKildaSuccess && fitzroySuccess) {
                    log('Both carousels were successfully posted to Instagram');
                } else if (stKildaSuccess) {
                    log('St Kilda carousel posted successfully, but Fitzroy failed or status not found', true);
                } else {
                    log('Fitzroy carousel posted successfully, but St Kilda failed or status not found', true);
                }
            } else {
                if (!stKildaSuccess) log('St Kilda carousel posting failed or status not found', true);
                if (!fitzroySuccess) log('Fitzroy carousel posting failed or status not found', true);
                throw new Error('Instagram posting was not successful - no carousels posted');
            }
        } else {
            // In production mode on the Pi, require both to succeed
            if (stKildaSuccess && fitzroySuccess) {
                log('Both carousels were successfully posted to Instagram');
            } else {
                if (!stKildaSuccess) log('St Kilda carousel posting failed or status not found', true);
                if (!fitzroySuccess) log('Fitzroy carousel posting failed or status not found', true);
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
